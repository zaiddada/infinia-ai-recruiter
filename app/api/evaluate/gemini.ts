import { GoogleGenerativeAI } from "@google/generative-ai";

import { GEMINI_TIMEOUT_MS } from "@/app/lib/constants";

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

export function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

export function formatGeminiError(error: unknown): {
  code: string;
  message: string;
  httpStatus: number;
} {
  const err = error as { message?: string; status?: number };
  const message = err.message ?? String(error);
  const httpStatus = err.status ?? 500;

  if (message.includes("MISSING_API_KEY")) {
    return {
      code: "MISSING_API_KEY",
      message:
        "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      httpStatus: 500,
    };
  }

  if (
    message.includes("API key not valid") ||
    message.includes("API_KEY_INVALID")
  ) {
    return {
      code: "INVALID_API_KEY",
      message:
        "Gemini rejected the API key. Create a new key in Google AI Studio and update .env.local.",
      httpStatus: 401,
    };
  }

  if (message.includes("404") || message.includes("not found")) {
    return {
      code: "MODEL_NOT_FOUND",
      message: `Model "${GEMINI_MODEL}" is unavailable. Set GEMINI_MODEL (e.g. gemini-2.5-flash).`,
      httpStatus: 400,
    };
  }

  if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
    return {
      code: "RATE_LIMITED",
      message: "Gemini rate limit exceeded. Please retry shortly.",
      httpStatus: 429,
    };
  }

  if (/timeout/i.test(message)) {
    return {
      code: "TIMEOUT",
      message: "Evaluation timed out. Please try again.",
      httpStatus: 504,
    };
  }

  return {
    code: "GEMINI_ERROR",
    message: "Gemini API request failed.",
    httpStatus: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502,
  };
}

export async function generateEvaluation(
  prompt: string
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const generate = model.generateContent(prompt);

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("GEMINI_REQUEST_TIMEOUT")),
      GEMINI_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([generate, timeout]);
    return result.response.text();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GEMINI_REQUEST_TIMEOUT"
    ) {
      throw new Error("timeout");
    }
    throw error;
  }
}
