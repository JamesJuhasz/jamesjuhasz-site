import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPost, listPosts } from "@/lib/admin/store/posts";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(96).optional(),
  excerpt: z.string().trim().max(400).optional().nullable(),
  coverImageUrl: z.string().trim().url().optional().nullable(),
  coverImageAlt: z.string().trim().max(200).optional().nullable(),
  bodyHtml: z.string().optional().nullable(),
  bodyJson: z.unknown().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const rows = await listPosts();
  return NextResponse.json({ ok: true, posts: rows });
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const slug = slugify(data.slug ?? data.title);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  }
  const row = await createPost({
    title: data.title,
    slug,
    excerpt: data.excerpt ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    coverImageAlt: data.coverImageAlt ?? null,
    bodyHtml: data.bodyHtml ?? null,
    bodyJson: (data.bodyJson as object | null | undefined) ?? null,
    tags: data.tags ?? null,
    featured: data.featured ?? false,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
  });
  return NextResponse.json({ ok: true, post: row });
}
