import { NextResponse } from "next/server";
import { listAudienceContacts } from "@/lib/resend";

export const runtime = "nodejs";

export async function GET() {
  const contacts = await listAudienceContacts();
  return NextResponse.json({ ok: true, contacts });
}
