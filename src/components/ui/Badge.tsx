import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "navy" | "sand" | "donate";

const toneStyles: Record<Tone, string> = {
  default: "bg-foam-deep text-navy ring-1 ring-line",
  navy: "bg-navy text-foam",
  sand: "bg-sand text-navy",
  donate: "bg-donate text-white",
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
        "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-eyebrow uppercase font-medium tracking-wider",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
