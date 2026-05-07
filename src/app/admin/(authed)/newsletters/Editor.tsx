"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export type EditorValue = { html: string; json: unknown };

export function Editor({
  initialHtml,
  initialJson,
  onChange,
}: {
  initialHtml?: string | null;
  initialJson?: unknown;
  onChange: (v: EditorValue) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // TipTap-native JSON looks like { type: "doc", content: [...] }. Anything
  // else (e.g. Sanity portable-text) gets parsed via HTML instead so it
  // round-trips into TipTap's schema.
  const isTiptapDoc =
    initialJson &&
    typeof initialJson === "object" &&
    (initialJson as { type?: string }).type === "doc";
  const initialContent = isTiptapDoc ? initialJson : (initialHtml ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: "Write the newsletter…" }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange({ html: editor.getHTML(), json: editor.getJSON() });
    },
  });

  // Click on a link prompt
  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const insertImage = useCallback(async () => {
    fileRef.current?.click();
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        alert(`Upload failed: ${data.error ?? res.status}`);
        return;
      }
      editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) return <div className="border border-ink/10 p-4 text-ink-3">Loading editor…</div>;

  return (
    <div className="border border-ink/15">
      <div className="flex flex-wrap gap-1 border-b border-ink/10 bg-ink/[0.02] p-2 text-caption">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          I
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
        >
          “ Quote
        </ToolbarButton>
        <Sep />
        <ToolbarButton onClick={setLink} active={editor.isActive("link")}>
          Link
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} disabled={uploading}>
          {uploading ? "Uploading…" : "Image"}
        </ToolbarButton>
        <Sep />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          Undo
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          Redo
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="prose-newsletter min-h-[40vh] p-4 focus:outline-none"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={onPickFile}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 uppercase tracking-wider transition-colors disabled:opacity-40 ${
        active ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 w-px self-stretch bg-ink/15" />;
}
