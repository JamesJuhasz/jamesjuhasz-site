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
 * Pages opt in by passing a `sections` array. The matching section
 * elements must have a `id` attribute (the page is responsible for that).
 */
export function SectionNav({ sections }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Show once past first viewport, hide when within the last 200vh of the
  // page so a floating pill never lands over the footer or final CTA.
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
        "hidden lg:block fixed left-1/2 -translate-x-1/2 top-24 z-30",
        "transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      )}
      aria-label="On-page navigation"
    >
      <nav className="flex items-center gap-1 rounded-pill bg-paper ring-1 ring-mist/60 px-2 py-1 shadow-soft">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "relative px-3 py-1.5 text-caption uppercase tracking-wider transition-colors rounded-pill",
                isActive ? "text-ink" : "text-ink-3 hover:text-ink",
              )}
            >
              {s.label}
              <span
                aria-hidden
                className={cn(
                  "absolute left-3 right-3 -bottom-0.5 h-px bg-red transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
