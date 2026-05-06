import * as React from "react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-eyebrow uppercase font-medium text-ink-3">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-h2 max-w-prose">{title}</h2>
      {lede ? (
        <p
          className={cn(
            "mt-4 text-body-lg text-ink/80 max-w-prose",
            align === "center" && "mx-auto",
          )}
        >
          {lede}
        </p>
      ) : null}
    </header>
  );
}
