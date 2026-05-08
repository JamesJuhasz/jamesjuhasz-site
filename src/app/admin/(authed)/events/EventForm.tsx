"use client";

import { useEffect, useRef, useState } from "react";
import { slugify } from "@/lib/admin/slug";
import { proxyImageUrl } from "@/lib/img-proxy";
import { useRouter } from "next/navigation";
import { Editor, type EditorValue } from "../newsletters/Editor";

export type EventInitial = {
  id?: number;
  title?: string;
  slug?: string;
  eventDate?: string; // YYYY-MM-DD
  endDate?: string | null;
  location?: string;
  category?: "Regatta" | "Training" | "Coaching";
  resultPosition?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  bodyHtml?: string | null;
  bodyJson?: unknown;
  upcoming?: boolean;
};

export function EventForm({ initial }: { initial?: EventInitial }) {
  const router = useRouter();
  const isNew = !initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [category, setCategory] = useState<"Regatta" | "Training" | "Coaching">(
    initial?.category ?? "Regatta",
  );
  const [resultPosition, setResultPosition] = useState(initial?.resultPosition ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [coverImageAlt, setCoverImageAlt] = useState(initial?.coverImageAlt ?? "");
  const [upcoming, setUpcoming] = useState(initial?.upcoming ?? false);
  const [body, setBody] = useState<EditorValue>({
    html: initial?.bodyHtml ?? "",
    json: initial?.bodyJson ?? null,
  });
  const [busy, setBusy] = useState<"" | "saving" | "deleting">("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slugTouched = useRef(Boolean(initial?.slug));

  useEffect(() => {
    if (!isNew) return;
    if (slugTouched.current) return;
    setSlug(slugify(title));
  }, [title, isNew]);

  async function uploadCover(file: File) {
    setCoverUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) throw new Error(data.error ?? "upload failed");
      setCoverImageUrl(data.url);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCoverUploading(false);
    }
  }

  async function save() {
    setError(null);
    setBusy("saving");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        eventDate,
        endDate: endDate || null,
        location: location.trim(),
        category,
        resultPosition: resultPosition.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        coverImageAlt: coverImageAlt.trim() || null,
        bodyHtml: body.html,
        bodyJson: body.json,
        upcoming,
      };
      const url = isNew ? "/api/admin/events" : `/api/admin/events/${initial!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok: boolean;
        event?: { id: number };
        error?: string;
        details?: unknown;
      };
      if (!data.ok) {
        setError(`${data.error}${data.details ? ` — ${JSON.stringify(data.details)}` : ""}`);
        return;
      }
      const id = data.event?.id ?? initial?.id;
      router.push(`/admin/events/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setBusy("deleting");
    try {
      const res = await fetch(`/api/admin/events/${initial.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "delete failed");
      router.push("/admin/events");
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
            placeholder="Event title"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Start date</Label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <Label>End date (optional)</Label>
            <input
              type="date"
              value={endDate ?? ""}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <Label>Location</Label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputCls}
            placeholder="City, Country"
          />
        </div>

        <div>
          <Label>Body (optional)</Label>
          <Editor
            initialHtml={initial?.bodyHtml}
            initialJson={initial?.bodyJson}
            onChange={setBody}
          />
        </div>

        {error ? (
          <p role="alert" className="text-body-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={Boolean(busy) || !title || !eventDate || !location}
            onClick={save}
            className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "saving" ? "Saving…" : isNew ? "Create event" : "Save changes"}
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
        </div>
        <div>
          <Label>Category</Label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as "Regatta" | "Training" | "Coaching")
            }
            className={inputCls}
          >
            <option>Regatta</option>
            <option>Training</option>
            <option>Coaching</option>
          </select>
        </div>
        <div>
          <Label>Result (optional)</Label>
          <input
            value={resultPosition ?? ""}
            onChange={(e) => setResultPosition(e.target.value)}
            className={inputCls}
            placeholder="e.g. 12th"
          />
        </div>
        <div>
          <Label>Cover image</Label>
          {coverImageUrl ? (
            <div className="border border-ink/10 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxyImageUrl(coverImageUrl, 1200)} alt={coverImageAlt ?? ""} className="w-full" />
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
          <input
            value={coverImageAlt ?? ""}
            onChange={(e) => setCoverImageAlt(e.target.value)}
            className={`${inputCls} mt-2`}
            placeholder="Alt text"
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={upcoming}
            onChange={(e) => setUpcoming(e.target.checked)}
          />
          Mark as upcoming
        </label>
      </aside>
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
