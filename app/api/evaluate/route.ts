import { cleanTranscript } from "@/app/lib/transcriptCleaner";
import { parseEvaluation } from "@/app/lib/evaluationParser";
import { validateTranscriptForEvaluation } from "@/app/lib/evaluationGuard";
import { getSupabase } from "@/lib/supabase";

import { buildEvaluationPrompt } from "./prompt";

import {
  formatGeminiError,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  generateEvaluation,
} from "./gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const requestId =
    crypto.randomUUID().slice(0, 8);

  try {

    // -----------------------------------
    // REQUEST BODY
    // -----------------------------------
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

    // -----------------------------------
    // TRANSCRIPT CLEANING
    // -----------------------------------
    const rawTranscript =
      body.transcript?.trim() ?? "";

    const cleanedTranscript =
      cleanTranscript(rawTranscript);

    console.log(
      `[evaluate:${requestId}]`,
      {
        rawLength:
          rawTranscript.length,

        cleanedLength:
          cleanedTranscript.length,

        model:
          GEMINI_MODEL,
      }
    );

    // -----------------------------------
    // EMPTY TRANSCRIPT CHECK
    // -----------------------------------
    if (!cleanedTranscript) {

      return Response.json(
        {
          ok: false,

          code:
            "EMPTY_TRANSCRIPT",

          evaluation:
            "No transcript found after processing.",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------
    // VALIDATE SIGNAL QUALITY
    // -----------------------------------
    const validation =
      validateTranscriptForEvaluation(
        cleanedTranscript,
        body.meta
      );

    const lowSignal =
      validation.status ===
      "insufficient_data";

    // -----------------------------------
    // GEMINI API KEY CHECK
    // -----------------------------------
    if (!GEMINI_API_KEY) {

      const {
        code,
        message,
        httpStatus,
      } =
        formatGeminiError(
          new Error(
            "MISSING_API_KEY"
          )
        );

      return Response.json(
        {
          ok: false,

          code,

          error:
            message,

          evaluation:
            message,
        },
        {
          status:
            httpStatus,
        }
      );
    }

    // -----------------------------------
    // BUILD EVALUATION PROMPT
    // -----------------------------------
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

    // -----------------------------------
    // GENERATE AI EVALUATION
    // -----------------------------------
    const markdown =
      await generateEvaluation(
        finalPrompt
      );

    // -----------------------------------
    // PARSE RESULT
    // -----------------------------------
    const parsed =
      parseEvaluation(
        markdown
      );

    // -----------------------------------
    // FORCE RECRUITER-STYLE RESPONSE
    // -----------------------------------
    parsed.status =
      lowSignal
        ? "partial_signal"
        : "sufficient_data";

    parsed.evidenceCoverage =
      parsed.evidenceCoverage ??
      validation.evidenceCoverage;

    parsed.transcriptSufficiency =
      parsed.transcriptSufficiency ??
      (
        validation.confidence ===
        "high"
      )
        ? "high"
        : validation.confidence ===
            "medium"
          ? "medium"
          : "low";

    parsed.confidence =
      lowSignal
        ? "low"
        : parsed.confidence ??
          validation.confidence;

    parsed.uncertaintyIndicators =
      parsed
        .uncertaintyIndicators
        ?.length
        ? parsed
            .uncertaintyIndicators
        : validation
            .uncertaintyIndicators;

    parsed.observedFacts =
      parsed.observedFacts
        ?.length
        ? parsed.observedFacts
        : validation.observedFacts;

    // -----------------------------------
    // LOW SIGNAL SAFETY
    // -----------------------------------
    if (lowSignal) {

      parsed.uncertaintyIndicators =
        [
          ...(parsed.uncertaintyIndicators ??
            []),

          "Interview signal strength was lower than ideal for a highly confident hiring recommendation.",

          "Some scoring dimensions may require deeper human follow-up.",

          "Candidate responses contained limited evidence in certain evaluation categories.",
        ];
    }

    // -----------------------------------
    // DEFAULT FALLBACKS
    // -----------------------------------
    if (
      !parsed.recruiterSummary
    ) {

      parsed.recruiterSummary =
        lowSignal
          ? "Candidate interaction produced partial but usable recruiter signal. Further probing is recommended before making a final hiring decision."
          : "Candidate demonstrated measurable communication and role-fit signals during the interaction.";
    }

    if (
      !parsed.hiringRecommendation
    ) {

      parsed.hiringRecommendation =
        lowSignal
          ? "Hold / Human Review"
          : "Proceed";
    }

    if (
      !parsed.overview
    ) {

      parsed.overview =
        lowSignal
          ? "Partial recruiter signal detected with limited evaluation confidence."
          : "Structured recruiter evaluation completed successfully.";
    }

    // -----------------------------------
    // SUCCESS LOG
    // -----------------------------------
    console.log(
      `[evaluate:${requestId}] success`,
      {
        length:
          markdown.length,

        overall:
          parsed.scores
            ?.overall,

        lowSignal,

        confidence:
          parsed.confidence,
      }
    );

    // -----------------------------------
    // SAVE TO SUPABASE
    // -----------------------------------
    try {
      const supabase = getSupabase();

      if (!supabase) {
        console.warn(
          "[evaluate] Supabase skipped: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
        );
      } else {
      console.log(
        "Saving evaluation to Supabase..."
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "candidate_reports"
          )
          .insert([
            {
              candidate_name:
                "Unknown Candidate",

              transcript:
                cleanedTranscript,

              evaluation:
                parsed,

              score:
                Number(
                  parsed.scores
                    ?.overall ??
                    0
                ),

              recommendation:
                parsed.hiringRecommendation ??
                "Hold / Human Review",

              created_at:
                new Date().toISOString(),
            },
          ])
          .select();

      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:"
        );

        console.error(
          error
        );

      } else {

        console.log(
          "Saved successfully:"
        );

        console.log(
          data
        );
      }
      }

    } catch (dbError) {

      console.error(
        "DATABASE CRASH:"
      );

      console.error(
        dbError
      );
    }

    // -----------------------------------
    // FINAL RESPONSE
    // -----------------------------------
    return Response.json({
      ok: true,

      evaluation:
        markdown,

      parsed,
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
      `[evaluate:${requestId}] ${code}:`,
      error
    );

    return Response.json(
      {
        ok: false,

        code,

        error:
          message,

        evaluation:
          message,
      },
      {
        status:
          httpStatus,
      }
    );
  }
}