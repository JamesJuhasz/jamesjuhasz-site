"use client";

import { useEffect, useRef, useState } from "react";

export function PasswordConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Send",
  busy,
  errorOverride,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  errorOverride?: string | null;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setLocalError(null);
      // focus on next tick so the input is mounted
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!password) {
      setLocalError("Enter your admin password.");
      return;
    }
    onConfirm(password);
  }

  const shownError = errorOverride ?? localError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-paper border border-ink/20 p-6 shadow-lg"
      >
        <h2
          id="pwd-confirm-title"
          className="text-h4 uppercase tracking-wider mb-2"
        >
          {title}
        </h2>
        <p className="text-body-sm text-ink/80 mb-4">{message}</p>
        <label className="block text-caption uppercase tracking-wider text-ink/60 mb-1.5">
          Admin password
        </label>
        <input
          ref={inputRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (localError) setLocalError(null);
          }}
          disabled={busy}
          className="w-full border border-ink/20 bg-paper px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ink"
        />
        {shownError ? (
          <p className="mt-2 text-body-sm text-red-600">{shownError}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="border border-ink px-4 py-2 text-button uppercase tracking-wider disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-ink text-paper px-4 py-2 text-button uppercase tracking-wider disabled:opacity-50"
          >
            {busy ? "Sending…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
