"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  animate,
} from "framer-motion";
import { cn } from "@/lib/cn";

type StatNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  label?: string;
  duration?: number;
  className?: string;
  formatLocale?: string;
};

export function StatNumber({
  value,
  prefix = "",
  suffix = "",
  label,
  duration = 1.6,
  className,
  formatLocale = "en-US",
}: StatNumberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduceMotion = useReducedMotion();
  // Seed the motion value at the final number so SSR/initial paint show the
  // correct value — never a flash of "0". Animation (when allowed) snaps back
  // to 0 on first reveal and counts up.
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString(formatLocale),
  );
  const formattedFinal = value.toLocaleString(formatLocale);
  const [display, setDisplay] = useState(formattedFinal);

  useEffect(() => {
    // Reduced motion: leave the final value in place, no animation.
    if (reduceMotion) return;
    if (!inView) return;
    // First reveal: snap to 0 and animate up to the final value.
    motionValue.set(0);
    setDisplay("0");
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [inView, motionValue, rounded, value, duration, reduceMotion]);

  return (
    <div ref={ref} className={cn("flex flex-col items-start", className)}>
      <motion.span
        className="font-display text-display leading-none tracking-tight text-ink"
        aria-label={`${prefix}${formattedFinal}${suffix}`}
      >
        {prefix}
        {display}
        {suffix}
      </motion.span>
      {label ? (
        <span className="mt-2 text-caption uppercase tracking-wider text-ink-3">
          {label}
        </span>
      ) : null}
    </div>
  );
}
