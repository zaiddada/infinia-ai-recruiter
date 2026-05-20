/**
 * Cleans VAPI live transcripts for evaluation without unfairly
 * removing genuine hesitation or stutter patterns.
 */

const FILLER_ONLY =
  /^(um+|uh+|er+|ah+|like|you know|i mean|so|well)\.?$/i;

const STT_NOISE_PATTERNS = [
  /\b(\w{1,3})\s+\1\s+\1\b/gi, // triple tiny word repeats (STT glitch)
  /\s{2,}/g,
];

/** Returns true if line is only noise, not meaningful speech */
function isNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.length < 3) return true;
  if (FILLER_ONLY.test(trimmed)) return true;
  return false;
}

/** Similarity ratio for near-duplicate detection */
function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;
  const shorter = sa.length < sb.length ? sa : sb;
  const longer = sa.length >= sb.length ? sa : sb;
  if (longer.startsWith(shorter)) {
    return shorter.length / longer.length;
  }
  return 0;
}

/**
 * Merge streaming partials: if new line extends previous, replace it.
 */
export function mergeTranscriptLine(
  existing: string,
  newLine: string
): string {
  const lines = existing.split("\n").filter(Boolean);
  const last = lines[lines.length - 1];

  if (!last) {
    return newLine;
  }

  if (last === newLine) {
    return existing;
  }

  if (newLine.startsWith(last) || similarity(last, newLine) > 0.85) {
    lines[lines.length - 1] = newLine;
    return lines.join("\n");
  }

  return `${existing}\n${newLine}`;
}

/**
 * Full transcript clean pass for evaluation (server + client).
 * Preserves stuttering inside sentences; removes duplicate lines/chunks.
 */
export function cleanTranscript(transcript: string): string {
  if (!transcript?.trim()) return "";

  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isNoiseLine(line));

  const deduped: string[] = [];

  for (const line of lines) {
    const prev = deduped[deduped.length - 1];
    if (!prev) {
      deduped.push(line);
      continue;
    }

    // Exact duplicate
    if (prev === line) continue;

    // Near-duplicate (STT re-send)
    if (similarity(prev, line) > 0.92) {
      if (line.length > prev.length) {
        deduped[deduped.length - 1] = line;
      }
      continue;
    }

    // Partial streaming already handled live; skip subset repeats
    if (prev.startsWith(line) || line.startsWith(prev)) {
      if (line.length > prev.length) {
        deduped[deduped.length - 1] = line;
      }
      continue;
    }

    deduped.push(line);
  }

  return deduped
    .map((line) => {
      let l = line;
      for (const pattern of STT_NOISE_PATTERNS) {
        l = l.replace(pattern, pattern === STT_NOISE_PATTERNS[0] ? "$1" : " ");
      }
      return l.replace(/\b(\w{2,})( \1){2,}\b/gi, "$1").trim();
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}
