import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createGallery,
  listGalleriesWithCounts,
} from "@/lib/admin/store/galleries";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(96).optional(),
  dateRange: z.string().trim().min(1).max(120),
  context: z.string().trim().max(600).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
});

export async function GET() {
  const rows = await listGalleriesWithCounts();
  return NextResponse.json({ ok: true, galleries: rows });
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
  const row = await createGallery({
    title: data.title,
    slug,
    dateRange: data.dateRange,
    context: data.context ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
  });
  revalidatePath("/gallery");
  return NextResponse.json({ ok: true, gallery: row });
}
