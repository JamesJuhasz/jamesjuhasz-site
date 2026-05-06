/*
  src/lib/scrape/normalize.ts
  ---------------------------------------------------------------------------
  Pure text-normalization helpers shared across scrape and extraction layers.
  Extracted from scripts/fetch-press.ts so the press scraper and the new
  results pipeline can stay in sync on diacritic + entity handling.
*/

/** NFD-decompose + strip combining marks ("Juhász" → "Juhasz", "Hyères" → "Hyeres"). */
export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Lowercase + diacritic-strip. The standard form for substring/token comparison. */
export function normalizeForMatch(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

/** Decode the HTML entities we encounter in feeds and scraped pages. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Strip tags and collapse whitespace.
 *
 * Tags become a single space so adjacent cells `<td>43</td><td>17</td>` read
 * as "43 17" not "4317" — critical for tokenized name matching against table
 * row HTML. The trailing `\s+` collapse keeps the result tidy.
 */
export function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Truncate with ellipsis. */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

/** Tokenize on non-letter boundaries; useful for whole-word checks. */
export function tokens(s: string): Set<string> {
  return new Set(normalizeForMatch(s).split(/[^a-z]+/).filter(Boolean));
}

/** Sørensen–Dice on character bigrams. Returns 0..1; 1 = identical post-normalization. */
export function diceSimilarity(a: string, b: string): number {
  const na = normalizeForMatch(a).replace(/[^a-z0-9]+/g, "");
  const nb = normalizeForMatch(b).replace(/[^a-z0-9]+/g, "");
  if (!na && !nb) return 1;
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s: string) => {
    const grams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    return grams;
  };

  const ag = bigrams(na);
  const bg = bigrams(nb);
  let intersection = 0;
  let total = 0;
  for (const [g, count] of ag) {
    total += count;
    const other = bg.get(g);
    if (other) intersection += Math.min(count, other);
  }
  for (const count of bg.values()) total += count;
  return total === 0 ? 0 : (2 * intersection) / total;
}
