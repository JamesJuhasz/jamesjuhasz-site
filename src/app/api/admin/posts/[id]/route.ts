import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deletePost,
  getPostById,
  updatePost,
} from "@/lib/admin/store/posts";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().min(1).max(96).optional(),
  excerpt: z.string().trim().max(400).optional().nullable(),
  coverImageUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), {
      message: "Must be an absolute URL or a path starting with /",
    })
    .optional()
    .nullable(),
  coverImageAlt: z.string().trim().max(200).optional().nullable(),
  bodyHtml: z.string().optional().nullable(),
  bodyJson: z.unknown().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional().nullable(),
  featured: z.boolean().optional(),
  emailSubject: z.string().trim().max(180).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null)
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const row = await getPostById(id);
  if (!row)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, post: row });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null)
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });

  let parsed;
  try {
    parsed = Patch.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if (patch.slug) patch.slug = slugify(patch.slug as string);
  if (patch.publishedAt) patch.publishedAt = new Date(patch.publishedAt as string);
  if (patch.bodyJson !== undefined)
    patch.bodyJson = (patch.bodyJson as object | null | undefined) ?? null;

  const row = await updatePost(id, patch);
  if (!row)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, post: row });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null)
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const ok = await deletePost(id);
  if (!ok)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
