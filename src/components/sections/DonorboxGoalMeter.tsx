import { cn } from "@/lib/cn";

// Renders the Donorbox campaign goal meter using our own markup so we can
// style it (especially the labels) for any background. The raised/goal/percent
// values come from a server-side fetch of Donorbox's public meter embed,
// revalidated every 60s. Reads NEXT_PUBLIC_DONORBOX_EMBED_ID.

type Props = {
  className?: string;
  /** Tailwind classes for the raised/goal/donations text. */
  textClassName?: string;
  /** Tailwind classes for the dim track behind the progress bar. */
  trackClassName?: string;
};

type MeterData = {
  pct: number;
  raised: string;
  goal: string;
  donations: string;
};

async function fetchMeter(embedId: string): Promise<MeterData | null> {
  try {
    const res = await fetch(
      `https://donorbox.org/embed/${embedId}?only_donation_meter=true`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const html = await res.text();
    const pctMatch = html.match(/width:\s*([\d.]+)%/);
    const raisedMatch = html.match(
      /total-raised'>\s*<b>([^<]+)<\/b>\s*\/\s*([^<]+?)\s*<\/div>/,
    );
    const countMatch = html.match(/total-count'>\s*([^<]+?)\s*</);
    return {
      pct: pctMatch ? Number(pctMatch[1]) : 0,
      raised: raisedMatch?.[1]?.trim() ?? "",
      goal: raisedMatch?.[2]?.trim() ?? "",
      donations: countMatch?.[1]?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

export async function DonorboxGoalMeter({
  className,
  textClassName = "text-ink",
  trackClassName = "bg-red/15",
}: Props) {
  const embedId = process.env.NEXT_PUBLIC_DONORBOX_EMBED_ID;
  if (!embedId) {
    return <Fallback className={className} trackClassName={trackClassName} />;
  }
  const data = await fetchMeter(embedId);
  if (!data) {
    return <Fallback className={className} trackClassName={trackClassName} />;
  }

  const pctRounded = Math.round(data.pct);
  const barWidth = Math.max(data.pct, 6);

  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      <div
        className={cn(
          "h-7 w-full rounded-full overflow-hidden",
          trackClassName,
        )}
        role="progressbar"
        aria-valuenow={pctRounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pctRounded}% of goal raised`}
      >
        <div
          className="h-full rounded-full bg-red flex items-center justify-end pr-2 text-[11px] font-bold text-paper"
          style={{ width: `${barWidth}%` }}
        >
          {pctRounded}%
        </div>
      </div>
      <div className={cn("font-display text-lg leading-none", textClassName)}>
        <span className="font-bold">{data.raised}</span>
        <span className="opacity-70 font-normal"> / {data.goal}</span>
      </div>
      <p className={cn("text-caption opacity-80", textClassName)}>
        {data.donations}
      </p>
    </div>
  );
}

function Fallback({
  className,
  trackClassName,
}: {
  className?: string;
  trackClassName?: string;
}) {
  return (
    <div
      className={cn(
        "h-7 w-full rounded-full overflow-hidden",
        trackClassName ?? "bg-mist",
        className,
      )}
      role="progressbar"
      aria-valuenow={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Donorbox goal meter — embed id not configured"
    >
      <div className="h-full rounded-full bg-red" style={{ width: "0%" }} />
    </div>
  );
}
