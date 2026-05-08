import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPostById, markSent } from "@/lib/admin/store/posts";
import { renderNewsletterEmail } from "@/lib/admin/newsletter-html";
import { verifyAdminPassword } from "@/lib/admin/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  createAndSendBroadcast,
  sendTestEmail,
  getOwnerAddress,
} from "@/lib/resend";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

const Body = z.object({
  mode: z.enum(["test", "all"]),
  password: z.string().min(1).max(500).optional(),
});

/**
 * Always absolutize email URLs against the canonical production domain.
 *
 * Email clients (Gmail, Apple Mail, Outlook) fetch image src URLs from the
 * server side, so they cannot resolve `http://localhost:3000/uploads/...`
 * even when the test send goes to your own inbox. Hardcoding SITE.url means
 * images and links work in tests and in real broadcasts identically — at the
 * cost that locally-uploaded images need to be deployed to production before
 * a test send will render them. That's the right tradeoff: a test should
 * fail-loud if a referenced image won't be available to subscribers either.
 */
function emailOrigin(): string {
  return SITE.url.replace(/\/+$/, "");
}

function buildSubject(title: string): string {
  return `James Juhasz Sailing - "${title}"`;
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

  if (parsed.data.mode === "all") {
    const ip = clientIp(req);
    const rl = rateLimit(`admin-broadcast-confirm:${ip}`, {
      max: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "rate_limited" },
        { status: 429 },
      );
    }
    const password = parsed.data.password ?? "";
    if (!password) {
      return NextResponse.json(
        { ok: false, error: "password_required" },
        { status: 401 },
      );
    }
    const verdict = verifyAdminPassword(password);
    if (!verdict.ok) {
      if (verdict.reason === "not_configured") {
        return NextResponse.json(
          { ok: false, error: "admin_not_configured" },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "wrong_password" },
        { status: 401 },
      );
    }
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

  // Public URL for the "Read the rest" CTA always points at the canonical
  // production domain so subscribers' clicks resolve even when the test send
  // was triggered from a localhost dev session.
  const publicUrl = `${SITE.url.replace(/\/+$/, "")}/newsletters/${post.slug}`;
  const subject = buildSubject(post.title);

  if (parsed.data.mode === "test") {
    // Test sends go through `emails.send`, which does NOT substitute
    // {{{RESEND_UNSUBSCRIBE_URL}}}. Pass a working mailto so the test recipient
    // (the owner) can still click the link without it 404-ing.
    const testUnsubscribeUrl = `mailto:${getOwnerAddress()}?subject=Unsubscribe%20%5Btest%5D`;
    const html = renderNewsletterEmail({
      title: post.title,
      bodyHtml: post.bodyHtml,
      coverImageUrl: post.coverImageUrl,
      coverImageAlt: post.coverImageAlt,
      origin: emailOrigin(),
      publicUrl,
      unsubscribeUrl: testUnsubscribeUrl,
    });
    const result = await sendTestEmail({
      to: getOwnerAddress(),
      subject: `[TEST] ${subject}`,
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

  // Broadcast path: leave the unsubscribe URL as the Resend placeholder so
  // their server substitutes it with the audience-scoped hosted URL at send.
  const broadcastHtml = renderNewsletterEmail({
    title: post.title,
    bodyHtml: post.bodyHtml,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    origin: emailOrigin(),
    publicUrl,
  });

  const result = await createAndSendBroadcast({
    subject,
    html: broadcastHtml,
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
