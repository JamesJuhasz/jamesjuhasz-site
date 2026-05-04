"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";

type InlineProps = {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  location?: string;
  className?: string;
};

export function DonateCTAInline({
  headline = "Help me get to LA 2028.",
  body = "Every dollar funds another day on the water — coaching, travel, regatta entries. Recurring monthly support makes the biggest difference.",
  ctaLabel = "Support the campaign",
  location = "inline",
  className,
}: InlineProps) {
  return (
    <section className={cn("py-section-y", className)}>
      <Container width="default">
        <div className="rounded-3xl bg-ink text-paper shadow-lift overflow-hidden">
          <div className="grid md:grid-cols-12 gap-8 items-center p-8 md:p-12">
            <div className="md:col-span-8">
              <p className="text-eyebrow uppercase tracking-wider text-red mb-3">
                Join the campaign
              </p>
              <h3 className="font-display text-h2 leading-tight text-paper">
                {headline}
              </h3>
              <p className="mt-4 text-body-lg text-paper/80 max-w-prose">
                {body}
              </p>
            </div>
            <div className="md:col-span-4 flex md:justify-end">
              <Button
                href={SITE.donate.href}
                variant="donate"
                size="lg"
                data-cta-location={location}
              >
                {ctaLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

type SidebarProps = {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  location?: string;
  className?: string;
};

export function DonateCTASidebar({
  headline = "Like this story?",
  body = "Help fund the next chapter.",
  ctaLabel = "Donate",
  location = "sidebar",
  className,
}: SidebarProps) {
  return (
    <Card tone="navy" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2 text-red">
        <Heart size={16} aria-hidden />
        <p className="text-eyebrow uppercase tracking-wider">Campaign</p>
      </div>
      <h4 className="font-display text-h3 text-paper">{headline}</h4>
      <p className="text-body text-paper/80">{body}</p>
      <Button
        href={SITE.donate.href}
        variant="donate"
        size="md"
        className="mt-2 w-full"
        data-cta-location={location}
      >
        {ctaLabel}
      </Button>
    </Card>
  );
}

export function FloatingDonateCTA() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? scrolled / max : 0;
      setVisible(pct > 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Redundant on the donate flow itself — hide on /donate and /thank-you.
  if (pathname === "/donate" || pathname === "/thank-you") return null;

  return (
    <div
      className={cn(
        "lg:hidden fixed right-4 bottom-4 z-30 transition-all duration-300",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <Button
        href={SITE.donate.href}
        variant="donate"
        size="md"
        className="shadow-lift"
        data-cta-location="floating_mobile"
      >
        <Heart size={16} aria-hidden />
        Donate
      </Button>
    </div>
  );
}
