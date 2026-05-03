/*
  Hero picker persistence — writes to .picks.json at the project root.
  The file is gitignored. Read by Claude after user finishes picking.
  Dev-only: this route refuses in production.
*/

import { NextResponse, type NextRequest } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const PICKS_PATH = path.join(process.cwd(), ".picks.json");

const SLOT_VALUES = [
  "hero",
  "portrait",
  "event",
  "section-bg",
  "skip",
] as const;

const PicksSchema = z.object({
  picks: z.record(z.string(), z.enum(SLOT_VALUES).nullable()),
});

function devOnly() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "disabled in production" },
      { status: 404 },
    );
  }
  return null;
}

export async function GET() {
  const guard = devOnly();
  if (guard) return guard;
  try {
    const raw = await readFile(PICKS_PATH, "utf8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ picks: {} });
  }
}

export async function POST(req: NextRequest) {
  const guard = devOnly();
  if (guard) return guard;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = PicksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const out = {
    picks: parsed.data.picks,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(PICKS_PATH, JSON.stringify(out, null, 2), "utf8");
  return NextResponse.json({ ok: true });
}
