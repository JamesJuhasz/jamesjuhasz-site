"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { givingLevels, type GivingLevel } from "@/lib/seed-data";
import { cn } from "@/lib/cn";

/*
  Reusable tier grid. Used on /donate (Day 4) and the home partnership ask.
  Clicking a tier navigates to /donate with `?amount=` so the Donorbox
  embed can pre-fill (Donorbox supports the query param natively).
*/

const fmtCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function GivingTiers({
  levels = givingLevels,
  className,
  onTierClick,
}: {
  levels?: GivingLevel[];
  className?: string;
  onTierClick?: (amount: number) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {levels.map((tier, i) => (
        <TierCard key={tier.amount} tier={tier} index={i} onClick={onTierClick} />
      ))}
      <CustomTierCard onClick={onTierClick} />
    </div>
  );
}

function TierCard({
  tier,
  index,
  onClick,
}: {
  tier: GivingLevel;
  index: number;
  onClick?: (amount: number) => void;
}) {
  const featured = index === 1; // middle tier (250) is the visual anchor
  return (
    <Card
      tone={featured ? "navy" : "default"}
      className={cn(
        "relative flex flex-col gap-3",
        featured && "shadow-lift",
      )}
    >
      {featured && (
        <Badge
          tone="sand"
          className="absolute -top-3 right-4 shadow-soft"
        >
          Most Popular
        </Badge>
      )}
      <p
        className={cn(
          "text-eyebrow uppercase tracking-wider",
          featured ? "text-paper/60" : "text-ink-3",
        )}
      >
        {tier.label}
      </p>
      <p
        className={cn(
          "font-display text-h2 leading-none",
          featured ? "text-paper" : "text-ink",
        )}
      >
        {fmtCurrency.format(tier.amount)}
      </p>
      <p
        className={cn(
          "text-body",
          featured ? "text-paper/80" : "text-ink/75",
        )}
      >
        {tier.outcome}
      </p>
      <Button
        href={`/donate?amount=${tier.amount}`}
        variant={featured ? "donate" : "secondary"}
        size="md"
        className="mt-2 w-full"
        onClick={() => onClick?.(tier.amount)}
        data-cta-location={`giving_tier_${tier.amount}`}
        data-giving-amount={tier.amount}
      >
        Give {fmtCurrency.format(tier.amount)}
      </Button>
    </Card>
  );
}

function CustomTierCard({ onClick }: { onClick?: (amount: number) => void }) {
  return (
    <Card tone="muted" className="flex flex-col gap-3">
      <p className="text-eyebrow uppercase tracking-wider text-ink-3">Custom</p>
      <p className="font-display text-h2 leading-none text-ink">Your call</p>
      <p className="text-body text-ink/75">
        Whatever feels right. Every contribution moves me forward.
      </p>
      <Button
        href="/donate"
        variant="ghost"
        size="md"
        className="mt-2 w-full"
        onClick={() => onClick?.(0)}
        data-cta-location="giving_tier_custom"
      >
        Choose your amount
      </Button>
    </Card>
  );
}
