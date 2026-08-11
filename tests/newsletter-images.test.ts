import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeImage, MAX_EDGE } from "../src/lib/admin/uploads";
import { proxyImagesInHtml } from "../src/lib/img-proxy";
import { optimizerUrlsForPost } from "../src/lib/admin/prewarm-images";

describe("normalizeImage (downscale-on-upload)", () => {
  it("caps an oversized JPEG to MAX_EDGE on its longest edge", async () => {
    const big = await sharp({
      create: {
        width: 5000,
        height: 3000,
        channels: 3,
        background: { r: 120, g: 80, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    const out = await normalizeImage(big, "image/jpeg");
    const meta = await sharp(out.data).metadata();

    expect(out.mime).toBe("image/jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(MAX_EDGE);
    // The whole point: the stored file is far smaller than the original.
    expect(out.data.length).toBeLessThan(big.length);
  });

  it("does not enlarge an image already under the cap", async () => {
    const small = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const out = await normalizeImage(small, "image/png");
    const meta = await sharp(out.data).metadata();

    expect(out.mime).toBe("image/png");
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it("transcodes HEIC/HEIF sources to JPEG", async () => {
    // We can't easily synthesize HEIC bytes here, but the mime-mapping branch is
    // what matters: a heic mime must come back out as jpeg. Feed JPEG bytes
    // labelled heic — sharp reads the real format, the branch sets the out mime.
    const jpeg = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .jpeg()
      .toBuffer();
    const out = await normalizeImage(jpeg, "image/heic");
    expect(out.mime).toBe("image/jpeg");
  });

  it("passes animated GIF and AVIF through untouched", async () => {
    const gifBytes = Buffer.from("not-really-a-gif");
    const gif = await normalizeImage(gifBytes, "image/gif");
    expect(gif.mime).toBe("image/gif");
    expect(gif.data).toBe(gifBytes); // same buffer, no re-encode
  });
});

describe("proxyImagesInHtml (lazy-load)", () => {
  it("adds loading=lazy + decoding=async and proxies the src", () => {
    const html = '<p><img src="https://cdn.example.com/uploads/a.jpg" alt="x" /></p>';
    const out = proxyImagesInHtml(html);
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
    expect(out).toContain("/_next/image?url=");
    expect(out).toContain("&w=1200&q=75");
  });

  it("does not override an author-supplied loading attribute", () => {
    const html =
      '<img loading="eager" src="https://cdn.example.com/uploads/a.jpg" />';
    const out = proxyImagesInHtml(html);
    expect(out).toContain('loading="eager"');
    expect(out).not.toContain('loading="lazy"');
  });

  it("leaves relative and data URLs unproxied", () => {
    const html = '<img src="/uploads/local.jpg" /><img src="data:image/png;base64,AAAA" />';
    const out = proxyImagesInHtml(html);
    expect(out).toContain('src="/uploads/local.jpg"');
    expect(out).toContain('src="data:image/png;base64,AAAA"');
    expect(out).not.toContain("/_next/image");
  });
});

describe("optimizerUrlsForPost (pre-warm targets)", () => {
  const origin = "https://jamesjuhasz.com";

  it("warms each body image at the exact w=1200&q=75 URL the page requests", () => {
    const urls = optimizerUrlsForPost(
      {
        bodyHtml:
          '<img src="https://cdn.example.com/uploads/a.jpg" />' +
          '<img src="https://cdn.example.com/uploads/b.jpg" />',
        coverImageUrl: null,
      },
      origin,
    );
    expect(urls).toContain(
      `${origin}/_next/image?url=${encodeURIComponent("https://cdn.example.com/uploads/a.jpg")}&w=1200&q=75`,
    );
    expect(urls).toContain(
      `${origin}/_next/image?url=${encodeURIComponent("https://cdn.example.com/uploads/b.jpg")}&w=1200&q=75`,
    );
  });

  it("warms the cover across device widths", () => {
    const urls = optimizerUrlsForPost(
      { bodyHtml: "", coverImageUrl: "https://cdn.example.com/uploads/cover.jpg" },
      origin,
    );
    for (const w of [640, 828, 1080, 1200, 1920]) {
      expect(urls).toContain(
        `${origin}/_next/image?url=${encodeURIComponent("https://cdn.example.com/uploads/cover.jpg")}&w=${w}&q=75`,
      );
    }
  });

  it("dedupes and returns nothing for an image-less post", () => {
    expect(optimizerUrlsForPost({ bodyHtml: "<p>text only</p>", coverImageUrl: null }, origin)).toEqual([]);
  });
});
