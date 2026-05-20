"use client";

import Vapi from "@vapi-ai/web";

import {
  isTransientVapiError,
  logVapi,
} from "@/app/lib/vapiConfig";

/** How long to wait for Vapi/Daily `call-start` before failing the attempt. */
export const VAPI_CONNECT_TIMEOUT_MS = 45_000;

const GLOBAL_SINGLETON_KEY =
  "__infiniaVapiSessionManager__";

const TRANSIENT_RETRY_DELAY_MS = 900;

export type VapiSessionHandlers = {
  onCallStart: () => void;
  onMessage: (message: Record<string, unknown>) => void;
  onCallEnd: () => void;
  onError: (error: unknown) => void;
  onCallStartFailed: (event: unknown) => void;
};

function isHarmlessTeardownError(
  error: unknown
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  return (
    message.includes("WASM_OR_WORKER_NOT_READY") ||
    message.includes("Meeting has ended") ||
    message.toLowerCase().includes("krisp") ||
    message.toLowerCase().includes("no-room") ||
    message.toLowerCase().includes("meeting has ended")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Process-wide singleton for the Vapi Web SDK.
 * Stored on `globalThis` so Turbopack HMR does not spawn duplicate Daily rooms.
 */
export class VapiSessionManager {
  private static singleton: VapiSessionManager | null =
    null;

  static getInstance(): VapiSessionManager {
    if (typeof globalThis !== "undefined") {
      const globalRecord = globalThis as Record<
        string,
        unknown
      >;
      const existing = globalRecord[
        GLOBAL_SINGLETON_KEY
      ];

      if (existing instanceof VapiSessionManager) {
        return existing;
      }

      const created = new VapiSessionManager();
      globalRecord[GLOBAL_SINGLETON_KEY] = created;
      return created;
    }

    if (!VapiSessionManager.singleton) {
      VapiSessionManager.singleton =
        new VapiSessionManager();
    }

    return VapiSessionManager.singleton;
  }

  private client: Vapi | null = null;
  private publicKey: string | null = null;
  private mountCount = 0;
  private activeHandlers: VapiSessionHandlers | null =
    null;
  private connectTimeoutId: ReturnType<
    typeof setTimeout
  > | null = null;
  private stopPromise: Promise<void> | null = null;
  private startPromise: Promise<void> | null = null;
  private callGeneration = 0;
  private pageHideRegistered = false;

  private constructor() {
    this.registerPageHideOnce();
  }

  private registerPageHideOnce(): void {
    if (
      this.pageHideRegistered ||
      typeof window === "undefined"
    ) {
      return;
    }

    this.pageHideRegistered = true;

    window.addEventListener("pagehide", () => {
      void this.destroyClient("pagehide");
    });
  }

  mount(): void {
    this.mountCount += 1;
  }

  unmount(): void {
    this.mountCount = Math.max(0, this.mountCount - 1);
    this.clearConnectTimeout();
    this.detachHandlers();
  }

  getMountCount(): number {
    return this.mountCount;
  }

  isClientReady(): boolean {
    return this.client !== null;
  }

  getCallGeneration(): number {
    return this.callGeneration;
  }

  async ensureClient(publicKey: string): Promise<Vapi> {
    if (
      this.client &&
      this.publicKey === publicKey
    ) {
      return this.client;
    }

    if (this.client) {
      logVapi("info", "client-recreate", {
        reason: "public-key-changed",
      });
      await this.destroyClient("public-key-changed");
    }

    this.publicKey = publicKey;
    this.client = new Vapi(publicKey);

    logVapi("info", "client-created", {
      publicKeyPrefix: publicKey.slice(0, 8),
    });

    return this.client;
  }

  attachHandlers(handlers: VapiSessionHandlers): void {
    if (!this.client) {
      return;
    }

    this.detachHandlers();
    this.activeHandlers = handlers;

    this.client.on("call-start", handlers.onCallStart);
    this.client.on("message", handlers.onMessage);
    this.client.on("call-end", handlers.onCallEnd);
    this.client.on("error", handlers.onError);
    this.client.on(
      "call-start-failed",
      handlers.onCallStartFailed
    );
  }

  detachHandlers(): void {
    if (!this.client || !this.activeHandlers) {
      return;
    }

    const h = this.activeHandlers;
    this.client.removeListener(
      "call-start",
      h.onCallStart
    );
    this.client.removeListener("message", h.onMessage);
    this.client.removeListener("call-end", h.onCallEnd);
    this.client.removeListener("error", h.onError);
    this.client.removeListener(
      "call-start-failed",
      h.onCallStartFailed
    );
    this.activeHandlers = null;
  }

  beginConnectTimeout(onTimeout: () => void): void {
    this.clearConnectTimeout();
    this.connectTimeoutId = setTimeout(() => {
      this.connectTimeoutId = null;
      onTimeout();
    }, VAPI_CONNECT_TIMEOUT_MS);
  }

  clearConnectTimeout(): void {
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
  }

  async startCall(assistantId: string): Promise<void> {
    if (!this.client) {
      throw new Error(
        "Vapi client is not initialized."
      );
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.runStartCall(
      assistantId
    ).finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  private async runStartCall(
    assistantId: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error(
        "Vapi client is not initialized."
      );
    }

    await this.waitForStop();

    this.callGeneration += 1;
    const generation = this.callGeneration;

    logVapi("info", "start-call", {
      assistantId,
      generation,
    });

    try {
      await this.client.start(assistantId);
    } catch (firstError) {
      if (!isTransientVapiError(firstError)) {
        throw firstError;
      }

      logVapi("warn", "start-retry-transient", {
        generation,
        error: firstError,
      });

      await this.stopCall("transient-retry-preflight");
      await sleep(TRANSIENT_RETRY_DELAY_MS);
      await this.waitForStop();

      if (this.callGeneration !== generation) {
        throw new Error(
          "Call generation changed during retry."
        );
      }

      await this.client.start(assistantId);
    }

    logVapi("info", "start-call-invoked", {
      generation,
    });
  }

  async stopCall(reason: string): Promise<void> {
    if (!this.client) {
      return;
    }

    this.clearConnectTimeout();

    logVapi("info", "stop-call", { reason });

    if (this.stopPromise) {
      return this.stopPromise;
    }

    this.stopPromise = this.client
      .stop()
      .catch((err) => {
        if (!isHarmlessTeardownError(err)) {
          logVapi("warn", "stop-call-error", {
            reason,
            error: err,
          });
        }
      })
      .finally(() => {
        this.stopPromise = null;
      });

    return this.stopPromise;
  }

  private async waitForStop(): Promise<void> {
    if (this.stopPromise) {
      await this.stopPromise;
    }
  }

  async destroyClient(reason: string): Promise<void> {
    this.clearConnectTimeout();
    this.detachHandlers();

    if (!this.client) {
      return;
    }

    logVapi("info", "destroy-client", { reason });

    await this.stopCall(`destroy:${reason}`);

    try {
      this.client.removeAllListeners();
    } catch {
      /* ignore */
    }

    this.client = null;
    this.publicKey = null;
    this.callGeneration += 1;
  }
}
