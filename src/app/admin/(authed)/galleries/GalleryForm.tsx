"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/admin/slug";
import { PasswordConfirmModal } from "../_components/PasswordConfirmModal";

type PhotoItem = {
  id?: number;
  url: string;
  alt?: string | null;
  uploading?: boolean;
  tempKey?: string;
};

export type GalleryInitial = {
  id?: number;
  title?: string;
  slug?: string;
  dateRange?: string;
  startMonth?: string | null;
  endMonth?: string | null;
  context?: string | null;
  coverImageUrl?: string | null;
  lastAnnouncedAt?: string | null;
  photos?: PhotoItem[];
};

const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthInputToDate(month: string): string | null {
  return /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null;
}

function initialMonthFromDate(d?: string | null): string {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})/.exec(d);
  return m ? `${m[1]}-${m[2]}` : "";
}

function rangeLabel(start: string, end: string): string {
  const startOk = /^\d{4}-\d{2}$/.test(start);
  const endOk = /^\d{4}-\d{2}$/.test(end);
  if (!startOk && !endOk) return "";
  if (!startOk || !endOk) {
    const only = (startOk ? start : end).split("-");
    return `${MONTH_FULL[Number(only[1]) - 1]} ${only[0]}`;
  }
  const [sy, sm] = start.split("-");
  const [ey, em] = end.split("-");
  if (sy === ey && sm === em) {
    return `${MONTH_FULL[Number(sm) - 1]} ${sy}`;
  }
  if (sy === ey) {
    return `${MONTH_SHORT[Number(sm) - 1]} – ${MONTH_SHORT[Number(em) - 1]} ${sy}`;
  }
  return `${MONTH_SHORT[Number(sm) - 1]} ${sy} – ${MONTH_SHORT[Number(em) - 1]} ${ey}`;
}

