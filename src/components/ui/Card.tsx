import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "muted" | "navy";

const toneStyles: Record<Tone, string> = {
  default: "bg-white ring-1 ring-line",
  muted: "bg-foam-deep ring-1 ring-line/50",
  navy: "bg-navy text-foam ring-1 ring-navy-soft",
};

export function Card({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6 shadow-soft transition-shadow duration-200",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
