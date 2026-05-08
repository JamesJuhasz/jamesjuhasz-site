"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordConfirmModal } from "../../../_components/PasswordConfirmModal";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function sendTest() {
    setBusy("test");
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "test" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; id?: string };
      if (!data.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMsg(`Test sent. Check your inbox.${data.id ? ` (id: ${data.id})` : ""}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function sendAll(password: string) {
    setBusy("all");
    setMsg(null);
    setError(null);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "all", password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        broadcastId?: string;
      };
      if (!data.ok) {
        if (data.error === "wrong_password" || data.error === "password_required") {
          setConfirmError("Wrong password.");
          return;
        }
        if (data.error === "rate_limited") {
          setConfirmError("Too many attempts. Wait a few minutes.");
          return;
        }
        setError(data.error ?? `HTTP ${res.status}`);
        setConfirmOpen(false);
        return;
      }
      setMsg(`Broadcast queued. Resend id: ${data.broadcastId}`);
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setConfirmOpen(false);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={Boolean(busy)}
        onClick={sendTest}
        className="border border-ink px-4 py-3 text-button uppercase tracking-wider disabled:opacity-50"
      >
        {busy === "test" ? "Sending test…" : "Send test to me"}
      </button>
      <button
        type="button"
        disabled={Boolean(busy) || alreadySent}
        onClick={() => {
          setConfirmError(null);
          setConfirmOpen(true);
        }}
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
      <PasswordConfirmModal
        open={confirmOpen}
        title="Confirm broadcast"
        message={`Send "${title}" to ALL subscribers? This is one-shot — you can't recall it. Enter your admin password to confirm.`}
        confirmLabel="Send to all"
        busy={busy === "all"}
        errorOverride={confirmError}
        onCancel={() => {
          if (busy === "all") return;
          setConfirmOpen(false);
          setConfirmError(null);
        }}
        onConfirm={(pwd) => void sendAll(pwd)}
      />
    </>
  );
}
