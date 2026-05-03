"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DonateCTAInline } from "@/components/cta/DonateCTA";

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
      router.push("/thank-you?from=subscribe");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="narrow">
          <Badge>Newsletter</Badge>
          <h1 className="mt-4 font-serif text-display text-navy">
            Get the campaign updates.
          </h1>
          <p className="mt-6 text-body-lg text-ink/80 max-w-prose">
            Monthly newsletter, first week of each month — race recaps,
            training notes, what's working, what isn't. No spam, ever.
          </p>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="narrow">
          <Card>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-mist uppercase tracking-wider">
                  Email <span className="text-donate">*</span>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  className="rounded-pill bg-foam-deep ring-1 ring-line px-4 py-3 text-body text-ink focus:outline-none focus:ring-navy/60"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-caption text-mist uppercase tracking-wider">
                  Name (optional)
                </span>
                <input
                  type="text"
                  name="name"
                  className="rounded-pill bg-foam-deep ring-1 ring-line px-4 py-3 text-body text-ink focus:outline-none focus:ring-navy/60"
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
                <p className="text-caption text-donate">
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
