"use client";

import { motion, useReducedMotion } from "framer-motion";
import * as React from "react";

type Props = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, y = 16, className }: Props) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  // We intentionally don't animate `opacity` here. SSR emits framer-motion's
  // `initial` styles inline; if the in-view animation never fires on a given
  // device (hydration race, IntersectionObserver edge case, aggressive battery
  // saver, JS error upstream), an `opacity: 0` initial leaves the wrapped
  // content invisible forever. Translating `y` only means the worst-case is a
  // 16px static offset — barely perceptible, but always visible.
  return (
    <motion.div
      initial={{ y }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
