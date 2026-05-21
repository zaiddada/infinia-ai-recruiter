const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VapiEnv = {
  publicKey: string;
  assistantId: string;
};

export type VapiConfigValidation = VapiEnv & {
  ok: boolean;
  errors: string[];
};

export function getVapiEnv(): VapiEnv {
  return {
    publicKey: (
      process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? ""
    ).trim(),
    assistantId: (
      process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? ""
    ).trim(),
  };
}

export function validateVapiConfig(): VapiConfigValidation {
  const env = getVapiEnv();
  const errors: string[] = [];

  if (!env.publicKey) {
    errors.push(
      "NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing. Add it to .env.local and restart the dev server."
    );
  } else if (!UUID_PATTERN.test(env.publicKey)) {
    errors.push(
      "NEXT_PUBLIC_VAPI_PUBLIC_KEY does not look like a valid Vapi public key (UUID)."
    );
  }

  if (!env.assistantId) {
    errors.push(
      "NEXT_PUBLIC_VAPI_ASSISTANT_ID is missing. Add your published assistant ID to .env.local and restart the dev server."
    );
  } else if (!UUID_PATTERN.test(env.assistantId)) {
    errors.push(
      "NEXT_PUBLIC_VAPI_ASSISTANT_ID does not look like a valid assistant ID (UUID)."
    );
  }

  if (
    env.publicKey &&
    env.assistantId &&
    env.publicKey === env.assistantId
  ) {
    errors.push(
      "NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID must be different values."
    );
  }

  return {
    ...env,
    ok: errors.length === 0,
    errors,
  };
}

export function formatVapiError(
  error: unknown
): string {
  if (error instanceof Error) {
    const msg = error.message.trim();

    if (
      msg === "Load failed" ||
      (error.name === "TypeError" &&
        msg.toLowerCase().includes("load"))
    ) {
      const host =
        typeof window !== "undefined"
          ? window.location.hostname
          : "";

      const hostHint =
        host === "127.0.0.1"
          ? " Open the app at http://localhost:3000 (not 127.0.0.1) so Vapi CORS allows the request."
          : "";

      return (
        `Could not reach Vapi (network/CORS error). Verify NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env.local, use a valid published assistant, restart \`npm run dev\`, and open http://localhost:3000.${hostHint}`
      );
    }

    if (
      msg.includes("Assistant or Squad or Workflow must be provided")
    ) {
      return (
        "Assistant ID is missing. Set NEXT_PUBLIC_VAPI_ASSISTANT_ID in .env.local and restart the dev server."
      );
    }

    if (
      msg.includes("401") ||
      msg.toLowerCase().includes("unauthorized")
    ) {
      return (
        "Vapi rejected the public key. Copy the Public Key (not the private key) from the Vapi dashboard into NEXT_PUBLIC_VAPI_PUBLIC_KEY."
      );
    }

    if (
      msg.includes("404") ||
      msg.toLowerCase().includes("not found")
    ) {
      return (
        "Assistant not found. Confirm NEXT_PUBLIC_VAPI_ASSISTANT_ID matches a published assistant in your Vapi account."
      );
    }

    if (
      msg.toLowerCase().includes("no-room") ||
      msg.toLowerCase().includes("connection-error") ||
      msg.toLowerCase().includes("websocket") ||
      msg.toLowerCase().includes("start-method-error") ||
      msg.toLowerCase().includes("failed to load call object")
    ) {
      return (
        "Daily.co could not join the Vapi room (network or room lifecycle issue). Wait a few seconds, refresh the page, and start again. Avoid opening multiple tabs."
      );
    }

    return msg || "Unknown Vapi error.";
  }

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const record = error as Record<
      string,
      unknown
    >;
    const nested =
      record.error ??
      record.message ??
      record.errorMsg;

    if (typeof nested === "string") {
      return formatVapiError(
        new Error(nested)
      );
    }

    if (
      nested &&
      typeof nested === "object"
    ) {
      return formatVapiError(nested);
    }
  }

  return String(error ?? "Unknown Vapi error.");
}

/** Errors that may succeed on a single guarded retry after stop + brief delay. */
export function isTransientVapiError(
  error: unknown
): boolean {
  const msg = formatVapiError(error).toLowerCase();

  return (
    msg.includes("load failed") ||
    msg.includes("connection-error") ||
    msg.includes("websocket") ||
    msg.includes("failed to load call object") ||
    msg.includes("wasm_or_worker_not_ready") ||
    msg.includes("start-method-error")
  );
}

/** Daily/Vapi owns mic capture during join — preflight is opt-in only. */
export function logVapi(
  level: "info" | "warn" | "error",
  event: string,
  details?: Record<string, unknown>
): void {
  const payload = {
    scope: "vapi",
    event,
    ...details,
  };

  const logFn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.info;

  if (
    level === "info" &&
    process.env.NODE_ENV !== "development"
  ) {
    return;
  }

  logFn("[Vapi]", JSON.stringify(payload, null, 2));
}
export async function requestMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    stream.getTracks().forEach((track) => track.stop());

    return true;
  } catch (error) {
    console.error("[Vapi] microphone permission failed", error);
    return false;
  }
}