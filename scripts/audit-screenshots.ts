/**
 * Audit screenshots: capture full-page + viewport-fold screenshots for every
 * route at desktop (1440x900) and mobile (390x844).
 *
 * Saves to: /audit/screenshots/{run-id}/{route}/{desktop|mobile}/{full|fold-N}.png
 * Run with: npx tsx scripts/audit-screenshots.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:3000";
const OUT_ROOT = resolve(process.cwd(), "audit", "screenshots");

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// Cap dynamic-route samples so a re-run stays in budget.
const SAMPLE_DYNAMIC = 2;

type RouteSpec = { path: string; label: string };

function pathToLabel(p: string): string {
  if (p === "/") return "home";
  return p.replace(/^\//, "").replace(/\//g, "_");
}

async function discoverRoutes(): Promise<RouteSpec[]> {
  const staticPaths = [
    "/",
    "/about",
    "/donate",
    "/events",
    "/gallery",
    "/newsletters",
    "/press",
    "/results",
    "/contact",
    "/subscribe",
    "/name-my-boat",
    "/clinic-registration",
    "/thank-you",
    "/design-system",
  ];

  // Pull dynamic routes from the live sitemap.xml.
  const dynamic: { posts: string[]; events: string[]; galleries: string[] } = {
    posts: [],
    events: [],
    galleries: [],
  };
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    const xml = await res.text();
    const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
    for (const url of locs) {
      const u = new URL(url);
      const p = u.pathname;
      if (p.startsWith("/newsletters/") && p !== "/newsletters/") dynamic.posts.push(p);
      else if (p.startsWith("/events/") && p !== "/events/") dynamic.events.push(p);
      else if (p.startsWith("/gallery/") && p !== "/gallery/") dynamic.galleries.push(p);
    }
  } catch (e) {
    console.warn("Could not load sitemap, dynamic routes skipped:", e);
  }

  const routes: RouteSpec[] = staticPaths.map((p) => ({ path: p, label: pathToLabel(p) }));
  for (const p of dynamic.posts.slice(0, SAMPLE_DYNAMIC))
    routes.push({ path: p, label: pathToLabel(p) });
  for (const p of dynamic.events.slice(0, SAMPLE_DYNAMIC))
    routes.push({ path: p, label: pathToLabel(p) });
  for (const p of dynamic.galleries.slice(0, SAMPLE_DYNAMIC))
    routes.push({ path: p, label: pathToLabel(p) });
  return routes;
}

async function captureRoute(
  browser: Browser,
  route: RouteSpec,
  size: { width: number; height: number },
  device: "desktop" | "mobile",
  outDir: string,
) {
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    userAgent:
      device === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
  });
  const page: Page = await ctx.newPage();
  const url = `${BASE_URL}${route.path}`;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
  } catch {
    // Some pages may not reach networkidle (forms, embeds); fall back to load.
    try {
      await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    } catch (e) {
      console.error(`  ! failed to load ${url}:`, (e as Error).message);
      await ctx.close();
      return;
    }
  }
  // Settle: wait for fonts + a beat for hydration/animations.
  try {
    await page.evaluate(() => (document as any).fonts?.ready);
  } catch {}
  await page.waitForTimeout(800);

  const dir = join(outDir, route.label, device);
  await mkdir(dir, { recursive: true });

  // Full page.
  try {
    await page.screenshot({ path: join(dir, "full.png"), fullPage: true });
  } catch (e) {
    console.error(`  ! full screenshot failed for ${url}:`, (e as Error).message);
  }

  // Fold segments: scroll through the page in viewport-height steps.
  const totalHeight = await page.evaluate(
    () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
  );
  const folds = Math.max(1, Math.ceil(totalHeight / size.height));
  for (let i = 0; i < folds; i++) {
    const y = i * size.height;
    await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" as ScrollBehavior }), y);
    await page.waitForTimeout(220);
    try {
      await page.screenshot({
        path: join(dir, `fold-${String(i + 1).padStart(2, "0")}.png`),
        fullPage: false,
      });
    } catch (e) {
      console.error(`  ! fold ${i + 1} failed for ${url}:`, (e as Error).message);
    }
  }

  await ctx.close();
}

async function main() {
  // Sanity check: dev server must be reachable.
  try {
    const r = await fetch(BASE_URL);
    if (!r.ok) throw new Error(`status ${r.status}`);
  } catch (e) {
    console.error(`Dev server not reachable at ${BASE_URL}:`, (e as Error).message);
    process.exit(1);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(OUT_ROOT, runId);
  if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
  console.log(`Run ID: ${runId}`);
  console.log(`Output: ${outDir}`);

  const routes = await discoverRoutes();
  console.log(`Capturing ${routes.length} routes:`);
  for (const r of routes) console.log(`  - ${r.path}`);

  const browser = await chromium.launch();
  let i = 0;
  for (const route of routes) {
    i++;
    console.log(`[${i}/${routes.length}] ${route.path}`);
    await captureRoute(browser, route, DESKTOP, "desktop", outDir);
    await captureRoute(browser, route, MOBILE, "mobile", outDir);
  }
  await browser.close();

  console.log(`\nDone. ${runId}`);
  // Emit run id last so callers can capture it.
  console.log(`RUN_ID=${runId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
