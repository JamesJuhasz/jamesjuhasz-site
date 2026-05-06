/*
  src/lib/scrape/extract-playwright.ts
  ---------------------------------------------------------------------------
  Playwright fallback for JS-rendered results pages (Manage2Sail, Clubspot,
  etc.). Returns the rendered HTML string; the caller pipes it back through
  extract-html.ts. Keeps the extraction logic in one place.

  We launch a single chromium browser per orchestrator run and reuse it
  across pages — launching costs ~1s on a cold VM. The orchestrator is
  responsible for closing the browser when done.
*/

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type PlaywrightSession = {
  browser: Browser;
  context: BrowserContext;
  fetchRendered: (url: string, opts?: { waitMs?: number }) => Promise<string | null>;
  /**
   * For sailti.com landing pages (Sofia, Vilamoura, etc.): render the page,
   * select the option in the class-filter `<select>` whose visible text matches
   * `className`, wait for the embedded "Print PDF output" link to repoint at
   * the new class, and return the resolved absolute PDF URL. Returns null if
   * the page isn't a sailti class-filter SPA, the class isn't listed, or the
   * link doesn't update.
   */
  resolveSailtiClassPdfUrl: (landingUrl: string, className: string) => Promise<string | null>;
  close: () => Promise<void>;
};

/**
 * Launch a chromium session.
 *
 * The CI environment must run `npx playwright install --with-deps chromium`
 * before invoking this. The returned `fetchRendered` returns full DOM HTML
 * after networkidle (or timeout), which downstream HTML extraction parses
 * exactly as if it had come from a static fetch.
 */
export async function launchPlaywrightSession(opts: { headless?: boolean } = {}): Promise<PlaywrightSession> {
  const browser = await chromium.launch({ headless: opts.headless ?? true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    // Block heavy resources — we only need DOM text + table structure.
    serviceWorkers: "block",
  });
  await context.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      return route.abort();
    }
    return route.continue();
  });

  async function fetchRendered(url: string, fetchOpts: { waitMs?: number } = {}): Promise<string | null> {
    let page: Page | null = null;
    try {
      page = await context.newPage();
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response || !response.ok()) {
        return null;
      }
      // Settle: wait for network idle OR a fixed budget — Manage2Sail tables
      // load via XHR ~1.5s after DOM ready.
      try {
        await page.waitForLoadState("networkidle", { timeout: fetchOpts.waitMs ?? 8_000 });
      } catch {
        // Networkidle timeout is acceptable; the table is usually populated by then.
      }
      const html = await page.content();
      return html;
    } catch {
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  async function resolveSailtiClassPdfUrl(
    landingUrl: string,
    className: string,
  ): Promise<string | null> {
    let page: Page | null = null;
    try {
      page = await context.newPage();
      const response = await page.goto(landingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response || !response.ok()) return null;
      try {
        await page.waitForLoadState("networkidle", { timeout: 8_000 });
      } catch {
        // Networkidle timeout is acceptable.
      }

      const pdfSelector = 'a[href*="/download/overall-datetime-pdf/"]';

      // Many regatta sites (Sofia is the canonical example) land on a page
      // that has the class-filter UI but not the per-class PDF download link
      // — the PDF only appears on the dedicated /race-resultsall subpage. We
      // need the PDF link present so we can observe its href change after
      // switching class. If absent, follow a "Results" / "see all results"
      // link once.
      const hasPdfLink = async () => (await page!.locator(pdfSelector).count()) > 0;
      if (!(await hasPdfLink())) {
        const resultsLink = page
          .locator("a[href]")
          .filter({ hasText: /^(see all results|results|classifications?|standings)$/i })
          .first();
        if (await resultsLink.count()) {
          try {
            await resultsLink.click({ timeout: 5_000 });
            await page.waitForLoadState("domcontentloaded", { timeout: 15_000 });
            try {
              await page.waitForLoadState("networkidle", { timeout: 8_000 });
            } catch {
              // ignore
            }
          } catch {
            // ignore — fall through
          }
        }
      }

      // Capture the initial PDF link href so we can wait for it to change.
      const initialHref = await page
        .locator(pdfSelector)
        .first()
        .getAttribute("href")
        .catch(() => null);

      // Two known sailti UI shapes for class switching:
      //   - "filter-class" select (Sofia template) — pick option by label.
      //   - clickable nav anchor with title="<className>" (Vilamoura template).
      // Try both; the first that fires wins.
      let triggered = false;

      const optionLocator = page.locator(`select option`, { hasText: className });
      if (await optionLocator.count()) {
        const selectHandle = await optionLocator.first().evaluateHandle(
          (opt) => (opt as HTMLOptionElement).closest("select"),
        );
        const selectEl = selectHandle.asElement();
        if (selectEl) {
          // Sailti templates often reuse the same `value` for every option and
          // wire change handlers to the option's label/index — selectOption by
          // label fires the change event regardless.
          try {
            await (selectEl as any).selectOption({ label: className });
            triggered = true;
          } catch {
            // fall through to anchor path
          }
        }
      }

      if (!triggered) {
        const anchor = page.locator(`a[title="${className}"]`).first();
        if (await anchor.count()) {
          try {
            await anchor.click({ timeout: 5_000 });
            triggered = true;
          } catch {
            // fall through; resolver returns null below
          }
        }
      }

      if (!triggered) return null;

      // Wait for the PDF link to repoint (or the page to settle) after the
      // class change fires its XHR.
      if (initialHref) {
        await page
          .waitForFunction(
            ({ sel, initial }) => {
              const a = document.querySelector(sel) as HTMLAnchorElement | null;
              return Boolean(a && a.href && a.href !== initial);
            },
            { sel: pdfSelector, initial: initialHref },
            { timeout: 8_000 },
          )
          .catch(() => {});
      } else {
        try {
          await page.waitForLoadState("networkidle", { timeout: 5_000 });
        } catch {
          // ignore
        }
      }

      const newHref = await page
        .locator(pdfSelector)
        .first()
        .evaluate((a) => (a as HTMLAnchorElement).href)
        .catch(() => null);

      if (!newHref || newHref === initialHref) return null;
      return newHref;
    } catch {
      return null;
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  async function close() {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  return { browser, context, fetchRendered, resolveSailtiClassPdfUrl, close };
}
