"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/*
  Donorbox <dbox-widget> embed.

  React's createElement path triggers the Custom Elements spec error
  "A newly constructed custom element must not have attributes" when it
  constructs <dbox-widget> and then sets attributes. Injecting the markup
  via dangerouslySetInnerHTML lets the HTML parser create the element with
  its attributes already in place — that's the upgrade path web components
  are designed for, and it avoids the error.

  Env vars:
  - NEXT_PUBLIC_DONORBOX_EMBED_ID — campaign slug, e.g. "james-juhasz-sailing"
    (also accepts NEXT_PUBLIC_DONORBOX_CAMPAIGN for compatibility)
*/

type Props = {
  amount?: number | null;
  interval?: string | null;
  className?: string;
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function DonorboxEmbed({ amount, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  const campaign =
    process.env.NEXT_PUBLIC_DONORBOX_EMBED_ID ??
    process.env.NEXT_PUBLIC_DONORBOX_CAMPAIGN;

  useEffect(() => {
    if (!ref.current || seen) return;
    const node = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          if (typeof window !== "undefined" && "gtag" in window) {
            const gtag = (window as unknown as { gtag: (...args: unknown[]) => void }).gtag;
            gtag("event", "donorbox_visible", { campaign });
          }
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [campaign, seen]);

  if (!campaign) {
    return <DonorboxFallback />;
  }

  const attrs = [
    `campaign="${escapeAttr(campaign)}"`,
    `type="donation_form"`,
    `enable-auto-scroll="true"`,
    ...(amount ? [`amount="${escapeAttr(String(amount))}"`] : []),
  ].join(" ");

  return (
    <>
      <div
        ref={ref}
        className={cn(
          // Cap at 425px to match Donorbox's own internal max-inline-size on
          // <dbox-widget>. Going wider leaves a white gap on the right because
          // the widget self-aligns left. Right-align within the column on sm+.
          "w-full bg-white shadow-lift sm:max-w-[425px] sm:ml-auto",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: `<dbox-widget ${attrs}></dbox-widget>` }}
      />
      <p className="mt-3 text-caption text-paper/80 sm:max-w-[425px] sm:ml-auto sm:text-right">
        Form not loading?{" "}
        <a
          href={`https://donorbox.org/${encodeURIComponent(campaign)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          Donate directly on Donorbox →
        </a>
      </p>
      <Script
        type="module"
        src="https://donorbox.org/widgets.js"
        strategy="afterInteractive"
      />
    </>
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
