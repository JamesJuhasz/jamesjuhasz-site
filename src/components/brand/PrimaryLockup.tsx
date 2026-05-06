"use client";

import { useRef } from "react";
import { SailMark, type SailMarkHandle } from "./SailMark";

type Mode = "light" | "dark";

type Props = {
  scale?: number;
  mode?: Mode;
  showTagline?: boolean;
  className?: string;
};

/**
 * Primary horizontal lockup: sail mark (with leaf at head) + wordmark + tagline.
 * Use everywhere by default. `mode="dark"` for over dark surfaces.
 */
export function PrimaryLockup({
  scale = 1,
  mode = "light",
  showTagline = true,
  className,
}: Props) {
  const fg = mode === "dark" ? "var(--color-paper)" : "var(--color-ink)";
  const battenColor = mode === "dark" ? "var(--color-ink)" : "var(--color-paper)";
  const taglineColor =
    mode === "dark" ? "rgba(255,255,255,0.7)" : "var(--color-ink-3)";
  const sailRef = useRef<SailMarkHandle>(null);

  return (
    <div
      className={className}
      onMouseEnter={() => sailRef.current?.startLuff()}
      onMouseLeave={() => sailRef.current?.stopLuff()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22 * scale,
        color: fg,
      }}
    >
      <SailMark
        ref={sailRef}
        size={80 * scale}
        color={fg}
        battenColor={battenColor}
        withLeaf
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4 * scale,
          lineHeight: 1,
        }}
      >
        <span
          className="font-display"
          style={{
            fontWeight: 700,
            fontSize: 30 * scale,
            letterSpacing: "-0.03em",
          }}
        >
          James Juhasz
        </span>
        {showTagline ? (
          <span
            className="font-mono"
            style={{
              fontSize: 11 * scale,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: taglineColor,
            }}
          >
            ILCA 7 · CAN 217718 · LA28
          </span>
        ) : null}
      </div>
    </div>
  );
}
