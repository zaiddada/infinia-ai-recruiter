"use client";

import { useEffect, useRef } from "react";

import type { TranscriptMessage } from "@/app/types/interview";

export function TranscriptPanel({
  messages,
  isLive,
}: {
  messages: TranscriptMessage[];
  isLive: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full min-h-[320px] flex-col lg:min-h-[560px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Live transcript
          </h2>
          <p className="text-xs text-zinc-500">
            Real-time capture · deduplicated for accuracy
          </p>
        </div>
        {isLive && (
          <span className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Recording
          </span>
        )}
      </div>

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-zinc-400">
              When the interview starts, each turn appears here with speaker
              attribution.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-white/[0.06] bg-black/40 p-4 transition hover:border-white/10"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
                  {msg.role}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                {msg.transcript}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
