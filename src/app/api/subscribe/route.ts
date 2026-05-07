import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { addContactToAudience } from "@/lib/resend";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const SubscribeSchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional(),
  company: z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`subscribe:${ip}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const { email, name } = parsed.data;

  // Add to Resend audience (idempotent: Resend dedupes by email).
  const audienceResult = await addContactToAudience({
    email,
    firstName: name,
  });

  await sendEmail({
    subject: "[subscribe] new newsletter signup",
    text: `Email: ${email}\nName: ${name ?? "—"}\nAudience: ${audienceResult.ok ? "added" : `failed (${audienceResult.error})`}`,
    replyTo: email,
  });

  return NextResponse.json({ ok: true });
}
