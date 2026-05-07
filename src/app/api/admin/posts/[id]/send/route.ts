import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPostById, markSent } from "@/lib/admin/store/posts";
import { renderNewsletterEmail } from "@/lib/admin/newsletter-html";
import {
  createAndSendBroadcast,
  sendTestEmail,
  getOwnerAddress,
} from "@/lib/resend";

export const runtime = "nodejs";

const Body = z.object({ mode: z.enum(["test", "all"]) });

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return `${proto}://${host}`;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
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

  const post = await getPostById(id);
  if (!post)
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!post.bodyHtml) {
    return NextResponse.json(
      { ok: false, error: "post_has_no_body" },
      { status: 400 },
    );
  }

  const html = renderNewsletterEmail({
    title: post.title,
    bodyHtml: post.bodyHtml,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    origin: originFromReq(req),
  });

  if (parsed.data.mode === "test") {
    const result = await sendTestEmail({
      to: getOwnerAddress(),
      subject: `[TEST] ${post.title}`,
      html,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, mode: "test", id: result.id });
  }

  // mode === "all"
  if (post.sentAt) {
    return NextResponse.json(
      { ok: false, error: "already_sent" },
      { status: 409 },
    );
  }

  const result = await createAndSendBroadcast({
    subject: post.title,
    html,
    name: post.title,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }
  await markSent(id, { broadcastId: result.id });
  return NextResponse.json({ ok: true, mode: "all", broadcastId: result.id });
}
