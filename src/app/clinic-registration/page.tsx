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
  /clinic-registration — small revenue stream + community engagement.
  Form posts to /api/clinic-registration (Day 6 wires Resend).
*/

const upcomingClinics = [
  {
    title: "Personalized 3-day clinic",
    location: "Oakville Yacht Squadron, ON",
    date: "Aug 28 – 30, 2026",
    price: 499,
    body: "Three full days on the water plus 1-on-1 goal-setting and debrief sessions.",
  },
  {
    title: "Group performance clinic",
    location: "Buffalo Canoe Club, NY",
    date: "Sep 4 – 6, 2026",
    price: 299,
    body: "Three days with a small group — same on-water content, shared coaching attention.",
  },
];

export default function ClinicRegistrationPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/clinic-registration", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      trackFormSubmitted("clinic-registration");
      router.push("/thank-you?from=clinic-registration");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="default">
          <Badge tone="navy">Coaching</Badge>
          <h1 className="mt-4 font-serif text-display text-navy max-w-[18ch]">
            High-performance clinics with James.
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-ink/80">
            Learn 1-on-1 from a national-team ILCA 7 sailor. Goal-setting,
            on-water coaching, video review, and a debrief that actually moves
            your sailing forward.
          </p>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="default">
          <SectionHeader
            eyebrow="Upcoming clinics"
            title="Pick your dates"
          />
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {upcomingClinics.map((c) => (
              <Card key={c.title} className="flex flex-col gap-3">
                <p className="text-eyebrow uppercase tracking-wider text-mist">
                  {c.date} · {c.location}
                </p>
                <h3 className="font-serif text-h3 text-navy">{c.title}</h3>
                <p className="text-body text-ink/75">{c.body}</p>
                <p className="mt-auto text-h3 font-serif text-navy">
                  ${c.price} CAD
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="default">
          <Card>
            <h2 className="font-serif text-h2 text-navy">Register</h2>
            <p className="mt-2 text-body text-ink/75 max-w-prose">
              Tell me a bit about you and I'll follow up within 24 hours with
              payment + scheduling details.
            </p>
            <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Age" name="age" type="number" />
                <SelectField
                  label="Sailing experience"
                  name="experience"
                  options={["Beginner", "Intermediate", "Advanced", "Pro"]}
                  required
                />
              </div>
              <SelectField
                label="Which clinic"
                name="clinic"
                options={upcomingClinics.map((c) => `${c.title} — ${c.date}`)}
                required
              />
              <Field label="Notes (optional)" name="notes" as="textarea" />
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
                  Something went wrong. Try again or email directly.
                </p>
              ) : null}
              <Button
                variant="primary"
                size="lg"
                disabled={state === "submitting"}
              >
                {state === "submitting" ? "Sending..." : "Register"}
              </Button>
            </form>
          </Card>
        </Container>
      </section>

      <DonateCTAInline
        location="clinic_inline"
        headline="Not coaching season?"
        body="Help me train year-round so the clinics keep getting better."
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
      <span className="text-caption text-mist uppercase tracking-wider">
        {label}
        {required ? <span className="text-donate"> *</span> : null}
      </span>
      {as === "textarea" ? (
        <textarea
          name={name}
          rows={3}
          required={required}
          className="rounded-xl bg-foam-deep ring-1 ring-line px-4 py-3 text-body text-ink resize-none focus:outline-none focus:ring-navy/60"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="rounded-pill bg-foam-deep ring-1 ring-line px-4 py-3 text-body text-ink focus:outline-none focus:ring-navy/60"
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required = false,
}: {
  label: string;
  name: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption text-mist uppercase tracking-wider">
        {label}
        {required ? <span className="text-donate"> *</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="rounded-pill bg-foam-deep ring-1 ring-line px-4 py-3 text-body text-ink focus:outline-none focus:ring-navy/60"
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
