"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

import { downloadTranscript } from "@/app/lib/exportTranscript";
import type { TranscriptMessage } from "@/app/types/interview";

const SCROLL_THRESHOLD_PX = 120;

export function TranscriptPanel({
  messages,
  isLive,
  durationSeconds = 0,
  showHeader = true,
  onDownload,
}: {
  messages: TranscriptMessage[];
  isLive?: boolean;
  durationSeconds?: number;
  showHeader?: boolean;
  onDownload?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      setShouldAutoScroll(distanceFromBottom < SCROLL_THRESHOLD_PX);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!shouldAutoScroll) return;

    const container = scrollRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, shouldAutoScroll]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    downloadTranscript(messages, durationSeconds);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="mb-4 shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Live transcript</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Real-time capture · deduplicated for accuracy
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download transcript
                </button>
              )}

              {isLive && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-emerald-400">LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="custom-scrollbar absolute inset-0 overflow-y-auto overscroll-contain pr-2"
        >
          <div className="space-y-4 pb-2">
            {messages.length === 0 ? (
              <div className="flex min-h-[200px] items-center justify-center text-zinc-500">
                Transcript will appear here...
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                      {msg.role || "Speaker"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-200">
                    {msg.transcript}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {!shouldAutoScroll && messages.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const container = scrollRef.current;
                if (!container) return;

                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: "smooth",
                });
                setShouldAutoScroll(true);
              }}
              className="pointer-events-auto rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur transition hover:bg-zinc-800"
            >
              ↓ New messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
