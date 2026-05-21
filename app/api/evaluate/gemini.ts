import { GoogleGenerativeAI } from "@google/generative-ai";

import { GEMINI_TIMEOUT_MS } from "@/app/lib/constants";

export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY?.trim();

export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  "gemini-2.5-flash";

export function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("MISSING_API_KEY");
  }

  return new GoogleGenerativeAI(
    GEMINI_API_KEY
  );
}

export function formatGeminiError(
  error: unknown
): {
  code: string;
  message: string;
  httpStatus: number;
} {
  const err = error as {
    message?: string;
    status?: number;
  };

  const message =
    err?.message ??
    String(error);

  const httpStatus =
    err?.status ?? 500;

  if (
    message.includes(
      "MISSING_API_KEY"
    )
  ) {
    return {
      code: "MISSING_API_KEY",
      message:
        "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server.",
      httpStatus: 500,
    };
  }

  if (
    message.includes(
      "API key not valid"
    ) ||
    message.includes(
      "API_KEY_INVALID"
    )
  ) {
    return {
      code: "INVALID_API_KEY",
      message:
        "Gemini rejected the API key. Create a fresh API key in Google AI Studio and update .env.local.",
      httpStatus: 401,
    };
  }

  if (
    message.includes("404") ||
    message
      .toLowerCase()
      .includes("not found")
  ) {
    return {
      code: "MODEL_NOT_FOUND",
      message: `Gemini model "${GEMINI_MODEL}" was not found.`,
      httpStatus: 400,
    };
  }

  if (
    message.includes("429") ||
    message.includes(
      "RESOURCE_EXHAUSTED"
    )
  ) {
    return {
      code: "RATE_LIMITED",
      message:
        "Gemini rate limit exceeded. Retry shortly.",
      httpStatus: 429,
    };
  }

  if (
    message
      .toLowerCase()
      .includes("timeout")
  ) {
    return {
      code: "TIMEOUT",
      message:
        "Gemini evaluation timed out.",
      httpStatus: 504,
    };
  }

  if (
    message
      .toLowerCase()
      .includes("json")
  ) {
    return {
      code: "INVALID_JSON",
      message:
        "Gemini returned malformed JSON.",
      httpStatus: 502,
    };
  }

  return {
    code: "GEMINI_ERROR",
    message:
      "Gemini evaluation failed.",
    httpStatus:
      httpStatus >= 400 &&
      httpStatus < 600
        ? httpStatus
        : 502,
  };
}

function sanitizeJsonResponse(
  raw: string
): string {
  return raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

async function executeGeneration(
  prompt: string
): Promise<string> {
  const genAI = getGenAI();

  const model =
    genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

  const result =
    await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],

      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 20,
        candidateCount: 1,
        maxOutputTokens: 4096,

        responseMimeType:
          "application/json",
      },
    });

  const text =
    result.response.text();

  if (
    !text ||
    !text.trim()
  ) {
    throw new Error(
      "EMPTY_GEMINI_RESPONSE"
    );
  }

  return sanitizeJsonResponse(
    text
  );
}

export async function generateEvaluation(
  prompt: string
): Promise<string> {
  const timeout =
    new Promise<never>(
      (_, reject) => {
        const timer =
          setTimeout(() => {
            clearTimeout(timer);

            reject(
              new Error(
                "GEMINI_REQUEST_TIMEOUT"
              )
            );
          }, GEMINI_TIMEOUT_MS);
      }
    );

  try {
    const response =
      await Promise.race([
        executeGeneration(prompt),
        timeout,
      ]);

    try {
      JSON.parse(response);

      return response;
    } catch {
      console.warn(
        "[gemini] malformed JSON detected, retrying once"
      );

      const repairedPrompt = `
Return STRICT VALID JSON ONLY.

DO NOT:
- use markdown
- use code fences
- add comments
- explain anything

Previous malformed output:

${response}
`;

      const repaired =
        await executeGeneration(
          repairedPrompt
        );

      JSON.parse(repaired);

      return repaired;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "GEMINI_REQUEST_TIMEOUT"
    ) {
      throw new Error(
        "timeout"
      );
    }

    throw error;
  }
}