"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignInForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Wrong password." : "Sign-in failed.");
        return;
      }
      router.push(next && next.startsWith("/") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-caption uppercase tracking-wider text-ink/60">
          Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
          className="border border-ink/20 bg-paper px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>
      {error ? (
        <p className="text-body-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting || password.length === 0}
        className="bg-ink text-paper px-6 py-3 text-button uppercase tracking-wider disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
