import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getGalleryById,
  markGalleryAnnounced,
} from "@/lib/admin/store/galleries";
import {
  renderNewsletterEmail,
  renderCroppedImage,
  absolutizeUrl,
} from "@/lib/admin/newsletter-html";
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

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Wrap the gallery's free-text context as the email body. The renderer's
 * teaser pass truncates to 150 words and appends the CTA; we just need a
 * `<p>`-shaped body for it to chew on. Empty context → empty body, which
 * collapses to title + grid + CTA.
 */
function buildAnnouncementBody(context: string | null | undefined): string {
  const trimmed = context?.trim();
  if (!trimmed) return "";
  return `<p>${escapeText(trimmed)}</p>`;
}

/**
 * Render a 2-column grid of up to 6 gallery thumbnails, each cropped to 16:10.
 * The CTA in the email body invites recipients to view the rest on the site,
 * so we don't need to show every photo here.
 */
function buildPhotoGrid(
  photos: Array<{ url: string; alt: string | null }>,
  origin: string,
): string {
  const items = photos.slice(0, 6);
  if (items.length === 0) return "";
  // Each thumbnail cell is half the inner content width (536/2 = 268px) minus
  // an 8px gutter — round to 264x165 for clean 16:10.
  const W = 264;
  const H = 165;
  const cellsHtml = items.map((p) =>
    renderCroppedImage({
      src: absolutizeUrl(p.url, origin),
      alt: p.alt,
      width: W,
      height: H,
    }),
  );
  const rows: string[] = [];
  for (let i = 0; i < cellsHtml.length; i += 2) {
    const left = cellsHtml[i];
    const right = cellsHtml[i + 1] ?? "";
    rows.push(
      `<tr><td width="50%" valign="top" style="padding:0 4px 8px 0;">${left}</td><td width="50%" valign="top" style="padding:0 0 8px 4px;">${right}</td></tr>`,
    );
  }
  return `<tr><td style="padding:0 32px 16px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border-collapse:separate;border-spacing:0;max-width:536px;">
      ${rows.join("\n      ")}
    </table>
  </td></tr>`;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  // Any uncaught throw below (e.g. a transient DB error) would otherwise
  // fall through to Next's default non-JSON error response, which breaks
  // the client's `res.json()` call (Safari surfaces this as the cryptic
  // "The string did not match the expected pattern"). Always answer JSON.
  try {
    return await handlePost(req, ctx);
  } catch (err) {
    console.error("[send] unhandled error:", err);
    // Admin-only endpoint — surface the real message so a failure is
    // diagnosable from the UI instead of an opaque crash.
    return NextResponse.json(
      { ok: false, error: `internal_error: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

async function handlePost(
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

  const gallery = await getGalleryById(id);
  if (!gallery) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const canonicalOrigin = SITE.url.replace(/\/+$/, "");
  const publicUrl = `${canonicalOrigin}/gallery/${gallery.slug}`;
  const subject = `New Photo Gallery Published - "${gallery.title}"`;
  const photoGrid = buildPhotoGrid(gallery.photos, canonicalOrigin);

  const html = renderNewsletterEmail({
    title: gallery.title,
    bodyHtml: buildAnnouncementBody(gallery.context),
    coverImageAlt: gallery.title,
    // Always absolutize against the canonical production domain so /images and
    // /uploads URLs resolve in Gmail/Outlook even when the test send is fired
    // from a localhost dev session.
    origin: canonicalOrigin,
    publicUrl,
    kicker: "New Photo Gallery Published",
    ctaLabel: "View the gallery",
    mediaHtml: photoGrid,
    utmCampaign: `gallery-${gallery.slug}`,
  });

  if (parsed.data.mode === "test") {
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
  const result = await createAndSendBroadcast({
    subject,
    html,
    name: subject,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 502 },
    );
  }
  const updated = await markGalleryAnnounced(id);
  return NextResponse.json({
    ok: true,
    mode: "all",
    broadcastId: result.id,
    lastAnnouncedAt: updated?.lastAnnouncedAt ?? null,
  });
}
