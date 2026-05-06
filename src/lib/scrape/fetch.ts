/*
  src/lib/scrape/fetch.ts
  ---------------------------------------------------------------------------
  Thin fetch helpers reused across discovery + extraction. Behavior matches
  the press scraper (timeouts, UA, redirect-follow) so a single change here
  affects both pipelines uniformly.
*/

export const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

export const DEFAULT_TIMEOUT_MS = 15_000;

export type FetchResult =
  | { ok: true; status: number; finalUrl: string; contentType: string; body: ArrayBuffer }
  | { ok: false; status: number | null; error: string };

/**
 * Fetch a URL and return the binary body + final redirect URL + content-type.
 * Caller decides whether to decode as text or treat as PDF.
 */
export async function fetchUrl(
  url: string,
  init: { timeoutMs?: number; accept?: string } = {},
): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": DEFAULT_UA,
        accept: init.accept ?? "text/html, application/pdf;q=0.9, */*;q=0.5",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return {
      ok: true,
      status: res.status,
      finalUrl: res.url,
      contentType: res.headers.get("content-type") ?? "",
      body: await res.arrayBuffer(),
    };
  } catch (err) {
    return { ok: false, status: null, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

/** Decode an ArrayBuffer as UTF-8 text. */
export function bufferToText(buf: ArrayBuffer): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

/** PDF check via content-type OR the %PDF- magic bytes (some servers mislabel). */
export function isPdf(contentType: string, body: ArrayBuffer): boolean {
  if (contentType.toLowerCase().includes("application/pdf")) return true;
  if (body.byteLength < 4) return false;
  const header = new Uint8Array(body.slice(0, 5));
  return (
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 && // F
    header[4] === 0x2d    // -
  );
}

/** Generic concurrency-limited worker queue. */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => next()),
  );
  return results;
}
