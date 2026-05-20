import { cleanTranscript } from "@/app/lib/transcriptCleaner";
import { parseEvaluation } from "@/app/lib/evaluationParser";

import { buildEvaluationPrompt } from "./prompt";
import {
  formatGeminiError,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  generateEvaluation,
} from "./gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const body = (await req.json()) as { transcript?: string };
    const rawTranscript = body.transcript?.trim() ?? "";
    const cleanedTranscript = cleanTranscript(rawTranscript);

    console.log(`[evaluate:${requestId}]`, {
      rawLength: rawTranscript.length,
      cleanedLength: cleanedTranscript.length,
      model: GEMINI_MODEL,
    });

    if (!cleanedTranscript) {
      return Response.json(
        {
          ok: false,
          code: "EMPTY_TRANSCRIPT",
          evaluation: "No transcript found after processing.",
        },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      const { code, message, httpStatus } = formatGeminiError(
        new Error("MISSING_API_KEY")
      );
      return Response.json(
        { ok: false, code, error: message, evaluation: message },
        { status: httpStatus }
      );
    }

    const markdown = await generateEvaluation(
      buildEvaluationPrompt(cleanedTranscript)
    );

    const parsed = parseEvaluation(markdown);

    console.log(`[evaluate:${requestId}] success`, {
      length: markdown.length,
      overall: parsed.scores.overall,
    });

    return Response.json({
      ok: true,
      evaluation: markdown,
      parsed,
    });
  } catch (error) {
    const { code, message, httpStatus } = formatGeminiError(error);
    console.error(`[evaluate:${requestId}] ${code}:`, error);

    return Response.json(
      { ok: false, code, error: message, evaluation: message },
      { status: httpStatus }
    );
  }
}
