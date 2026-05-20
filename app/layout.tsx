import type { Metadata } from "next";

import { ClientShell } from "@/app/providers/ClientShell";

import "./globals.css";

export const metadata: Metadata = {
  title: "Infinia — AI Voice Recruiter",
  description:
    "Voice-powered candidate screening with fair, recruiter-grade post-interview analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientShell>{children}</ClientShell>;
}
