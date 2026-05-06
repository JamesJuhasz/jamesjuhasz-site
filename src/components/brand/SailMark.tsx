"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { MAPLE_LEAF_SRC } from "./MapleLeaf";

export type SailMarkHandle = {
  startLuff: () => void;
  stopLuff: () => void;
};

type Props = {
  size?: number;
  color?: string;
  battenColor?: string;
  withLeaf?: boolean;
  className?: string;
};

// ---------------------------------------------------------------------------
// Luffing keyframes — 7 waypoints, 500 ms cycle (≈2 Hz, realistic ILCA luff)
//
// Path structure (identical across all frames — required for SMIL interpolation):
//   M  head  C upper-leech  C lower-leech  L  foot  Z
//
// Clew (end of lower leech) is NOT fixed — it moves with the luff so the boom
// can pivot naturally. Boom width tracks the clew x position from the mast.
//
// Physics basis:
//  - Collapse fast (top-down): head backs first → S-curve forms vertically
//  - Deep luff: leech at max windward swing, clew pulls toward mast
//  - Refill slow: foot/clew fills first, head last; leech overshoots on snap
// ---------------------------------------------------------------------------

const SAIL_D = [
  "M 32 6 C 35 17, 41 30, 49 43 C 57 57, 67 72, 78 88 L 32 88 Z", // 0 full / rest
  "M 32 6 C 31 13, 36 27, 45 43 C 51 58, 62 73, 73 88 L 32 88 Z", // 1 leading edge trembles
  "M 32 6 C 27 11, 29 25, 39 43 C 46 59, 59 73, 69 88 L 32 88 Z", // 2 S-curve — head backs hard
  "M 32 6 C 23  9, 25 23, 34 43 C 41 60, 55 74, 63 88 L 32 88 Z", // 3 deep luff — max windward
  "M 32 6 C 41 15, 50 29, 57 43 C 71 57, 79 72, 87 88 L 32 88 Z", // 4 snap overshoot leeward
  "M 32 6 C 34 16, 40 30, 47 43 C 55 57, 65 72, 76 88 L 32 88 Z", // 5 foot fills, head settles
  "M 32 6 C 35 17, 41 30, 49 43 C 57 57, 67 72, 78 88 L 32 88 Z", // 6 full again
];

// Boom width tracks clew-x minus mast-x (29) with extra visual travel
const BOOM_W = "50;45;41;35;59;48;50";

// Upper batten (y=34) inverts most; lower (y=74) barely moves (boom-constrained)
const BATTEN_TOP_D = [
  "M 32 34 L 42 34",
  "M 32 34 L 39 34",
  "M 32 34 L 35 34",
  "M 32 34 L 33 34",
  "M 32 34 L 46 34",
  "M 32 34 L 41 34",
  "M 32 34 L 42 34",
];
const BATTEN_MID_D = [
  "M 32 54 L 54 54",
  "M 32 54 L 47 54",
  "M 32 54 L 41 54",
  "M 32 54 L 36 54",
  "M 32 54 L 61 54",
  "M 32 54 L 51 54",
  "M 32 54 L 54 54",
];
const BATTEN_LOW_D = [
  "M 32 74 L 68 74",
  "M 32 74 L 65 74",
  "M 32 74 L 60 74",
  "M 32 74 L 54 74",
  "M 32 74 L 76 74",
  "M 32 74 L 67 74",
  "M 32 74 L 68 74",
];

// Maple-leaf x-translation (SVG user units) — follows the backing head
const LEAF_TX = ["0 0", "-4 0", "-8 0", "-12 0", "4 0", "-2 0", "0 0"];

// Shared SMIL timing — 6 splines for 7 keyframes
// Very fast easeIn on collapse, easeInOut on bounce, easeOut on refill
const KT = "0;0.09;0.18;0.28;0.43;0.68;1";
const KS = "0.42 0 1 1;0.42 0 1 1;0.42 0 1 1;0.42 0 0.58 1;0 0 0.58 1;0 0 0.58 1";
const DUR = "0.2s";

export const SailMark = forwardRef<SailMarkHandle, Props>(function SailMark({
  size = 96,
  color = "currentColor",
  battenColor = "var(--color-paper)",
  withLeaf = false,
  className,
}: Props, ref) {
  const height = size * 1.2;
  const sailRef = useRef<SVGAnimateElement>(null);
  const boomRef = useRef<SVGAnimateElement>(null);
  const topRef  = useRef<SVGAnimateElement>(null);
  const midRef  = useRef<SVGAnimateElement>(null);
  const lowRef  = useRef<SVGAnimateElement>(null);
  const leafRef = useRef<SVGAnimateTransformElement>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  const startLuff = () => {
    if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
    if (reduceMotion) return;
    sailRef.current?.beginElement();
    boomRef.current?.beginElement();
    topRef.current?.beginElement();
    midRef.current?.beginElement();
    lowRef.current?.beginElement();
    leafRef.current?.beginElement();
  };

  const stopLuff = () => {
    stopTimer.current = setTimeout(() => {
      sailRef.current?.endElement();
      boomRef.current?.endElement();
      topRef.current?.endElement();
      midRef.current?.endElement();
      lowRef.current?.endElement();
      leafRef.current?.endElement();
      stopTimer.current = null;
    }, 800);
  };

  useImperativeHandle(ref, () => ({ startLuff, stopLuff }));

  const animProps = {
    keyTimes: KT,
    calcMode: "spline" as const,
    keySplines: KS,
    dur: DUR,
    repeatCount: "indefinite",
    begin: "indefinite",
  };

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 120"
      fill="none"
      aria-label="Sail mark"
      className={`sail-mark${className ? ` ${className}` : ""}`}
    >
      {/* Mast — rigid, luff edge is pinned here */}
      <rect x="29" y="6" width="3" height="86" fill={color} />

      {/* Boom — pivots from gooseneck (x=29); width tracks clew position */}
      <rect x="29" y="89" width="50" height="3" fill={color}>
        <animate ref={boomRef} attributeName="width" values={BOOM_W} {...animProps} />
      </rect>

      {/* Sail body — leech morphs through S-curve luffing shapes */}
      <path d={SAIL_D[0]} fill={color}>
        <animate ref={sailRef} attributeName="d" values={SAIL_D.join(";")} {...animProps} />
      </path>

      {/* Battens — upper inverts most at peak luff, lower barely moves */}
      <path d={BATTEN_TOP_D[0]} stroke={battenColor} strokeWidth="1.6" fill="none">
        <animate ref={topRef} attributeName="d" values={BATTEN_TOP_D.join(";")} {...animProps} />
      </path>
      <path d={BATTEN_MID_D[0]} stroke={battenColor} strokeWidth="1.6" fill="none">
        <animate ref={midRef} attributeName="d" values={BATTEN_MID_D.join(";")} {...animProps} />
      </path>
      <path d={BATTEN_LOW_D[0]} stroke={battenColor} strokeWidth="1.6" fill="none">
        <animate ref={lowRef} attributeName="d" values={BATTEN_LOW_D.join(";")} {...animProps} />
      </path>

      {/* Maple leaf — slides with the backing head */}
      {withLeaf ? (
        <g>
          <animateTransform
            ref={leafRef}
            attributeName="transform"
            type="translate"
            values={LEAF_TX.join(";")}
            {...animProps}
          />
          <image
            href={MAPLE_LEAF_SRC}
            x="40"
            y="12"
            width="22"
            height="24"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      ) : null}
    </svg>
  );
});
