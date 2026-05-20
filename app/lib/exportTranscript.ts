import { formatDuration } from "@/app/lib/evaluationParser";
import type { TranscriptMessage } from "@/app/types/interview";

function formatSpeakerLabel(role: string): string {
  const r = role.toLowerCase();
  if (
    r.includes("assistant") ||
    r.includes("bot") ||
    r.includes("ai") ||
    r.includes("system")
  ) {
    return "Recruiter";
  }
  if (
    r.includes("user") ||
    r.includes("candidate") ||
    r.includes("customer") ||
    r.includes("human")
  ) {
    return "Candidate";
  }
  return role || "Speaker";
}

function formatMessageTime(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function buildTranscriptText(
  messages: TranscriptMessage[],
  durationSeconds?: number
): string {
  const date = new Date().toLocaleString();
  const duration =
    durationSeconds !== undefined && durationSeconds > 0
      ? formatDuration(durationSeconds)
      : "N/A";

  const lines: string[] = [
    "Candidate Screening Transcript",
    `Date: ${date}`,
    `Duration: ${duration}`,
    "",
  ];

  for (const msg of messages) {
    const speaker = formatSpeakerLabel(msg.role);
    const time = formatMessageTime(msg.timestamp);
    const timeSuffix = time ? ` (${time})` : "";

    lines.push(`${speaker}${timeSuffix}:`);
    lines.push(msg.transcript.trim());
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function downloadTranscript(
  messages: TranscriptMessage[],
  durationSeconds?: number
): void {
  if (messages.length === 0) return;

  const text = buildTranscriptText(messages, durationSeconds);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `infinia-interview-transcript-${stamp}.txt`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
