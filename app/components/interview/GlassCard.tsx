import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  glow?: boolean;
};

export function GlassCard({
  children,
  className = "",
  glow = false,
}: GlassCardProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border border-white/[0.08]",
        "bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]",
        glow
          ? "shadow-[0_0_60px_-12px_rgba(34,197,94,0.25)]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          background:
            "radial-gradient(800px 400px at 10% -20%, rgba(34,197,94,0.25), transparent 50%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
