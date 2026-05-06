/*
  src/lib/scrape/extract-html.ts
  ---------------------------------------------------------------------------
  HTML results-table extractor. Given an HTML string and the WS event we're
  trying to verify, finds candidate result tables, scopes each to its likely
  fleet section (so we don't pull a name out of the ILCA 6 table by accident),
  and returns the row matching James + the surrounding signals (fleet label,
  total competitors, dates seen on the page).

  Design constraints:
    - No DOM in extraction logic — we use jsdom only for parsing, then walk
      with plain functions. Keeps the layer testable on raw HTML strings.
    - Whole-token name matching only (see match.ts). Substrings are rejected.
*/

import { JSDOM } from "jsdom";
import {
  classify,
  type ClassDetection,
  countNameMatches,
  extractDates,
  nameMatchScore,
} from "./match";
import { stripHtml } from "./normalize";

export type HtmlExtraction = {
  /** James's row position parsed from the matching cell, if found. 1..N. */
  externalPosition: number | null;
  /** Number of data rows in the same table as James's row. */
  totalCompetitors: number | null;
  /** Verbatim fleet label seen on/near the table (caption, h*, preceding text). */
  fleet: string | null;
  /** Whether the scoped section confirmed/rejected ILCA 7. */
  classDetection: ClassDetection;
  /** ISO dates extracted from the entire page. Caller scores overlap. */
  pageDates: string[];
  /** True if the page contained > 1 distinct James-Juhasz row (across tables). */
  ambiguous: boolean;
  /** Best title we found on the page (h1 / og:title), for event-name match. */
  pageTitle: string;
  /** Free-form notes for debugging. */
  notes: string[];
};

/**
 * Find James's row in an HTML page that contains one or more results tables.
 *
 * Algorithm:
 *   1. Parse with jsdom; collect all <table> elements.
 *   2. For each table, build a "section context" = nearest preceding heading
 *      (h1..h4) or sibling text + the table's <caption>. Classify that text.
 *   3. Scan rows for whole-token "james" + "juhasz". Skip tables whose section
 *      classifies as "mismatch" — that's the wrong fleet.
 *   4. From the matching row, find the position cell (a small integer 1..500
 *      in the leftmost few cells, or matching common position-column headers).
 *   5. Count data rows (tr with td) for fleet size.
 *   6. Pull ISO/textual dates from the whole page.
 */
export function extractFromHtml(html: string): HtmlExtraction {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const notes: string[] = [];
  const pageTitle =
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ||
    doc.querySelector("title")?.textContent?.trim() ||
    "";

  const tables = Array.from(doc.querySelectorAll("table")) as Element[];
  notes.push(`tables-found=${tables.length}`);

  // Page-level dates first — used by caller for overlap scoring.
  const pageText = doc.body?.textContent ?? "";
  const pageDates = extractDates(pageText);

  // Page-level ambiguity check: count name matches across ALL data rows.
  const allRows = Array.from(doc.querySelectorAll("tr")) as Element[];
  const allRowTexts = allRows.map((r) => stripHtml(r.innerHTML));
  const nameMatches = countNameMatches(allRowTexts);
  const ambiguous = nameMatches > 1;

  type TableHit = {
    table: Element;
    row: Element;
    sectionText: string;
    classDetection: ClassDetection;
    fleet: string | null;
  };

  const hits: TableHit[] = [];
  for (const table of tables) {
    // Build section context: preceding heading + caption + table's first row text.
    const headingText = nearestPrecedingHeadingText(table);
    const caption = table.querySelector("caption")?.textContent?.trim() ?? "";
    const firstRowText = table.querySelector("tr")?.textContent?.trim() ?? "";
    const sectionText = [headingText, caption, firstRowText].filter(Boolean).join(" \u00b7 ");

    const classDetection = classify(sectionText);

    const fleet = caption || (headingText && /ilca|laser|fleet|division|men|women/i.test(headingText) ? headingText : null);

    const rows = Array.from(table.querySelectorAll("tr")) as Element[];
    for (const row of rows) {
      const rowText = stripHtml(row.innerHTML);
      if (nameMatchScore(rowText) === 1.0) {
        hits.push({ table, row, sectionText, classDetection, fleet });
      }
    }
  }

  if (hits.length === 0) {
    notes.push("no-row-matched");
    return {
      externalPosition: null,
      totalCompetitors: null,
      fleet: null,
      classDetection: "absent",
      pageDates,
      ambiguous,
      pageTitle,
      notes,
    };
  }

  // Prefer hits in tables whose section classifies as ILCA 7 ("match"); fall
  // back to "absent"; never accept a hit in a "mismatch" section.
  const ranked = hits.sort((a, b) => rankClass(a.classDetection) - rankClass(b.classDetection));
  const best = ranked[0];

  if (best.classDetection === "mismatch") {
    notes.push("only-hit-was-in-mismatch-section");
    return {
      externalPosition: null,
      totalCompetitors: null,
      fleet: best.fleet,
      classDetection: "mismatch",
      pageDates,
      ambiguous,
      pageTitle,
      notes,
    };
  }

  const externalPosition = parsePositionFromRow(best.row);
  const dataRows = (Array.from(best.table.querySelectorAll("tr")) as Element[]).filter(
    (r) => r.querySelectorAll("td").length > 0,
  );
  const totalCompetitors = dataRows.length > 1 ? dataRows.length : null;

  notes.push(`hit-section="${best.sectionText.slice(0, 80)}"`);

  return {
    externalPosition,
    totalCompetitors,
    fleet: best.fleet,
    classDetection: best.classDetection,
    pageDates,
    ambiguous,
    pageTitle,
    notes,
  };
}

function rankClass(d: ClassDetection): number {
  return d === "match" ? 0 : d === "absent" ? 1 : 2;
}

function nearestPrecedingHeadingText(el: Element): string {
  let cur: Element | null = el;
  while (cur) {
    let prev: Element | null = cur.previousElementSibling;
    while (prev) {
      if (/^H[1-4]$/.test(prev.tagName)) return prev.textContent?.trim() ?? "";
      // Also accept .heading / .title class hooks for blog-style results posts.
      if (prev.classList?.contains("heading") || prev.classList?.contains("title")) {
        return prev.textContent?.trim() ?? "";
      }
      prev = prev.previousElementSibling;
    }
    cur = cur.parentElement;
  }
  return "";
}

/**
 * Parse a finishing position (1..500) from a table row.
 *
 * Strategy:
 *   1. Look at the first 3 cells — position is conventionally column 1, but
 *      some tables prefix with sail # or a flag column.
 *   2. Cell text must be a small integer (optionally with ordinal suffix) and
 *      must NOT match a sail-number pattern (typically 4–6 digits).
 *   3. Reject DNF/DNC/RDG codes — those are race scores, not finish positions.
 */
function parsePositionFromRow(row: Element): number | null {
  const cells = Array.from(row.querySelectorAll("td")) as Element[];
  for (const cell of cells.slice(0, 3)) {
    const raw = (cell.textContent ?? "").trim();
    // Skip codes like "DNF", "DNC", "OCS", "RDG", and time-style scores.
    if (/^[A-Z]{2,4}$/.test(raw)) continue;
    const m = raw.match(/^(\d{1,3})(?:st|nd|rd|th)?\.?$/i);
    if (!m) continue;
    const n = Number(m[1]);
    // Sail numbers are usually >= 1000; positions <= 500 by convention.
    if (n >= 1 && n <= 500) return n;
  }
  return null;
}
