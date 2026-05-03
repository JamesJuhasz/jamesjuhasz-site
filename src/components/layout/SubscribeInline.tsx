"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { trackSubscribeSubmitted } from "@/lib/gtag";

export function SubscribeInline() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "ok" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setState("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      trackSubscribeSubmitted("footer");
      setState("ok");
      setEmail("");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-pill bg-foam/10 ring-1 ring-foam/25 focus-within:ring-foam/60 transition">
        <input
          type="email"
          name="email"
          required
          aria-label="Email address"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-transparent px-5 py-3 text-body text-foam placeholder:text-foam/40 outline-none"
          disabled={state === "submitting" || state === "ok"}
        />
        <button
          type="submit"
          aria-label="Subscribe"
          disabled={state === "submitting" || state === "ok"}
          className={cn(
            "mr-1 inline-flex h-10 w-10 items-center justify-center rounded-pill bg-foam text-navy hover:bg-sand transition-colors disabled:opacity-60",
          )}
        >
          {state === "ok" ? <Check size={18} /> : <ArrowRight size={18} />}
        </button>
      </div>
      {state === "ok" ? (
        <p className="text-caption text-foam/80">
          Thanks — you're on the list.
        </p>
      ) : state === "error" ? (
        <p className="text-caption text-donate">
          Something went wrong. Try again in a moment.
        </p>
      ) : null}
    </form>
  );
}
