"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Section = { id: string; label: string };

type Props = {
  sections: Section[];
};

/**
 * Floating in-page anchor nav for long pages. Appears once the user has
 * scrolled past the first viewport, tracks the active section via
 * IntersectionObserver, and links to anchored sections.
 *
 * Renders as a vertical left-rail on `lg:` breakpoints — a thin column of
 * dot+label pairs along the left edge so it never overlaps body content.
 * Hidden below `lg:`.
 *
 * Pages opt in by passing a `sections` array. The matching section
 * elements must have a `id` attribute (the page is responsible for that).
 */
export function SectionNav({ sections }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Show once past first viewport, hide when within the last 200vh of the
  // page so the rail never lands over the footer or final CTA.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      const pastFirstFold = y > vh * 0.6;
      const nearBottom = docH - (y + vh) < vh * 2;
      setVisible(pastFirstFold && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Track which section is currently in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(s.id);
        },
        { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  return (
    <div
      className={cn(
        "hidden lg:block fixed left-6 top-1/2 -translate-y-1/2 z-30",
        "transition-all duration-300",
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none",
      )}
      aria-label="On-page navigation"
    >
      <nav className="relative flex flex-col gap-4 pl-3">
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-px bg-mist"
        />
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <Link
              key={s.id}
              href={`#${s.id}`}
              aria-label={s.label}
              className="group relative flex items-center"
            >
              <span
                aria-hidden
                className={cn(
                  "block h-2 w-2 rounded-full transition-colors",
                  isActive ? "bg-red" : "bg-mist group-hover:bg-ink-3",
                )}
              />
              <span
                className={cn(
                  "ml-3 text-caption uppercase tracking-wider whitespace-nowrap transition-all duration-200",
                  "opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto",
                  isActive ? "text-ink" : "text-ink-3",
                )}
              >
                {s.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