export function GalleryForm({ initial }: { initial?: GalleryInitial }) {
  const router = useRouter();
  const isNew = !initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [startMonth, setStartMonth] = useState(
    initialMonthFromDate(initial?.startMonth),
  );
  const [endMonth, setEndMonth] = useState(
    initialMonthFromDate(initial?.endMonth),
  );
  const [context, setContext] = useState(initial?.context ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(initial?.photos ?? []);
  const [busy, setBusy] = useState<
    "" | "saving" | "deleting" | "sending-test" | "sending-all"
  >("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [lastAnnouncedAt, setLastAnnouncedAt] = useState<string | null>(
    initial?.lastAnnouncedAt ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(Boolean(initial?.slug));

  useEffect(() => {
    if (!isNew) return;
    if (slugTouched.current) return;
    setSlug(slugify(title));
  }, [title, isNew]);

  async function uploadOne(file: File): Promise<string> {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: file,
      headers: { "content-type": file.type || "application/octet-stream" },
    });
    const data = (await res.json()) as {
      ok: boolean;
      url?: string;
      error?: string;
      detail?: string;
      got?: string;
    };
    if (!data.ok || !data.url) {
      const parts = [data.error ?? "upload failed"];
      if (data.detail) parts.push(data.detail);
      if (data.got) parts.push(`(got ${data.got})`);
      throw new Error(parts.join(" — "));
    }
    return data.url;
  }

  async function uploadCover(file: File) {
    setCoverUploading(true);
    try {
      const url = await uploadOne(file);
      setCoverImageUrl(url);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  async function addPhotoFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    // Add placeholders so the UI shows progress.
    const placeholders: PhotoItem[] = arr.map((f) => ({
      url: URL.createObjectURL(f),
      uploading: true,
      tempKey: `${Date.now()}-${Math.random()}-${f.name}`,
    }));
    setPhotos((prev) => [...prev, ...placeholders]);

    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      const tempKey = placeholders[i].tempKey;
      try {
        const url = await uploadOne(f);
        setPhotos((prev) =>
          prev.map((p) =>
            p.tempKey === tempKey ? { url, uploading: false } : p,
          ),
        );
      } catch (err) {
        setPhotos((prev) => prev.filter((p) => p.tempKey !== tempKey));
        alert((err as Error).message);
      }
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    setPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function setAlt(index: number, alt: string) {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, alt } : p)),
    );
  }

  function setAsCover(url: string) {
    setCoverImageUrl(url);
  }

  async function save() {
    if (photos.some((p) => p.uploading)) {
      alert("Wait for uploads to finish");
      return;
    }
    setError(null);
    setBusy("saving");
    try {
      const dateRange = rangeLabel(startMonth, endMonth);
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        dateRange,
        startMonth: monthInputToDate(startMonth),
        endMonth: monthInputToDate(endMonth) ?? monthInputToDate(startMonth),
        context: context.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        ...(isNew
          ? {}
          : {
              photos: photos.map((p) => ({ url: p.url, alt: p.alt ?? null })),
            }),
      };
      const url = isNew
        ? "/api/admin/galleries"
        : `/api/admin/galleries/${initial!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok: boolean;
        gallery?: { id: number };
        error?: string;
        details?: unknown;
      };
      if (!data.ok) {
        setError(
          `${data.error}${data.details ? ` — ${JSON.stringify(data.details)}` : ""}`,
        );
        return;
      }
      const id = data.gallery?.id ?? initial?.id;
      router.push(`/admin/galleries/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function sendTestAnnouncement() {
    if (!initial?.id) return;
    setSendNote(null);
    setError(null);
    setBusy("sending-test");
    try {
      const res = await fetch(`/api/admin/galleries/${initial.id}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "test" }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "send failed");
        return;
      }
      setSendNote("Test sent — check your inbox.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function sendAllAnnouncement(password: string) {
    if (!initial?.id) return;
    setSendNote(null);
    setError(null);
    setConfirmError(null);
    setBusy("sending-all");
    try {
      const res = await fetch(`/api/admin/galleries/${initial.id}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "all", password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        broadcastId?: string;
        lastAnnouncedAt?: string | null;
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
        setError(data.error ?? "send failed");
        setConfirmOpen(false);
        return;
      }
      setSendNote(
        `Broadcast sent${data.broadcastId ? ` (id ${data.broadcastId.slice(0, 8)}…)` : ""}.`,
      );
      if (data.lastAnnouncedAt) setLastAnnouncedAt(data.lastAnnouncedAt);
      setConfirmOpen(false);
    } catch (err) {
      setError((err as Error).message);
      setConfirmOpen(false);
    } finally {
      setBusy("");
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (
      !confirm(
        "Delete this gallery? Photos remain on disk but the gallery and its photo metadata are removed.",
      )
    )
      return;
    setBusy("deleting");
    try {
      const res = await fetch(`/api/admin/galleries/${initial.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "delete failed");
      router.push("/admin/galleries");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div>
          <Label>Title</Label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
            placeholder="e.g. Spring 2026"
          />
        </div>
        <div>
          <Label>Date range</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-caption text-ink/60 mb-1">From</span>
              <input
                type="month"
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <span className="block text-caption text-ink/60 mb-1">To</span>
              <input
                type="month"
                value={endMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {startMonth || endMonth ? (
            <p className="mt-1 text-caption text-ink/50">
              Displays as “{rangeLabel(startMonth, endMonth)}”. Galleries are
              sorted by the most recent month in the range.
            </p>
          ) : (
            <p className="mt-1 text-caption text-ink/50">
              Pick the start and end month. Leave “To” blank for a single
              month.
            </p>
          )}
        </div>
        <div>
          <Label>Subtitle (context)</Label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className={`${inputCls} min-h-[5rem]`}
            placeholder="One-sentence description shown on the gallery card and detail page."
            maxLength={600}
          />
        </div>

        {!isNew ? (
          <div>
            <Label>Photos ({photos.length})</Label>
            <div
              className="border-2 border-dashed border-ink/20 p-4 text-center text-body-sm text-ink-3 cursor-pointer hover:border-ink/40"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) {
                  addPhotoFiles(e.dataTransfer.files);
                }
              }}
            >
              Drop photos here or click to choose. Multi-select supported.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) addPhotoFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {photos.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((p, i) => (
                  <li
                    key={`${p.id ?? p.tempKey ?? p.url}-${i}`}
                    draggable={!p.uploading}
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== i) {
                        move(dragIndex, i);
                      }
                      setDragIndex(null);
                    }}
                    className={`relative border ${dragIndex === i ? "border-ink" : "border-ink/10"} p-1.5 ${p.uploading ? "opacity-60" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={p.alt ?? ""}
                      className="w-full aspect-[4/3] object-cover"
                    />
                    {p.uploading ? (
                      <p className="absolute inset-0 flex items-center justify-center text-caption uppercase tracking-wider text-paper bg-ink/40">
                        Uploading…
                      </p>
                    ) : null}
                    <input
                      value={p.alt ?? ""}
                      onChange={(e) => setAlt(i, e.target.value)}
                      placeholder="Alt text"
                      className="mt-1.5 w-full border border-ink/15 px-2 py-1 text-caption"
                    />
                    <div className="mt-1 flex flex-wrap gap-1.5 text-caption">
                      <button
                        type="button"
                        onClick={() => move(i, i - 1)}
                        disabled={i === 0 || p.uploading}
                        className="text-ink/60 hover:text-ink disabled:opacity-30"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, i + 1)}
                        disabled={i === photos.length - 1 || p.uploading}
                        className="text-ink/60 hover:text-ink disabled:opacity-30"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => setAsCover(p.url)}
                        disabled={p.uploading}
                        className="ml-auto text-ink/60 hover:text-ink uppercase tracking-wider"
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        disabled={p.uploading}
                        className="text-red-600 hover:text-red-800 uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-body-sm text-ink-3">
            Save the gallery first, then upload photos on the edit page.
          </p>
        )}

        {error ? (
          <p role="alert" className="text-body-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={Boolean(busy) || !title || !startMonth}
            onClick={save}
            className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "saving"
              ? "Saving…"
              : isNew
                ? "Create gallery"
                : "Save changes"}
          </button>
          {!isNew ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onDelete}
              className="ml-auto border border-red-600 px-5 py-3 text-button uppercase tracking-wider text-red-700 disabled:opacity-50"
            >
              {busy === "deleting" ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>
      </div>

      <aside className="flex flex-col gap-5 border border-ink/10 p-5 lg:sticky lg:top-6 self-start">
        <div>
          <Label>Slug</Label>
          <input
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(e.target.value);
            }}
            className={inputCls}
            placeholder="auto-from-title"
          />
          <p className="mt-1 text-caption text-ink/50">/gallery/{slug || "…"}</p>
        </div>
        <div>
          <Label>Cover image</Label>
          {coverImageUrl ? (
            <div className="border border-ink/10 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImageUrl} alt="" className="w-full" />
              <button
                type="button"
                onClick={() => setCoverImageUrl("")}
                className="mt-2 text-caption uppercase tracking-wider text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              disabled={coverUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCover(f);
                e.target.value = "";
              }}
              className="text-body-sm"
            />
          )}
          <p className="mt-2 text-caption text-ink/50">
            Falls back to first photo if blank.
          </p>
        </div>
        {!isNew ? (
          <div className="border-t border-ink/10 pt-5">
            <Label>Announce update</Label>
            <p className="text-caption text-ink/60 mb-3">
              Email subscribers that this gallery has new photos. Includes
              cover, subtitle, and a link back to the gallery.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => sendTestAnnouncement()}
                className="border border-ink px-3 py-2 text-button uppercase tracking-wider disabled:opacity-50"
              >
                {busy === "sending-test" ? "Sending…" : "Send test to me"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  setConfirmError(null);
                  setConfirmOpen(true);
                }}
                className="bg-ink text-paper px-3 py-2 text-button uppercase tracking-wider disabled:opacity-50"
              >
                {busy === "sending-all"
                  ? "Sending…"
                  : "Send to all subscribers"}
              </button>
            </div>
            {sendNote ? (
              <p className="mt-2 text-caption text-ink/70">{sendNote}</p>
            ) : null}
            <p className="mt-3 text-caption text-ink/50">
              {lastAnnouncedAt
                ? `Last sent ${new Date(lastAnnouncedAt).toLocaleString()}`
                : "Never sent."}
            </p>
          </div>
        ) : null}
      </aside>
      <PasswordConfirmModal
        open={confirmOpen}
        title="Confirm broadcast"
        message={`Send a "${title} — new photos" announcement to ALL subscribers? This cannot be undone. Enter your admin password to confirm.`}
        confirmLabel="Send to all"
        busy={busy === "sending-all"}
        errorOverride={confirmError}
        onCancel={() => {
          if (busy === "sending-all") return;
          setConfirmOpen(false);
          setConfirmError(null);
        }}
        onConfirm={(pwd) => void sendAllAnnouncement(pwd)}
      />
    </div>
  );
}

const inputCls =
  "w-full border border-ink/20 bg-paper px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-ink";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-caption uppercase tracking-wider text-ink/60 mb-1.5">
      {children}
    </span>
  );
}
