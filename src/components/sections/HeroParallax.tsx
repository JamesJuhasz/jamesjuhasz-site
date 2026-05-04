"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

type Props = {
  src: string;
  alt?: string;
  priority?: boolean;
  /** Strength of the parallax shift in viewport-height units. Default 0.15. */
  amount?: number;
  /**
   * CSS `object-position` value for the image. Default `"30% 50%"` keeps the
   * subject (typically slightly left of frame on sailing photography) on
   * screen on narrow viewports where `object-cover` would otherwise crop the
   * right side. Pass a custom value per-photo if needed.
   */
  objectPosition?: string;
};

/**
 * Background image with subtle Y-axis parallax tied to the parent section.
 * Used as the absolute-positioned hero photo behind text overlays.
 *
 * Caller's parent must be a positioned (`relative`/`isolate`) full-bleed
 * container; this component fills it.
 */
export function HeroParallax({
  src,
  alt = "",
  priority,
  amount = 0.15,
  objectPosition = "30% 50%",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Translate within an over-sized inner container so the bottom edge of
  // the image never lifts above the section. Range: 0% → -amount*100%.
  const y = useTransform(scrollYProgress, [0, 1], ["0%", `-${amount * 100}%`]);
  // Inner container is taller than its parent by the parallax amount,
  // anchored at top:0 so the translate consumes the extra height.
  const oversize = `${100 + amount * 100}%`;

  return (
    <div
      ref={ref}
      className="absolute inset-0 -z-20 overflow-hidden"
    >
      <motion.div
        className="absolute top-0 left-0 right-0"
        style={
          reduce
            ? { height: oversize }
            : { height: oversize, y }
        }
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          quality={90}
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition }}
        />
      </motion.div>
    </div>
  );
}
