import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createEvent, listEvents } from "@/lib/admin/store/events";
import { slugify } from "@/lib/admin/slug";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(96).optional(),
  eventDate: z.string().min(1),
  endDate: z.string().min(1).optional().nullable(),
  location: z.string().trim().min(1).max(180),
  category: z.enum(["Regatta", "Training", "Coaching"]),
  resultPosition: z.string().trim().max(60).optional().nullable(),
  coverImageUrl: z.string().trim().url().optional().nullable(),
  coverImageAlt: z.string().trim().max(200).optional().nullable(),
  bodyHtml: z.string().optional().nullable(),
  bodyJson: z.unknown().optional(),
  upcoming: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ ok: true, events: await listEvents() });
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
  if (!slug)
    return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400 });
  const row = await createEvent({
    title: data.title,
    slug,
    eventDate: data.eventDate,
    endDate: data.endDate ?? null,
    location: data.location,
    category: data.category,
    resultPosition: data.resultPosition ?? null,
    coverImageUrl: data.coverImageUrl ?? null,
    coverImageAlt: data.coverImageAlt ?? null,
    bodyHtml: data.bodyHtml ?? null,
    bodyJson: (data.bodyJson as object | null | undefined) ?? null,
    upcoming: data.upcoming ?? false,
  });
  return NextResponse.json({ ok: true, event: row });
}
