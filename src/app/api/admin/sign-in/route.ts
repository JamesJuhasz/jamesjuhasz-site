import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/admin/session";
import { verifyAdminPassword } from "@/lib/admin/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const Body = z.object({ password: z.string().min(1).max(500) });

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`admin-signin:${ip}`, {
    max: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const verdict = verifyAdminPassword(parsed.data.password);
  if (!verdict.ok) {
    if (verdict.reason === "not_configured") {
      return NextResponse.json(
        { ok: false, error: "admin_not_configured" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return res;
}
