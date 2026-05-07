import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  deleteOverride,
  listOverrides,
  upsertOverride,
} from "@/lib/admin/store/results";

export const runtime = "nodejs";

const Body = z.object({
  coachaibleId: z.string().min(1).max(200),
  position: z.string().trim().max(60).optional().nullable(),
  totalCompetitors: z.number().int().positive().nullable().optional(),
  fleet: z.string().trim().max(80).optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  hidden: z.boolean().optional(),
});

export async function GET() {
  return NextResponse.json({ ok: true, overrides: await listOverrides() });
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
  const row = await upsertOverride({
    coachaibleId: data.coachaibleId,
    position: data.position ?? null,
    totalCompetitors: data.totalCompetitors ?? null,
    fleet: data.fleet ?? null,
    externalUrl: data.externalUrl ?? null,
    notes: data.notes ?? null,
    hidden: data.hidden ?? false,
  });
  return NextResponse.json({ ok: true, override: row });
}

const DeleteBody = z.object({ coachaibleId: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  let parsed;
  try {
    parsed = DeleteBody.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const ok = await deleteOverride(parsed.data.coachaibleId);
  return NextResponse.json({ ok });
}
