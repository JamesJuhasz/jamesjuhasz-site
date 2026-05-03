"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { trackFormSubmitted } from "@/lib/gtag";

export default function ContactPage() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(data)),
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 429) {
        setState("error");
        setErrorMsg("Too many submissions — try again in an hour.");
        return;
      }
      if (!res.ok) throw new Error();
      trackFormSubmitted("contact");
      router.push("/thank-you?from=contact");
    } catch {
      setState("error");
      setErrorMsg("Something went wrong. Try again or email directly.");
    }
  }

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="narrow">
          <Badge>Contact</Badge>
          <h1 className="mt-4 font-serif text-display text-navy">
            Get in touch.
          </h1>
          <p className="mt-6 text-body-lg text-ink/80 max-w-prose">
            Press inquiries, sponsorship conversations, training questions —
            send a note and I'll respond within a few days. Often within 48
            hours.
          </p>
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="narrow">
          <Card>
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
              </div>
              <Field label="Subject" name="subject" required />
              <Field label="Message" name="message" as="textarea" required />
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
                <p className="text-caption text-donate">{errorMsg}</p>
              ) : null}
              <Button
                variant="primary"
                size="lg"
                disabled={state === "submitting"}
              >
                {state === "submitting" ? "Sending..." : "Send message"}
              </Button>
            </form>
          </Card>
        </Container>
      </section>
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
          rows={5}
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
