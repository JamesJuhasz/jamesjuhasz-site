"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
  context?: string | null;
  coverImageUrl?: string | null;
  lastAnnouncedAt?: string | null;
  photos?: PhotoItem[];
};

export function GalleryForm({ initial }: { initial?: GalleryInitial }) {
  const router = useRouter();
  const isNew = !initial?.id;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [dateRange, setDateRange] = useState(initial?.dateRange ?? "");
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNew || !title) return;
    setSlug((prev) =>
      prev
        ? prev
        : title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .slice(0, 96),
    );
  }, [title, isNew]);

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
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
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        dateRange: dateRange.trim(),
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

  async function sendAnnouncement(mode: "test" | "all") {
    if (!initial?.id) return;
    setSendNote(null);
    setError(null);
    if (mode === "all") {
      const ok = confirm(
        `Send a "${title} — new photos" announcement to ALL subscribers? This cannot be undone.`,
      );
      if (!ok) return;
    }
    setBusy(mode === "test" ? "sending-test" : "sending-all");
    try {
      const res = await fetch(`/api/admin/galleries/${initial.id}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        broadcastId?: string;
        lastAnnouncedAt?: string | null;
      };
      if (!data.ok) {
        setError(data.error ?? "send failed");
        return;
      }
      if (mode === "test") {
        setSendNote("Test sent — check your inbox.");
      } else {
        setSendNote(
          `Broadcast sent${data.broadcastId ? ` (id ${data.broadcastId.slice(0, 8)}…)` : ""}.`,
        );
        if (data.lastAnnouncedAt) setLastAnnouncedAt(data.lastAnnouncedAt);
      }
    } catch (err) {
      setError((err as Error).message);
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
          <input
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={inputCls}
            placeholder="Mar – May 2026"
          />
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
            disabled={Boolean(busy) || !title || !dateRange}
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
            onChange={(e) => setSlug(e.target.value)}
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
                onClick={() => sendAnnouncement("test")}
                className="border border-ink px-3 py-2 text-button uppercase tracking-wider disabled:opacity-50"
              >
                {busy === "sending-test" ? "Sending…" : "Send test to me"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => sendAnnouncement("all")}
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
