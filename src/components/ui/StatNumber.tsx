"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
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
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString(formatLocale),
  );
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [inView, motionValue, rounded, value, duration]);

  return (
    <div ref={ref} className={cn("flex flex-col items-start", className)}>
      <motion.span
        className="font-serif text-display leading-none tracking-tight text-navy"
        aria-label={`${prefix}${value.toLocaleString(formatLocale)}${suffix}`}
      >
        {prefix}
        {display}
        {suffix}
      </motion.span>
      {label ? (
        <span className="mt-2 text-caption uppercase tracking-wider text-mist">
          {label}
        </span>
      ) : null}
    </div>
  );
}
