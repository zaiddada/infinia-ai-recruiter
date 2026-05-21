const DUPLICATE_WINDOW = 3;

function normalizeLine(
  line: string
): string {
  return line
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isStreamingFragment(
  line: string
): boolean {
  const trimmed =
    line.trim();

  if (!trimmed) {
    return true;
  }

  if (trimmed.length <= 2) {
    return true;
  }

  if (
    trimmed === "." ||
    trimmed === "..." ||
    trimmed === "-"
  ) {
    return true;
  }

  return false;
}

function dedupeSequential(
  lines: string[]
): string[] {
  const cleaned: string[] = [];

  for (const line of lines) {
    const normalized =
      normalizeLine(line);

    const recent =
      cleaned.slice(
        -DUPLICATE_WINDOW
      );

    const exists =
      recent.some(
        (recentLine) =>
          normalizeLine(
            recentLine
          ) === normalized
      );

    if (!exists) {
      cleaned.push(line);
    }
  }

  return cleaned;
}

function mergeFragments(
  lines: string[]
): string[] {
  const merged: string[] = [];

  for (const line of lines) {
    const trimmed =
      line.trim();

    const previous =
      merged[
        merged.length - 1
      ];

    if (!previous) {
      merged.push(trimmed);
      continue;
    }

    const previousNormalized =
      normalizeLine(previous);

    const currentNormalized =
      normalizeLine(trimmed);

    if (
      currentNormalized.startsWith(
        previousNormalized
      ) &&
      currentNormalized.length >
        previousNormalized.length
    ) {
      merged[
        merged.length - 1
      ] = trimmed;

      continue;
    }

    merged.push(trimmed);
  }

  return merged;
}

export function cleanTranscript(
  transcript: string
): string {
  if (!transcript?.trim()) {
    return "";
  }

  const rawLines =
    transcript
      .split("\n")
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

  const filtered =
    rawLines.filter(
      (line) =>
        !isStreamingFragment(
          line
        )
    );

  const deduped =
    dedupeSequential(
      filtered
    );

  const merged =
    mergeFragments(
      deduped
    );

  return merged.join("\n");
}