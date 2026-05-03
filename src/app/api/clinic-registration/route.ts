import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  age: z.string().trim().max(3).optional(),
  experience: z.enum(["Beginner", "Intermediate", "Advanced", "Pro"]),
  clinic: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  company: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`clinic:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }
  const d = parsed.data;
  await sendEmail({
    subject: `[clinic] ${d.name} — ${d.clinic}`,
    replyTo: d.email,
    text: [
      `Name: ${d.name}`,
      `Email: ${d.email}`,
      `Age: ${d.age ?? "—"}`,
      `Experience: ${d.experience}`,
      `Clinic: ${d.clinic}`,
      `Notes: ${d.notes ?? "—"}`,
    ].join("\n"),
  });
  return NextResponse.json({ ok: true });
}
