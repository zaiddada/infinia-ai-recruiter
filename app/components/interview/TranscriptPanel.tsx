"use client";

import { useEffect, useRef, useState } from "react";

interface TranscriptPanelProps {
  messages: any[];
  isLive?: boolean;
}

export function TranscriptPanel({
  messages,
  isLive,
}: TranscriptPanelProps) {
  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const [shouldAutoScroll, setShouldAutoScroll] =
    useState(true);

  // Detect if user manually scrolled up
  useEffect(() => {
    const container = scrollRef.current;

    if (!container) return;

    const handleScroll = () => {
      const threshold = 120;

      const isNearBottom =
        container.scrollHeight -
          container.scrollTop -
          container.clientHeight <
        threshold;

      setShouldAutoScroll(isNearBottom);
    };

    container.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  // Auto scroll ONLY if user is near bottom
  useEffect(() => {
    if (!shouldAutoScroll) return;

    const container = scrollRef.current;

    if (!container) return;

    container.scrollTop =
      container.scrollHeight;
  }, [messages, shouldAutoScroll]);

  return (
    <div className="relative flex h-full flex-col">

      {/* HEADER */}
      <div className="border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">
              Live transcript
            </h2>

            <p className="text-sm text-zinc-500 mt-1">
              Real-time capture · deduplicated
              for accuracy
            </p>
          </div>

          {isLive && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-xs text-emerald-400">
                LIVE
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE MESSAGES */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Transcript will appear here...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-black/30 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  {msg.role || "speaker"}
                </p>

                <p className="text-xs text-zinc-500">
                  {msg.timestamp || ""}
                </p>
              </div>

              <p className="text-sm leading-relaxed text-zinc-200">
                {msg.transcript || msg.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* NEW MESSAGES BUTTON */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              const container =
                scrollRef.current;

              if (!container) return;

              container.scrollTop =
                container.scrollHeight;

              setShouldAutoScroll(true);
            }}
            className="rounded-full border border-white/10 bg-zinc-900/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur"
          >
            ↓ New messages
          </button>
        </div>
      )}

    </div>
  );
}