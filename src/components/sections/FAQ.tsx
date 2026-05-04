"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type QA = { question: string; answer: React.ReactNode };

export function FAQ({ items }: { items: QA[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="flex flex-col divide-y divide-mist">
      {items.map((qa, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-6 py-5 text-left"
            >
              <span className="font-display text-h3 text-ink">
                {qa.question}
              </span>
              <span
                className={cn(
                  "flex-shrink-0 transition-transform text-ink-3",
                  isOpen && "rotate-180 text-ink",
                )}
              >
                <ChevronDown size={20} />
              </span>
            </button>
            <div
              className={cn(
                "overflow-hidden transition-[grid-template-rows] duration-300 grid",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="pb-6 text-body-lg text-ink/80 max-w-prose">
                  {qa.answer}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
