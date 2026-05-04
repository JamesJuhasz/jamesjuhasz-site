"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { trackFormSubmitted } from "@/lib/gtag";

/*
  /name-my-boat — community engagement + soft conversion.
  Form posts to /api/name-my-boat (Day 6 wires Resend).
  Submitters become newsletter subscribers if opt-in checked.
*/

const submittedNames = [
  "Lake Effect",
  "Foam Layer",
  "True North",
  "Marsamxett",
  "The Long Way",
  "Fast Lane",
  "Light Air",
  "Steady Wins",
];

export default function NameMyBoatPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/name-my-boat", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Submission failed");
      trackFormSubmitted("name-my-boat");
      router.push("/thank-you?from=name-my-boat");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="default">
          <Badge tone="sand">Community</Badge>
          <h1 className="mt-4 font-display text-display text-ink max-w-[18ch]">
            Help name James' boat.
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-ink/80">
            Every time I get a new hull, monthly contributors are entered into a
            draw to name the boat. Every $1 over $10/month counts as an extra
            entry — and every contributor's name goes on the hull, monthly or
            one-time.
          </p>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="default">
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <h2 className="font-display text-h2 text-ink">How it works</h2>
              <ul className="mt-6 grid gap-4">
                {[
                  "All monthly contributors are entered into the draw.",
                  "Every $1 over $10/month = 1 extra entry. ($20 = 11 entries.)",
                  "One-time contributors get their name on the hull too.",
                  "Winner drawn at random before the new boat is first sailed.",
                  "Names need to be appropriate for racing — no inside jokes only the launch crew will get.",
                ].map((line) => (
                  <li
                    key={line}
                    className="grid grid-cols-[2rem_1fr] gap-3 items-start"
                  >
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-pill bg-ink text-paper text-caption"
                    >
                      ✓
                    </span>
                    <span className="text-body-lg text-ink/80">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-5">
              <Card>
                <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-2">
                  Suggest a name
                </p>
                <form className="flex flex-col gap-3" onSubmit={onSubmit}>
                  <Field label="Your name" name="name" required />
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Suggested boat name" name="suggestedName" required />
                  <Field
                    label="Why this name? (optional)"
                    name="reason"
                    as="textarea"
                  />
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    className="absolute opacity-0 pointer-events-none -z-10 h-0 w-0"
                    aria-hidden
                  />
                  <label className="flex items-center gap-2 text-caption text-ink-3">
                    <input
                      type="checkbox"
                      name="subscribe"
                      defaultChecked
                      className="h-4 w-4 rounded border-mist"
                    />
                    Send me campaign updates by email
                  </label>
                  {state === "error" ? (
                    <p className="text-caption text-red">
                      Something went wrong. Try again or email directly.
                    </p>
                  ) : null}
                  <Button
                    variant="donate"
                    size="md"
                    className="mt-2"
                    disabled={state === "submitting"}
                  >
                    {state === "submitting" ? "Submitting..." : "Suggest a name"}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-section-y bg-fog border-y border-mist">
        <Container width="default">
          <SectionHeader
            eyebrow="In the running"
            title="Names already submitted"
            lede="A taste of what's been suggested. Real submissions feed in via Sanity (Day 5)."
          />
          <ul className="mt-8 flex flex-wrap gap-2">
            {submittedNames.map((name) => (
              <li
                key={name}
                className="rounded-pill bg-paper ring-1 ring-mist px-4 py-2 text-body text-ink font-display"
              >
                {name}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <DonateCTAInline
        location="name_my_boat_inline"
        headline="Your name on the hull."
        body="Every contributor gets their name written on the boat. Become a monthly supporter and you're also in the draw to name it."
        ctaLabel="Become a supporter"
      />
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  as = "input",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  as?: "input" | "textarea";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption text-ink-3 uppercase tracking-wider">
        {label}
        {required ? <span className="text-red"> *</span> : null}
      </span>
      {as === "textarea" ? (
        <textarea
          name={name}
          rows={3}
          required={required}
          className="rounded-xl bg-fog ring-1 ring-mist px-4 py-3 text-body text-ink resize-none focus:outline-none focus:ring-ink/60"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="rounded-pill bg-fog ring-1 ring-mist px-4 py-3 text-body text-ink focus:outline-none focus:ring-ink/60"
        />
      )}
    </label>
  );
}
