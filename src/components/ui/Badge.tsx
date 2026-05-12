import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "ink" | "fog" | "red" | "navy" | "sand" | "donate" | "ongoing";

const toneStyles: Record<Tone, string> = {
  default: "bg-fog text-ink ring-1 ring-mist",
  ink: "bg-ink text-paper",
  fog: "bg-fog text-ink ring-1 ring-mist",
  red: "bg-red text-paper",
  // Back-compat aliases — map to new brand tones
  navy: "bg-ink text-paper",
  sand: "bg-fog text-ink ring-1 ring-mist",
  donate: "bg-red text-paper",
  // Live "racing now" tone — distinct from donate red. Consumer adds a
  // pulsing dot to emphasise live status.
  ongoing: "bg-emerald-600 text-paper",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-eyebrow uppercase font-mono font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
