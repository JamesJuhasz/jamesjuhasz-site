import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const OUT_DIR = path.join(process.cwd(), "tasks", "about-screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  console.log("Navigating to https://www.jamesjuhasz.com/about …");
  await page.goto("https://www.jamesjuhasz.com/about", {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  // Full-page screenshot
  await page.screenshot({
    path: path.join(OUT_DIR, "about-full.png"),
    fullPage: true,
  });
  console.log("Saved about-full.png");

  // Scroll in 900px increments and capture viewport-sized shots
  const pageHeight: number = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = 900;
  let scrollY = 0;
  let shotIdx = 1;

  while (scrollY < pageHeight) {
    await page.evaluate((y: number) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400); // let lazy images load
    const filename = `about-scroll-${String(shotIdx).padStart(2, "0")}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, filename) });
    console.log(`Saved ${filename} (scrollY=${scrollY})`);
    scrollY += viewportHeight;
    shotIdx++;
  }

  // Also grab images list to identify which src files are used
  const imgSrcs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img")).map((img) => img.src)
  );
  console.log("\nImages found on page:");
  imgSrcs.forEach((s) => console.log(" ", s));

  fs.writeFileSync(path.join(OUT_DIR, "image-list.json"), JSON.stringify(imgSrcs, null, 2));

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT_DIR}`);
}

main().catch(console.error);
