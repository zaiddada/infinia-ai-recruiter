"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function GlobalErrorLogger() {
  useEffect(() => {
    const handleUnhandledRejection = (
      event: PromiseRejectionEvent
    ) => {
      console.error(
        "[app] unhandledrejection",
        event.reason
      );
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error("[app] error", event.error);
    };

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection
    );
    window.addEventListener("error", handleGlobalError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);

  return null;
}

export function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#050506] text-zinc-100 antialiased">
        <GlobalErrorLogger />
        {children}
      </body>
    </html>
  );
}
