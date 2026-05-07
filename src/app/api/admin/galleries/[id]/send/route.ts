import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  getGalleryById,
  markGalleryAnnounced,
} from "@/lib/admin/store/galleries";
import { renderNewsletterEmail } from "@/lib/admin/newsletter-html";
import {
  createAndSendBroadcast,
  sendTestEmail,
  getOwnerAddress,
} from "@/lib/resend";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";

const Body = z.object({ mode: z.enum(["test", "all"]) });

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildAnnouncementBody(args: {
  context: string | null | undefined;
  photoCount: number;
  publicUrl: string;
}): string {
  const intro = args.context
    ? `<p style="margin:0 0 18px 0;">${escapeText(args.context)}</p>`
    : "";
  const meta = `<p style="margin:0 0 24px 0;color:#666666;font-size:15px;">${args.photoCount} ${args.photoCount === 1 ? "photo" : "photos"} from this block.</p>`;
  const cta = `
    <p style="margin:24px 0 8px 0;text-align:center;">
      <a href="${escapeAttr(args.publicUrl)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">View the gallery</a>
    </p>
    <p style="margin:0;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#666666;">
      Or open it directly: <a href="${escapeAttr(args.publicUrl)}" style="color:#666666;">${escapeText(args.publicUrl)}</a>
    </p>`;
  return intro + meta + cta;
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

  const gallery = await getGalleryById(id);
  if (!gallery) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const canonicalOrigin = SITE.url.replace(/\/+$/, "");
  const publicUrl = `${canonicalOrigin}/gallery/${gallery.slug}`;
  const subject = `New photos: ${gallery.title}`;
  const cover = gallery.coverImageUrl ?? gallery.photos[0]?.url ?? null;

  const html = renderNewsletterEmail({
    title: gallery.title,
    bodyHtml: buildAnnouncementBody({
      context: gallery.context,
      photoCount: gallery.photos.length,
      publicUrl,
    }),
    excerpt: gallery.dateRange,
    coverImageUrl: cover,
    coverImageAlt: gallery.title,
    // Always absolutize against the canonical production domain so /images and
    // /uploads URLs resolve in Gmail/Outlook even when the test send is fired
    // from a localhost dev session.
    origin: canonicalOrigin,
    mode: "full",
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
