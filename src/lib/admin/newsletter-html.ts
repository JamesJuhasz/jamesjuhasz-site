/*
  Render a newsletter post as email-safe HTML.

  Email clients are stricter than browsers: inline styles, no <style>, simple
  tables, no flex/grid. We keep it minimal — typography, images, links — and
  inject a hosted unsubscribe footer placeholder that Resend replaces with
  {{{RESEND_UNSUBSCRIBE_URL}}} when broadcasting against an audience.
*/

const RESET = "margin:0;padding:0;";
const FONT =
  "font-family:Georgia,'Times New Roman',serif;color:#0a0a0a;line-height:1.55;";
const SANS =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

const BRAND = {
  ink: "#0a0a0a",
  paper: "#fafaf7",
  muted: "#666666",
  accent: "#c8102e",
};

export type NewsletterEmailInput = {
  title: string;
  bodyHtml: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  /**
   * Absolute origin used to resolve /uploads/<file> and other relative URLs
   * to fully-qualified URLs that survive being opened in an email client.
   */
  origin: string;
  /**
   * Public URL for the full newsletter — drives the CTA button in teaser
   * mode. Required for teaser; ignored for full.
   */
  publicUrl?: string;
  /**
   * Text for the teaser CTA link (an arrow is appended). Default "Continue
   * reading"; gallery announcements pass "View the gallery".
   */
  ctaLabel?: string;
  /**
   * Optional small uppercase label rendered above the title. Used by gallery
   * announcements ("New Photo Gallery Published").
   */
  kicker?: string;
  /**
   * Optional override for the media row that normally shows the cover image.
   * When provided, replaces the default 16:10 cover with arbitrary email-safe
   * HTML — used by gallery announcements to render a multi-photo grid.
   * Must include the wrapping `<tr><td>...</td></tr>`.
   */
  mediaHtml?: string;
  /**
   * "teaser" — first paragraph + CTA back to the public newsletter. This is
   * what subscribers receive when broadcasting.
   * "full" — the entire newsletter body inline. This is what the author
   * receives via "Send test to me" so they can proof the complete piece.
   * Default: "teaser".
   */
  mode?: "teaser" | "full";
  /**
   * Resend variable; when broadcasting they replace {{{RESEND_UNSUBSCRIBE_URL}}}
   * with the hosted unsubscribe URL. For test sends we substitute the literal
   * string "#" so the link still renders.
   */
  unsubscribeUrl?: string;
  /**
   * If set, append `utm_source=newsletter&utm_medium=email&utm_campaign=<this>`
   * to every href that points at jamesjuhasz.com. Lets GA4 attribute traffic
   * (and donations) back to the specific broadcast that drove the click.
   */
  utmCampaign?: string;
};

/**
 * Tag every href pointing at jamesjuhasz.com with utm_source/medium/campaign.
 * External links and the Resend unsubscribe placeholder are left alone. Already-
 * tagged URLs (with an existing utm_source param) are skipped so callers can
 * pre-tag specific links if they want different params for them.
 *
 * Ampersands are HTML-encoded (`&amp;`) so the resulting attribute value is
 * valid HTML — email clients are stricter about this than browsers.
 */
export function addUtmParams(html: string, campaign: string): string {
  const utmString =
    `utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=${encodeURIComponent(campaign)}`;
  return html.replace(
    /(\shref=["'])(https:\/\/(?:www\.)?jamesjuhasz\.com(?:\/[^"']*)?)/gi,
    (match, prefix: string, url: string) => {
      if (/[?&](?:amp;)?utm_source=/.test(url)) return match;
      const sep = url.includes("?") ? "&amp;" : "?";
      return `${prefix}${url}${sep}${utmString}`;
    },
  );
}

/**
 * Build the email teaser: roughly the first 150 words of the body, rendered
 * as one or more <p> blocks. We strip inline formatting (bold/italic/links)
 * to keep the teaser a clean lead-in — readers click through for the full,
 * formatted piece. Paragraph breaks are preserved when possible. The last
 * included block is truncated mid-paragraph with an ellipsis if needed.
 */
function extractTeaser(html: string, targetWords = 150): string {
  const blocks: string[] = [];
  const blockRegex = /<(p|div|h[1-6]|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null) {
    const text = m[2]
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) blocks.push(text);
  }
  if (blocks.length === 0) {
    const text = html
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) blocks.push(text);
  }

  const out: string[] = [];
  let used = 0;
  for (const block of blocks) {
    const words = block.split(/\s+/);
    const remaining = targetWords - used;
    if (remaining <= 0) break;
    if (words.length <= remaining) {
      out.push(`<p style="margin:0 0 1em 0;">${escapeText(block)}</p>`);
      used += words.length;
    } else {
      const truncated = words.slice(0, remaining).join(" ") + "…";
      out.push(`<p style="margin:0 0 1em 0;">${escapeText(truncated)}</p>`);
      break;
    }
  }
  return out.join("");
}

