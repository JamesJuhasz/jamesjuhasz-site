import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteEvent,
  getEventById,
  updateEvent,
} from "@/lib/admin/store/events";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const Patch = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().max(96).optional(),
  eventDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional().nullable(),
  location: z.string().trim().min(1).max(180).optional(),
  category: z.enum(["Regatta", "Training", "Coaching"]).optional(),
  resultPosition: z.string().trim().max(60).optional().nullable(),
  coverImageUrl: z.string().trim().url().optional().nullable(),
  coverImageAlt: z.string().trim().max(200).optional().nullable(),
  bodyHtml: z.string().optional().nullable(),
  bodyJson: z.unknown().optional(),
  upcoming: z.boolean().optional(),
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
  const row = await getEventById(id);
  if (!row)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, event: row });
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
  if (patch.bodyJson !== undefined)
    patch.bodyJson = (patch.bodyJson as object | null | undefined) ?? null;

  const row = await updateEvent(id, patch);
  if (!row)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, event: row });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (id === null)
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const ok = await deleteEvent(id);
  if (!ok)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
