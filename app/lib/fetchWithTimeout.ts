export class FetchTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout<T = unknown>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<{ response: Response; data: T }> {
  const { timeoutMs = 90_000, ...init } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const data = (await response.json()) as T;
    return { response, data };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