function absolutize(html: string, origin: string): string {
  // Rewrite src/href that start with "/" to absolute URLs.
  return html
    .replace(/(\s(?:src|href)=")\/([^"]+)/g, `$1${origin}/$2`)
    .replace(/(\s(?:src|href)=')\/([^']+)/g, `$1${origin}/$2`);
}

export function absolutizeUrl(url: string, origin: string): string {
  return url.startsWith("/") ? `${origin}${url}` : url;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Render an image as an email-safe responsive `<img>`.
 *
 * Earlier versions used a `background-image` on a `<td>` with a 1×1 spacer GIF
 * to force a 16:10 crop. That fails on Gmail iOS/Android and Yahoo mobile —
 * they strip CSS `background-image` on `<td>`, leaving only the invisible
 * spacer (blank gap instead of the photo). A plain `<img>` renders everywhere
 * at the cost of using the source's natural aspect ratio instead of a crop.
 *
 * Caller is responsible for absolutizing `src` if it's a relative URL.
 */
export function renderCroppedImage(args: {
  src: string;
  alt?: string | null;
  width: number;
  height: number;
}): string {
  return `<img src="${escapeAttr(args.src)}" alt="${escapeAttr(args.alt ?? "")}" width="${args.width}" style="display:block;width:100%;max-width:${args.width}px;height:auto;border:0;outline:none;text-decoration:none;" />`;
}

export function renderNewsletterEmail(input: NewsletterEmailInput): string {
  const { title, bodyHtml, excerpt, coverImageUrl, coverImageAlt, origin, publicUrl, kicker, mediaHtml } = input;
  const mode = input.mode ?? "teaser";
  const ctaLabel = input.ctaLabel ?? "Continue reading";
  const unsubscribe = input.unsubscribeUrl ?? "{{{RESEND_UNSUBSCRIBE_URL}}}";

  let mediaRow = "";
  if (mediaHtml) {
    mediaRow = mediaHtml;
  } else if (coverImageUrl) {
    const coverSrc = absolutizeUrl(coverImageUrl, origin);
    mediaRow = `<tr><td style="padding:0 32px 24px 32px;">${renderCroppedImage({ src: coverSrc, alt: coverImageAlt, width: 536, height: 335 })}</td></tr>`;
  }

  const bodyContent =
    mode === "teaser"
      ? absolutize(extractTeaser(bodyHtml), origin)
      : absolutize(bodyHtml, origin);
  const readMoreUrl = publicUrl ?? `${origin}/newsletters`;
  const cta =
    mode === "teaser"
      ? `
    <tr>
      <td style="padding:0 32px 32px 32px;${FONT}font-size:17px;">
        <p style="${RESET}"><a href="${escapeAttr(readMoreUrl)}" style="color:${BRAND.ink};text-decoration:underline;">${escapeText(ctaLabel)} &rarr;</a></p>
      </td>
    </tr>`
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeText(title)}</title>
</head>
<body style="${RESET}background:${BRAND.paper};${FONT}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${RESET}background:${BRAND.paper};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="${RESET}max-width:600px;background:#ffffff;">
        <tr>
          <td style="padding:32px 32px 16px 32px;">
            ${kicker ? `<p style="${RESET}${SANS}font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${BRAND.muted};margin-bottom:8px;">${escapeText(kicker)}</p>` : ""}
            <h1 style="${RESET}${FONT}font-size:28px;line-height:1.2;font-weight:700;color:${BRAND.ink};">${escapeText(title)}</h1>
          </td>
        </tr>
        ${mediaRow}
        ${excerpt ? `<tr><td style="padding:0 32px 16px 32px;"><p style="${RESET}${FONT}font-size:16px;color:${BRAND.muted};">${escapeText(excerpt)}</p></td></tr>` : ""}
        <tr>
          <td style="padding:0 32px ${mode === "teaser" ? "8" : "32"}px 32px;${FONT}font-size:17px;">
            ${bodyContent}
          </td>
        </tr>
        ${cta}
        <tr>
          <td style="padding:24px 32px;border-top:1px solid #eee;${SANS}font-size:13px;color:${BRAND.muted};text-align:center;">
            <p style="${RESET}margin-bottom:8px;">James Juhasz · Road to LA28 · ILCA 7 · CAN 217718</p>
            <p style="${RESET}">
              <a href="${unsubscribe}" style="color:${BRAND.muted};text-decoration:underline;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return input.utmCampaign ? addUtmParams(html, input.utmCampaign) : html;
}
