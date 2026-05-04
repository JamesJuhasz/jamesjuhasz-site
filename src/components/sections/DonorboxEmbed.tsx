"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/*
  Donorbox embed wrapper. Renders the iframe with optional ?amount= prefill,
  fires an intersection-observer event when visible (GA4 funnel — Day 6),
  and falls back gracefully when envs aren't set yet.

  Env vars (set on Railway, see .env.local.example):
  - NEXT_PUBLIC_DONORBOX_CAMPAIGN_URL — e.g. https://donorbox.org/your-campaign
  - NEXT_PUBLIC_DONORBOX_EMBED_ID    — the campaign id (slug) for the embed iframe
*/

type Props = {
  amount?: number | null;
};

export function DonorboxEmbed({ amount }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  const campaignUrl = process.env.NEXT_PUBLIC_DONORBOX_CAMPAIGN_URL;
  const embedId = process.env.NEXT_PUBLIC_DONORBOX_EMBED_ID;

  useEffect(() => {
    if (!ref.current || seen) return;
    const node = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          if (typeof window !== "undefined" && "gtag" in window) {
            const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
            gtag("event", "donorbox_visible", {
              embed_id: embedId ?? "stub",
            });
          }
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [embedId, seen]);

  if (!embedId || !campaignUrl) {
    return <DonorboxFallback />;
  }

  // currency=CAD asks Donorbox to render the form in Canadian dollars.
  // NOTE: this URL param may be ignored if the Donorbox campaign itself is
  // configured to a different default currency; the campaign settings on
  // donorbox.org are the source of truth. Flag if the embed still shows USD.
  const iframeSrc =
    `https://donorbox.org/embed/${embedId}` +
    (amount
      ? `?default_interval=o&amount=${amount}&currency=CAD`
      : "?default_interval=m&currency=CAD");

  return (
    <div
      ref={ref}
      className="w-full max-w-[420px] ml-auto rounded-3xl overflow-hidden shadow-lift"
    >
      <iframe
        src={iframeSrc}
        title="Donorbox campaign"
        name="donorbox"
        seamless={true}
        scrolling="no"
        height="900px"
        width="100%"
        style={{
          maxWidth: "100%",
          minWidth: "250px",
          maxHeight: "none",
        }}
        allow="payment"
      />
      <Script
        src="https://donorbox.org/widget.js"
        strategy="lazyOnload"
      />
    </div>
  );
}

function DonorboxFallback() {
  return (
    <Card className="flex flex-col items-start gap-4">
      <p className="text-eyebrow uppercase tracking-wider text-ink-3">
        Donorbox embed — pending campaign setup
      </p>
      <h3 className="font-display text-h3 text-ink">
        The Donorbox widget will render here.
      </h3>
      <p className="text-body text-ink/75 max-w-prose">
        Set <code className="rounded bg-fog px-1.5 py-0.5 text-caption">
          NEXT_PUBLIC_DONORBOX_CAMPAIGN_URL
        </code> and{" "}
        <code className="rounded bg-fog px-1.5 py-0.5 text-caption">
          NEXT_PUBLIC_DONORBOX_EMBED_ID
        </code>{" "}
        in <code className="rounded bg-fog px-1.5 py-0.5 text-caption">.env.local</code>{" "}
        (and on Railway). Until then, this card stands in.
      </p>
      <Button
        href="https://donorbox.org"
        variant="donate"
        size="md"
      >
        Donate via Donorbox →
      </Button>
    </Card>
  );
}
