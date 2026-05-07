"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  basePosition: string | null;
  baseTotal: number | null;
  baseFleet: string | null;
  baseExternalUrl: string | null;
  override: {
    position: string | null;
    totalCompetitors: number | null;
    fleet: string | null;
    externalUrl: string | null;
    notes: string | null;
    hidden: boolean;
  } | null;
};

export function ResultsTable({ rows }: { rows: Row[] }) {
  return (
    <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
      {rows.map((r) => (
        <ResultRow key={r.id} row={r} />
      ))}
    </ul>
  );
}

function ResultRow({ row }: { row: Row }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initial = row.override ?? {
    position: null,
    totalCompetitors: null,
    fleet: null,
    externalUrl: null,
    notes: null,
    hidden: false,
  };
  const [position, setPosition] = useState(initial.position ?? "");
  const [total, setTotal] = useState<string>(
    initial.totalCompetitors !== null ? String(initial.totalCompetitors) : "",
  );
  const [fleet, setFleet] = useState(initial.fleet ?? "");
  const [externalUrl, setExternalUrl] = useState(initial.externalUrl ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [hidden, setHidden] = useState(initial.hidden);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          coachaibleId: row.id,
          position: position.trim() || null,
          totalCompetitors: total ? Number(total) : null,
          fleet: fleet.trim() || null,
          externalUrl: externalUrl.trim() || null,
          notes: notes.trim() || null,
          hidden,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "save failed");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clearOverride() {
    if (!confirm("Clear override for this result?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coachaibleId: row.id }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!data.ok) throw new Error("clear failed");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const summary = (
    <>
      <div className="col-span-12 md:col-span-5">
        <p className="font-display text-h4 leading-tight">{row.title}</p>
        <p className="mt-1 text-caption text-ink-3">
          {row.startDate}
          {row.endDate && row.endDate !== row.startDate ? ` → ${row.endDate}` : ""}
        </p>
      </div>
      <div className="col-span-3 md:col-span-2 text-body-sm">
        {row.override?.position ?? row.basePosition ?? "—"}
        {row.override?.position ? (
          <span className="ml-1 text-caption uppercase text-yellow-700">edit</span>
        ) : null}
      </div>
      <div className="col-span-3 md:col-span-2 text-body-sm">
        {row.override?.totalCompetitors ?? row.baseTotal ?? "—"}
      </div>
      <div className="col-span-3 md:col-span-2 text-body-sm">
        {row.override?.fleet ?? row.baseFleet ?? "—"}
      </div>
      <div className="col-span-3 md:col-span-1 text-right">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-caption uppercase tracking-wider text-ink hover:underline"
        >
          {row.override ? "Edit" : "Override"}
        </button>
      </div>
    </>
  );

  return (
    <li
      className={`grid grid-cols-12 items-center gap-4 py-4 ${
        row.override?.hidden ? "opacity-60" : ""
      }`}
    >
      {!editing ? summary : null}

      {editing ? (
        <div className="col-span-12 grid gap-4">
          <p className="font-display text-h4 leading-tight">{row.title}</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Position">
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={row.basePosition ?? ""}
                className={input}
              />
            </Field>
            <Field label="Total competitors">
              <input
                type="number"
                min={1}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder={row.baseTotal !== null ? String(row.baseTotal) : ""}
                className={input}
              />
            </Field>
            <Field label="Fleet">
              <input
                value={fleet}
                onChange={(e) => setFleet(e.target.value)}
                placeholder={row.baseFleet ?? ""}
                className={input}
              />
            </Field>
            <Field label="External URL">
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder={row.baseExternalUrl ?? ""}
                className={input}
              />
            </Field>
            <Field label="Notes (admin-only)" className="md:col-span-2 lg:col-span-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={input}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
            />
            Hide this result from the public /results page
          </label>
          {err ? <p className="text-body-sm text-red-600">{err}</p> : null}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="bg-ink text-paper px-4 py-2 text-button uppercase tracking-wider disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save override"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="border border-ink/30 px-4 py-2 text-button uppercase tracking-wider"
            >
              Cancel
            </button>
            {row.override ? (
              <button
                type="button"
                disabled={busy}
                onClick={clearOverride}
                className="ml-auto text-caption uppercase tracking-wider text-red-700 hover:underline"
              >
                Clear override
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

const input =
  "w-full border border-ink/20 bg-paper px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ink";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-caption uppercase tracking-wider text-ink/60">
        {label}
      </span>
      {children}
    </label>
  );
}
