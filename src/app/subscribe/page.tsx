"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { trackSubscribeSubmitted, trackFormSubmitted } from "@/lib/gtag";

export default function SubscribePage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      trackSubscribeSubmitted("page");
      trackFormSubmitted("subscribe");
      router.push("/thank-you?from=subscribe");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/dsc_1246.jpg"
          alt="Open horizon"
          priority
          amount={0.1}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="narrow" className="pt-section-y pb-section-y">
          <Badge>Newsletter</Badge>
          <h1 className="mt-4 font-display text-display text-paper">
            Get the campaign updates.
          </h1>
          <p className="mt-6 text-body-lg text-paper/85 max-w-prose">
            Monthly newsletter, first week of each month — race recaps,
            training notes, what&apos;s working, what isn&apos;t. No spam, ever.
          </p>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="narrow">
          <Card>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-ink-3 uppercase tracking-wider">
                  Email <span className="text-red">*</span>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="rounded-pill bg-fog ring-1 ring-mist px-4 py-3 text-body text-ink focus:outline-none focus:ring-ink/60"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-ink-3 uppercase tracking-wider">
                  Name (optional)
                </span>
                <input
                  type="text"
                  name="name"
                  className="rounded-pill bg-fog ring-1 ring-mist px-4 py-3 text-body text-ink focus:outline-none focus:ring-ink/60"
                />
              </label>
              {/* Honeypot */}
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                className="absolute opacity-0 pointer-events-none -z-10 h-0 w-0"
                aria-hidden
              />
              {state === "error" ? (
                <p className="text-caption text-red">
                  Something went wrong. Try again in a moment.
                </p>
              ) : null}
              <Button
                variant="primary"
                size="lg"
                disabled={state === "submitting"}
              >
                {state === "submitting" ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </Card>
        </Container>
      </section>

      <DonateCTAInline
        location="subscribe_inline"
        headline="Want to do more than read?"
        body="Become a monthly supporter and the newsletter is just the start."
      />
    </>
  );
}
