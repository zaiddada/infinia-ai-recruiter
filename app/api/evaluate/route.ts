import { z } from "zod";

import { cleanTranscript } from "@/app/lib/transcriptCleaner";
import { parseEvaluation } from "@/app/lib/evaluationParser";
import { validateTranscriptForEvaluation } from "@/app/lib/evaluationGuard";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from "@/lib/supabase/admin";

import { buildEvaluationPrompt } from "./prompt";

import {
  formatGeminiError,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  generateEvaluation,
} from "./gemini";

export const runtime = "nodejs";

const RequestSchema = z.object({
  transcript: z.string().min(1),
  meta: z
    .object({
      durationSeconds: z.number().optional(),
      candidateWordCount: z.number().optional(),
      candidateTurns: z.number().optional(),
      candidateWordShare: z.number().optional(),
      lineCount: z.number().optional(),
    })
    .optional(),
});

const RecommendationSchema = z.enum([
  "Strong Hire",
  "Hire",
  "Maybe",
  "Weak Maybe",
  "Reject",
  "Hold / Human Review",
]);

function safeJsonParse(
  value: string
): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeArray(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function normalizeText(
  value: unknown,
  fallback = ""
): string {
  if (
    typeof value !== "string"
  ) {
    return fallback;
  }

  return value.trim();
}

function clamp(
  value: number,
  min = 0,
  max = 100
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function calculateDeterministicScore(
  parsed: any,
  validation: ReturnType<
    typeof validateTranscriptForEvaluation
  >
) {
  const communication =
    Number(
      parsed?.scores
        ?.communication ?? 0
    );

  const technical =
    Number(
      parsed?.scores?.technical ??
        0
    );

  const behavioral =
    Number(
      parsed?.scores
        ?.behavioral ?? 0
    );

  const confidence =
    validation.confidence ===
    "high"
      ? 90
      : validation.confidence ===
          "medium"
        ? 70
        : 45;

  const weighted =
    communication * 0.3 +
    technical * 0.35 +
    behavioral * 0.2 +
    confidence * 0.15;

  const overall =
    clamp(Math.round(weighted));

  let recommendation:
    | "Strong Hire"
    | "Hire"
    | "Maybe"
    | "Weak Maybe"
    | "Reject";

  if (overall >= 90) {
    recommendation =
      "Strong Hire";
  } else if (overall >= 75) {
    recommendation = "Hire";
  } else if (overall >= 60) {
    recommendation = "Maybe";
  } else if (overall >= 45) {
    recommendation =
      "Weak Maybe";
  } else {
    recommendation = "Reject";
  }

  return {
    overall,
    recommendation,
  };
}

function extractEvidenceCoverage(
  transcript: string,
  parsed: any
) {
  const evidence =
    normalizeArray(
      parsed?.observedFacts
    );

  let matched = 0;

  for (const fact of evidence) {
    if (
      transcript
        .toLowerCase()
        .includes(
          fact.toLowerCase()
        )
    ) {
      matched++;
    }
  }

  return evidence.length === 0
    ? 0
    : matched / evidence.length;
}

function buildFallbackEvaluation(
  transcript: string,
  lowSignal: boolean
) {
  return {
    overview: lowSignal
      ? "Limited recruiter-grade signal was captured during the interview."
      : "Candidate completed the interview with measurable communication and behavioral signals.",

    recruiterSummary:
      lowSignal
        ? "Conversation quality was insufficient for a reliable hiring recommendation. Human recruiter follow-up is advised."
        : "Candidate demonstrated usable recruiter signal with observable communication and engagement patterns.",

    hiringRecommendation:
      lowSignal
        ? "Hold / Human Review"
        : "Maybe",

    strengths: lowSignal
      ? []
      : [
          "Maintained interview participation",
        ],

    weaknesses: [
      "Evaluation fallback mode triggered",
    ],

    uncertaintyIndicators: [
      "AI structured extraction fallback activated.",
    ],

    observedFacts: [],

    scores: {
      communication:
        lowSignal ? 40 : 60,
      technical:
        lowSignal ? 35 : 55,
      behavioral:
        lowSignal ? 45 : 60,
      overall:
        lowSignal ? 40 : 58,
    },

    confidence: lowSignal
      ? "low"
      : "medium",
  };
}

async function generateWithRecovery(
  prompt: string
) {
  const primary =
    await generateEvaluation(
      prompt
    );

  const parsedPrimary =
    safeJsonParse(primary);

  if (parsedPrimary) {
    return {
      raw: primary,
      parsed: parsedPrimary,
      recoveryUsed: false,
    };
  }

  const repairedPrompt = `
Return STRICT VALID JSON only.

Do not use markdown.
Do not use code fences.
Do not explain anything.

Previous malformed output:
${primary}
`;

  const repaired =
    await generateEvaluation(
      repairedPrompt
    );

  const parsedRepair =
    safeJsonParse(repaired);

  if (parsedRepair) {
    return {
      raw: repaired,
      parsed: parsedRepair,
      recoveryUsed: true,
    };
  }

  throw new Error(
    "FAILED_JSON_RECOVERY"
  );
}

export async function POST(
  req: Request
) {
  const requestId =
    crypto.randomUUID().slice(0, 8);

  const startedAt =
    performance.now();

  try {
    const rawBody =
      await req.json();

    const body =
      RequestSchema.parse(
        rawBody
      );

    const rawTranscript =
      body.transcript.trim();

    const cleanedTranscript =
      cleanTranscript(
        rawTranscript
      );

    if (!cleanedTranscript) {
      return Response.json(
        {
          ok: false,
          code:
            "EMPTY_TRANSCRIPT",
          error:
            "No usable transcript found.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      validateTranscriptForEvaluation(
        cleanedTranscript,
        body.meta
      );

    const lowSignal =
      validation.status ===
      "insufficient_data";

    if (!GEMINI_API_KEY) {
      return Response.json(
        {
          ok: false,
          code:
            "MISSING_API_KEY",
          error:
            "Gemini API key missing.",
        },
        {
          status: 500,
        }
      );
    }

    const finalPrompt =
      buildEvaluationPrompt(
        cleanedTranscript,
        {
          evidenceCoverage:
            validation.evidenceCoverage,

          uncertaintyIndicators:
            validation.uncertaintyIndicators,

          observedFacts:
            validation.observedFacts,

          lowSignal,
        }
      );

    let rawEvaluation = "";
    let parsed: any = null;

    let recoveryUsed =
      false;

    try {
      const generation =
        await generateWithRecovery(
          finalPrompt
        );

      rawEvaluation =
        generation.raw;

      parsed =
        generation.parsed;

      recoveryUsed =
        generation.recoveryUsed;
    } catch {
      parsed =
        buildFallbackEvaluation(
          cleanedTranscript,
          lowSignal
        );

      rawEvaluation =
        JSON.stringify(
          parsed,
          null,
          2
        );

      recoveryUsed = true;
    }

    if (
      typeof parsed !==
        "object" ||
      !parsed
    ) {
      parsed =
        buildFallbackEvaluation(
          cleanedTranscript,
          lowSignal
        );
    }

    parsed =
      parseEvaluation(
        JSON.stringify(parsed)
      );

    parsed.overview =
      normalizeText(
        parsed.overview,
        lowSignal
          ? "Partial recruiter signal detected."
          : "Structured recruiter evaluation completed."
      );

    parsed.recruiterSummary =
      normalizeText(
        parsed.recruiterSummary,
        lowSignal
          ? "Further recruiter follow-up recommended."
          : "Candidate demonstrated measurable recruiter-grade signal."
      );

    parsed.strengths =
      normalizeArray(
        parsed.strengths
      );

    parsed.weaknesses =
      normalizeArray(
        parsed.weaknesses
      );

    parsed.uncertaintyIndicators =
      normalizeArray(
        parsed.uncertaintyIndicators
      );

    parsed.observedFacts =
      normalizeArray(
        parsed.observedFacts
      );

    const deterministic =
      calculateDeterministicScore(
        parsed,
        validation
      );

    parsed.scores = {
      ...parsed.scores,
      overall:
        deterministic.overall,
    };

    parsed.hiringRecommendation =
      RecommendationSchema.safeParse(
        parsed.hiringRecommendation
      ).success
        ? parsed.hiringRecommendation
        : deterministic.recommendation;

    parsed.status =
      lowSignal
        ? "partial_signal"
        : "sufficient_data";

    parsed.confidence =
      lowSignal
        ? "low"
        : validation.confidence;

    parsed.transcriptIntegrity =
      clamp(
        Math.round(
          extractEvidenceCoverage(
            cleanedTranscript,
            parsed
          ) * 100
        )
      );

    parsed.evidenceCoverage =
      validation.evidenceCoverage;

    parsed.model =
      GEMINI_MODEL;

    parsed.lowSignal =
      lowSignal;

    parsed.requestId =
      requestId;

    parsed.processingLatencyMs =
      Math.round(
        performance.now() -
          startedAt
      );

    parsed.recoveryUsed =
      recoveryUsed;

    parsed.telemetry = {
      transcriptLength:
        cleanedTranscript.length,

      candidateTurns:
        body.meta
          ?.candidateTurns ?? 0,

      candidateWordShare:
        body.meta
          ?.candidateWordShare ??
        0,

      parserRecoveryUsed:
        recoveryUsed,

      lowSignal,

      evidenceCoverage:
        validation.evidenceCoverage,
    };

    const hallucinationRisk =
      parsed.transcriptIntegrity <
      40;

    if (hallucinationRisk) {
      parsed.uncertaintyIndicators.push(
        "Low transcript evidence alignment detected."
      );
    }

    let persisted = false;

    try {
      const supabase =
        getSupabaseAdmin();

      if (supabase) {
        const payload = {
          candidate_name:
            "Unknown Candidate",

          transcript:
            cleanedTranscript,

          evaluation:
            parsed,

          recommendation:
            parsed.hiringRecommendation,

          score:
            deterministic.overall,

          confidence:
            parsed.confidence,

          transcript_integrity:
            parsed.transcriptIntegrity,

          low_signal:
            lowSignal,

          telemetry:
            parsed.telemetry,

          created_at:
            new Date().toISOString(),
        };

        const {
          error,
        } =
          await supabase
            .from(
              "candidate_reports"
            )
            .insert([
              payload,
            ]);

        if (error) {
          console.error(
            `[evaluate:${requestId}] supabase_insert_error`,
            error
          );
        } else {
          persisted = true;
        }
      }
    } catch (dbError) {
      console.error(
        `[evaluate:${requestId}] database_crash`,
        dbError
      );
    }

    console.info(
      `[evaluate:${requestId}] success`,
      {
        model:
          GEMINI_MODEL,

        overall:
          deterministic.overall,

        recommendation:
          deterministic.recommendation,

        recoveryUsed,

        lowSignal,

        latencyMs:
          parsed.processingLatencyMs,
      }
    );

    return Response.json({
      ok: true,
      evaluation: rawEvaluation,
      parsed,
      persisted,
      dbConfigured: isSupabaseConfigured(),
    });
  } catch (error) {
    const {
      code,
      message,
      httpStatus,
    } =
      formatGeminiError(
        error
      );

    console.error(
      `[evaluate:${requestId}] fatal`,
      error
    );

    return Response.json(
      {
        ok: false,
        code,
        error: message,
        evaluation:
          "Evaluation pipeline failed safely.",
      },
      {
        status: httpStatus,
      }
    );
  }
}