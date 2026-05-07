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
   * Resend variable; when broadcasting they replace {{{RESEND_UNSUBSCRIBE_URL}}}
   * with the hosted unsubscribe URL. For test sends we substitute the literal
   * string "#" so the link still renders.
   */
  unsubscribeUrl?: string;
};

function absolutize(html: string, origin: string): string {
  // Rewrite src/href that start with "/" to absolute URLs.
  return html
    .replace(/(\s(?:src|href)=")\/([^"]+)/g, `$1${origin}/$2`)
    .replace(/(\s(?:src|href)=')\/([^']+)/g, `$1${origin}/$2`);
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderNewsletterEmail(input: NewsletterEmailInput): string {
  const { title, bodyHtml, excerpt, coverImageUrl, coverImageAlt, origin } = input;
  const unsubscribe = input.unsubscribeUrl ?? "{{{RESEND_UNSUBSCRIBE_URL}}}";

  const cover = coverImageUrl
    ? `<tr><td style="padding:0;"><img src="${escapeAttr(
        coverImageUrl.startsWith("/") ? `${origin}${coverImageUrl}` : coverImageUrl,
      )}" alt="${escapeAttr(coverImageAlt ?? "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></td></tr>`
    : "";

  const body = absolutize(bodyHtml, origin);

  return `<!doctype html>
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
        ${cover}
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="${RESET}${FONT}font-size:28px;line-height:1.2;font-weight:700;color:${BRAND.ink};">${escapeText(title)}</h1>
            ${excerpt ? `<p style="${RESET}margin-top:12px;${FONT}font-size:16px;color:${BRAND.muted};">${escapeText(excerpt)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 32px 32px;${FONT}font-size:17px;">
            ${body}
          </td>
        </tr>
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
}
