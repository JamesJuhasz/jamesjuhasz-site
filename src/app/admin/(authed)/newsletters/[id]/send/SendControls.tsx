"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SendControls({
  postId,
  alreadySent,
  title,
}: {
  postId: number;
  alreadySent: boolean;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "test" | "all">("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(mode: "test" | "all") {
    if (mode === "all") {
      const ok = window.confirm(
        `Send "${title}" to ALL subscribers? This is one-shot — you can't recall it.`,
      );
      if (!ok) return;
    }
    setBusy(mode);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; id?: string; broadcastId?: string };
      if (!data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      if (mode === "test") {
        setMsg(`Test sent. Check your inbox.${data.id ? ` (id: ${data.id})` : ""}`);
      } else {
        setMsg(`Broadcast queued. Resend id: ${data.broadcastId}`);
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={() => call("test")}
        className="border border-ink px-4 py-3 text-button uppercase tracking-wider disabled:opacity-50"
      >
        {busy === "test" ? "Sending test…" : "Send test to me"}
      </button>
      <button
        type="button"
        disabled={Boolean(busy) || alreadySent}
        onClick={() => call("all")}
        className="bg-ink text-paper px-4 py-3 text-button uppercase tracking-wider disabled:opacity-50"
      >
        {alreadySent
          ? "Already sent"
          : busy === "all"
            ? "Sending…"
            : "Send to all subscribers"}
      </button>
      {msg ? <p className="text-body-sm text-green-700">{msg}</p> : null}
      {error ? <p className="text-body-sm text-red-600">{error}</p> : null}
    </>
  );
}
