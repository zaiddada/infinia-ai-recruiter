import { cleanTranscript } from "@/app/lib/transcriptCleaner";
import { parseEvaluation } from "@/app/lib/evaluationParser";
import { validateTranscriptForEvaluation } from "@/app/lib/evaluationGuard";

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
    const body = (await req.json()) as {
      transcript?: string;
      meta?: {
        durationSeconds?: number;
        candidateWordCount?: number;
        candidateTurns?: number;
        candidateWordShare?: number;
        lineCount?: number;
      };
    };
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

    const validation = validateTranscriptForEvaluation(
      cleanedTranscript,
      body.meta
    );

    if (validation.status === "insufficient_data") {
      const parsed = {
        status: "insufficient_data" as const,
        confidence: validation.confidence,
        transcriptSufficiency: "low" as const,
        evidenceCoverage: validation.evidenceCoverage,
        uncertaintyIndicators: validation.uncertaintyIndicators,
        message: validation.message,
        recommendedAction: validation.recommendedAction,
        observedFacts: validation.observedFacts,
        overview: "Insufficient interview signal for a reliable recruiter evaluation.",
        scores: {},
        keyObservations: [],
        growthPotential: "",
        cultureFit: "",
        hiringRecommendation: "",
        recruiterSummary: "",
        coachingSuggestions: [],
        rawMarkdown: "",
      };

      return Response.json({
        ok: true,
        evaluation: JSON.stringify(parsed, null, 2),
        parsed,
      });
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
      buildEvaluationPrompt(cleanedTranscript, {
        evidenceCoverage: validation.evidenceCoverage,
        uncertaintyIndicators: validation.uncertaintyIndicators,
        observedFacts: validation.observedFacts,
      })
    );

    const parsed = parseEvaluation(markdown);
    parsed.status = "sufficient_data";
    parsed.evidenceCoverage =
      parsed.evidenceCoverage ??
      validation.evidenceCoverage;
    parsed.transcriptSufficiency =
      parsed.transcriptSufficiency ??
      (validation.confidence === "high"
        ? "high"
        : validation.confidence === "medium"
          ? "medium"
          : "low");
    parsed.confidence =
      parsed.confidence ?? validation.confidence;
    parsed.uncertaintyIndicators =
      parsed.uncertaintyIndicators?.length
        ? parsed.uncertaintyIndicators
        : validation.uncertaintyIndicators;
    parsed.observedFacts =
      parsed.observedFacts?.length
        ? parsed.observedFacts
        : validation.observedFacts;

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
