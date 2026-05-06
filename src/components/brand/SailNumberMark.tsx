type Props = {
  align?: "left" | "right" | "center";
  size?: "sm" | "md" | "lg";
  mode?: "light" | "dark";
  className?: string;
};

const SIZES = {
  sm: { country: "0.625rem", number: "1.5rem", gap: 2 },
  md: { country: "0.6875rem", number: "2.25rem", gap: 4 },
  lg: { country: "0.75rem", number: "2.875rem", gap: 6 },
} as const;

/**
 * Broadcast-style sail number identity.
 * "CAN" in red mono caps; "217718" in display.
 * For hero watermarks, patches, and editorial use.
 */
export function SailNumberMark({
  align = "right",
  size = "md",
  mode = "light",
  className,
}: Props) {
  const sz = SIZES[size];
  const numberColor =
    mode === "dark" ? "var(--color-paper)" : "var(--color-ink)";
  const textAlign = align;
  return (
    <div className={className} style={{ textAlign }}>
      <div
        className="font-mono"
        style={{
          fontSize: sz.country,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--color-red)",
          marginBottom: sz.gap,
          fontWeight: 500,
        }}
      >
        CAN
      </div>
      <div
        className="font-display"
        style={{
          fontSize: sz.number,
          fontWeight: 700,
          letterSpacing: "0.02em",
          lineHeight: 1,
          color: numberColor,
        }}
      >
        217718
      </div>
    </div>
  );
}
