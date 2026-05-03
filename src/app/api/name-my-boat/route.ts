import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  suggestedName: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(2000).optional(),
  subscribe: z.union([z.boolean(), z.literal("on"), z.literal("off")]).optional(),
  company: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`nameboat:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
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
  const { name, email, suggestedName, reason, subscribe } = parsed.data;
  await sendEmail({
    subject: `[name-my-boat] ${suggestedName}`,
    replyTo: email,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Boat name: ${suggestedName}`,
      `Reason: ${reason ?? "—"}`,
      `Subscribe: ${subscribe === true || subscribe === "on" ? "yes" : "no"}`,
    ].join("\n"),
  });
  return NextResponse.json({ ok: true });
}
