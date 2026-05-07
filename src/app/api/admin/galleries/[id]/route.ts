import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  deleteGallery,
  getGalleryById,
  setPhotosForGallery,
  updateGallery,
} from "@/lib/admin/store/galleries";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const PhotoSchema = z.object({
  url: z.string().trim().min(1).max(500),
  alt: z.string().trim().max(200).optional().nullable(),
});

const Patch = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().max(96).optional(),
  dateRange: z.string().trim().min(1).max(120).optional(),
  context: z.string().trim().max(600).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  photos: z.array(PhotoSchema).max(500).optional(),
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
  const row = await getGalleryById(id);
  if (!row)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, gallery: row });
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

  const { photos, ...rest } = parsed.data;
  const patch: Record<string, unknown> = { ...rest };
  if (patch.slug) patch.slug = slugify(patch.slug as string);

  const existing = await getGalleryById(id);
  if (!existing)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const updated = Object.keys(patch).length > 0 ? await updateGallery(id, patch) : existing;
  if (photos) {
    await setPhotosForGallery(id, photos);
  }

  const fresh = await getGalleryById(id);
  revalidatePath("/gallery");
  revalidatePath(`/gallery/${fresh?.slug ?? existing.slug}`);
  if (existing.slug !== fresh?.slug) {
    revalidatePath(`/gallery/${existing.slug}`);
  }
  return NextResponse.json({ ok: true, gallery: fresh ?? updated });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null)
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const existing = await getGalleryById(id);
  const ok = await deleteGallery(id);
  if (!ok)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  revalidatePath("/gallery");
  if (existing) revalidatePath(`/gallery/${existing.slug}`);
  return NextResponse.json({ ok: true });
}
