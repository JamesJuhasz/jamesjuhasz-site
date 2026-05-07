import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPostById, markSent } from "@/lib/admin/store/posts";
import { renderNewsletterEmail } from "@/lib/admin/newsletter-html";
import {
  createAndSendBroadcast,
  sendTestEmail,
  getOwnerAddress,
} from "@/lib/resend";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

const Body = z.object({ mode: z.enum(["test", "all"]) });

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

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build the email body: first paragraph of the newsletter + a styled CTA
 * linking back to the public post. Subscribers + the test sender both see
 * this so the test is a faithful preview of what subs receive.
 */
function buildTeaserHtml(bodyHtml: string, publicUrl: string): string {
  const trimmed = bodyHtml.replace(/^\s+/, "");
  const firstP = trimmed.match(/<p\b[^>]*>[\s\S]*?<\/p>/i);
  const firstBlock =
    firstP?.[0] ??
    trimmed.match(/<(h[1-6]|ul|ol|blockquote)\b[^>]*>[\s\S]*?<\/\1>/i)?.[0] ??
    bodyHtml;
  const cta = `
    <p style="margin:24px 0 8px 0;text-align:center;">
      <a href="${escapeAttr(publicUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Read the rest on the website</a>
    </p>
    <p style="margin:0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#666666;">
      Or open it directly: <a href="${escapeAttr(publicUrl)}" style="color:#666666;">${escapeText(publicUrl)}</a>
    </p>`;
  return firstBlock + cta;
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

  // Public URL for the "Read the rest" CTA always points at the canonical
  // production domain so subscribers' clicks resolve even when the test send
  // was triggered from a localhost dev session.
  const publicUrl = `${SITE.url.replace(/\/+$/, "")}/newsletters/${post.slug}`;
  const teaserBody = buildTeaserHtml(post.bodyHtml, publicUrl);

  if (parsed.data.mode === "test") {
    // Test sends go through `emails.send`, which does NOT substitute
    // {{{RESEND_UNSUBSCRIBE_URL}}}. Pass a working mailto so the test recipient
    // (the owner) can still click the link without it 404-ing.
    const testUnsubscribeUrl = `mailto:${getOwnerAddress()}?subject=Unsubscribe%20%5Btest%5D`;
    const html = renderNewsletterEmail({
      title: post.title,
      bodyHtml: teaserBody,
      excerpt: post.excerpt,
      coverImageUrl: post.coverImageUrl,
      coverImageAlt: post.coverImageAlt,
      origin: emailOrigin(),
      unsubscribeUrl: testUnsubscribeUrl,
    });
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

  // Broadcast path: leave the unsubscribe URL as the Resend placeholder so
  // their server substitutes it with the audience-scoped hosted URL at send.
  const broadcastHtml = renderNewsletterEmail({
    title: post.title,
    bodyHtml: teaserBody,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    origin: emailOrigin(),
  });

  const result = await createAndSendBroadcast({
    subject: post.title,
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
