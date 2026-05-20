"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useEffect } from "react";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// REMOVE this if Next throws error because of "use client"
// export const metadata: Metadata = {
//   title: "Infinia — AI Voice Recruiter",
//   description:
//     "Voice-powered candidate screening with fair, recruiter-grade post-interview analysis.",
// };

function GlobalErrorLogger() {
  useEffect(() => {
    const handleUnhandledRejection = (
      event: PromiseRejectionEvent
    ) => {
      console.error(
        "Unhandled promise rejection:",
        event.reason
      );
    };

    const handleGlobalError = (
      event: ErrorEvent
    ) => {
      console.error(
        "Global error:",
        event.error
      );
    };

    window.addEventListener(
      "unhandledrejection",
      handleUnhandledRejection
    );

    window.addEventListener(
      "error",
      handleGlobalError
    );

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );

      window.removeEventListener(
        "error",
        handleGlobalError
      );
    };
  }, []);

  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#050506] text-zinc-100 antialiased">
        
        <GlobalErrorLogger />

        {children}

      </body>
    </html>
  );
}
