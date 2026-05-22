"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Editor, type EditorValue } from "./Editor";
import { slugify } from "@/lib/admin/slug";
import { proxyImageUrl } from "@/lib/img-proxy";
import { prepareForUpload } from "@/lib/admin/upload-client";

export type PostInitial = {
  id?: number;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  bodyHtml?: string | null;
  bodyJson?: unknown;
  tags?: string[] | null;
  featured?: boolean;
  emailSubject?: string | null;
  publishedAt?: string | null;
};

export function PostForm({ initial }: { initial?: PostInitial }) {
  const router = useRouter();
  const isNew = !initial?.id;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [coverImageAlt, setCoverImageAlt] = useState(initial?.coverImageAlt ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [emailSubject, setEmailSubject] = useState(initial?.emailSubject ?? "");
  const [publishedAt, setPublishedAt] = useState(
    initial?.publishedAt
      ? new Date(initial.publishedAt).toISOString().slice(0, 16)
      : "",
  );
  const [body, setBody] = useState<EditorValue>({
    html: initial?.bodyHtml ?? "",
    json: initial?.bodyJson ?? null,
  });
  const [busy, setBusy] = useState<"" | "saving" | "publishing" | "deleting" | "testing">("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auto-track whether the user has manually edited the slug. While untouched,
  // the slug stays in sync with the title; once the user edits it, we leave
  // their value alone.
  const slugTouched = useRef(Boolean(initial?.slug));

  useEffect(() => {
    if (!isNew) return;
    if (slugTouched.current) return;
    setSlug(slugify(title));
  }, [title, isNew]);

  async function uploadCover(file: File) {
    setCoverUploading(true);
    try {
      const prepared = await prepareForUpload(file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: prepared,
        headers: { "content-type": prepared.type || "application/octet-stream" },
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

  async function save(args: { publish?: boolean; navigate?: boolean }) {
    const navigate = args.navigate ?? true;
    setError(null);
    if (navigate) setBusy(args.publish ? "publishing" : "saving");
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        coverImageAlt: coverImageAlt.trim() || null,
        bodyHtml: body.html,
        bodyJson: body.json,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        featured,
        emailSubject: emailSubject.trim() || null,
        publishedAt: args.publish
          ? new Date().toISOString()
          : publishedAt
            ? new Date(publishedAt).toISOString()
            : null,
      };

      const url = isNew ? "/api/admin/posts" : `/api/admin/posts/${initial!.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok: boolean;
        post?: { id: number };
        error?: string;
        details?: unknown;
      };
      if (!data.ok) {
        setError(`${data.error}${data.details ? ` — ${JSON.stringify(data.details)}` : ""}`);
        return;
      }
      const id = data.post?.id ?? initial?.id;
      if (navigate) {
        router.push(`/admin/newsletters/${id}`);
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      if (navigate) setBusy("");
    }
  }

  async function onSendTest() {
    if (!initial?.id) {
      setTestMsg("Save the newsletter first, then you can send a test.");
      return;
    }
    setBusy("testing");
    setTestMsg(null);
    setError(null);
    try {
      // Save current edits first so the test reflects what's on screen.
      await save({ publish: false, navigate: false });
      const res = await fetch(`/api/admin/posts/${initial.id}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "test" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setTestMsg("Test sent — check your inbox.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function onDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this newsletter? This cannot be undone.")) return;
    setBusy("deleting");
    try {
      const res = await fetch(`/api/admin/posts/${initial.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "delete failed");
      router.push("/admin/newsletters");
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
            placeholder="Headline shown on the post"
          />
        </div>

        <div>
          <Label>Body</Label>
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
        {testMsg ? (
          <p className="text-body-sm text-green-700">{testMsg}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={Boolean(busy) || !title}
            onClick={() => save({ publish: false })}
            className="border border-ink px-5 py-3 text-button uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "saving" ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || !title}
            onClick={() => save({ publish: true })}
            className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider disabled:opacity-50"
          >
            {busy === "publishing" ? "Publishing…" : "Publish now"}
          </button>
          {!isNew ? (
            <button
              type="button"
              disabled={Boolean(busy) || !title}
              onClick={onSendTest}
              title="Sends a test of this newsletter to the owner address only — exactly what subscribers will receive."
              className="border border-ink px-5 py-3 text-button uppercase tracking-wider disabled:opacity-50"
            >
              {busy === "testing" ? "Sending test…" : "Send test to me"}
            </button>
          ) : null}
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
          <Label>Excerpt</Label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className={inputCls}
            placeholder="One-line preview shown in the newsletter list"
          />
        </div>
        <div>
          <Label>Email subject</Label>
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className={inputCls}
            placeholder={title || "Defaults to the post title"}
          />
          <p className="mt-1 text-caption text-ink/50">
            Subject line subscribers see in their inbox. Leave blank to use the post title.
          </p>
        </div>
        <div>
          <Label>Cover image</Label>
          {coverImageUrl ? (
            <div className="border border-ink/10 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxyImageUrl(coverImageUrl, 1200)}
                alt={coverImageAlt ?? ""}
                className="w-full"
              />
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
            value={coverImageAlt}
            onChange={(e) => setCoverImageAlt(e.target.value)}
            className={`${inputCls} mt-2`}
            placeholder="Alt text"
          />
        </div>
        <div>
          <Label>Tags</Label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputCls}
            placeholder="comma, separated"
          />
        </div>
        <div>
          <Label>Publish date</Label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className={inputCls}
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          Surface on home page
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
