/*
  src/lib/scrape/extract-pdf.ts
  ---------------------------------------------------------------------------
  PDF results-table extractor. Uses pdfjs-dist to pull text-with-coordinates,
  reconstructs rows by y-clustering and columns by x-clustering, then locates
  James's finishing row inside the ILCA 7 section of the document.

  Why x/y reconstruction (vs. plain text extraction):
    Plain pdf-parse flattens everything into a string, losing column boundaries.
    Regatta result PDFs (Sailwave, Manage2Sail, ISAF Sailing Results) emit
    consistent x-position columns — clustering on x lets us identify which
    column is "Pos" and which is "Name" by header text, then read James's row
    cleanly.

  Section scoping (mixed-fleet docs):
    Many regatta PDFs include ILCA 7 + ILCA 6 + Masters in one file. We find
    the y-positions of "ILCA 7" / "Laser Standard" headers vs. negative
    headers (ILCA 6, Masters, etc.) and scope James's row search to the
    ILCA 7 region.
*/

import {
  classify,
  type ClassDetection,
  countNameMatches,
  extractDates,
  nameMatchScore,
} from "./match";

// pdfjs-dist exports the legacy build at runtime; in Node we reach for the
// .mjs entrypoint so it can use the worker-less path.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfExtraction = {
  externalPosition: number | null;
  totalCompetitors: number | null;
  fleet: string | null;
  classDetection: ClassDetection;
  pageDates: string[];
  ambiguous: boolean;
  pageTitle: string;
  notes: string[];
  /** True if pdfjs returned essentially no text → likely image-only/scanned. */
  imageOnly: boolean;
};

type TextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
};

type Row = {
  page: number;
  y: number;
  items: TextItem[];
  /** Joined text of the row, ordered by x. */
  text: string;
};

type Section = {
  /** Row range [start, end) within the rows[] array. */
  start: number;
  end: number;
  classDetection: ClassDetection;
  fleetLabel: string | null;
};

const POSITIVE_HEADER_RE = /\b(ilca\s*7|ilca\s*standard|laser\s*standard|standard\s*men|ilca\s*men)\b/i;
const NEGATIVE_HEADER_RE = /\b(ilca\s*6|ilca\s*4|laser\s*radial|4\.7|women|girls|ladies|u21|u19|u17|youth|junior|apprentice|grand\s*master|great\s*grand\s*master|masters?)\b/i;

/** Y-cluster tolerance: items within this many points are the same row. */
const ROW_TOLERANCE = 2.5;

export async function extractFromPdf(buffer: ArrayBuffer): Promise<PdfExtraction> {
  const notes: string[] = [];

  // pdfjs mutates the buffer; clone it.
  const data = new Uint8Array(buffer.slice(0));
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  const allItems: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    for (const it of textContent.items) {
      // pdfjs item shape: { str, transform: [a,b,c,d,e,f], width, height }
      // where (e, f) is the position; f is y from PDF origin (bottom-left).
      const item = it as { str: string; transform: number[]; width: number; height: number };
      const str = (item.str ?? "").trim();
      if (!str) continue;
      allItems.push({
        str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
        page: p,
      });
    }
  }

  if (allItems.length === 0) {
    notes.push("pdfjs-returned-no-text-items");
    return {
      externalPosition: null,
      totalCompetitors: null,
      fleet: null,
      classDetection: "absent",
      pageDates: [],
      ambiguous: false,
      pageTitle: "",
      notes,
      imageOnly: true,
    };
  }

  // Heuristic for image-only PDFs that DID return some hidden glyphs but
  // nothing usable (a few stray characters across many pages).
  if (allItems.length < doc.numPages * 4) {
    notes.push(`suspiciously-low-text-density: ${allItems.length} items / ${doc.numPages} pages`);
    return {
      externalPosition: null,
      totalCompetitors: null,
      fleet: null,
      classDetection: "absent",
      pageDates: [],
      ambiguous: false,
      pageTitle: "",
      notes,
      imageOnly: true,
    };
  }

  // Group items into rows by (page, y). PDF y goes bottom-to-top, so within
  // a page we sort descending by y to read top-to-bottom.
  const rows = clusterRows(allItems);

  const pageText = allItems.map((i) => i.str).join(" ");
  const pageDates = extractDates(pageText);
  const pageTitle = rows[0]?.text ?? "";

  // Identify ILCA 7 sections.
  const sections = findSections(rows);
  notes.push(`sections: ${sections.map((s) => s.classDetection).join(",")}`);

  // Page-level ambiguity check.
  const allRowTexts = rows.map((r) => r.text);
  const matchCount = countNameMatches(allRowTexts);
  const ambiguous = matchCount > 1;

  // Walk sections in preference order: match → absent → mismatch.
  const ordered = [...sections].sort((a, b) => rankClass(a.classDetection) - rankClass(b.classDetection));

  for (const section of ordered) {
    if (section.classDetection === "mismatch") break; // never accept

    const sectionRows = rows.slice(section.start, section.end);
    const hitIdx = sectionRows.findIndex((r) => nameMatchScore(r.text) === 1.0);
    if (hitIdx === -1) continue;

    const hit = sectionRows[hitIdx];
    const externalPosition = parsePositionFromRow(hit, sectionRows);
    const totalCompetitors = countDataRows(sectionRows);
    const fleet = section.fleetLabel ?? hit.text;

    notes.push(`hit-section-class=${section.classDetection}`);
    notes.push(`hit-row="${hit.text.slice(0, 100)}"`);

    return {
      externalPosition,
      totalCompetitors,
      fleet,
      classDetection: section.classDetection,
      pageDates,
      ambiguous,
      pageTitle,
      notes,
      imageOnly: false,
    };
  }

  notes.push("no-row-matched-in-acceptable-section");
  return {
    externalPosition: null,
    totalCompetitors: null,
    fleet: null,
    classDetection: "absent",
    pageDates,
    ambiguous,
    pageTitle,
    notes,
    imageOnly: false,
  };
}

function rankClass(d: ClassDetection): number {
  return d === "match" ? 0 : d === "absent" ? 1 : 2;
}

function clusterRows(items: TextItem[]): Row[] {
  // Sort by page asc, then y desc (PDF y grows upward → top of page first).
  const sorted = [...items].sort(
    (a, b) => a.page - b.page || b.y - a.y || a.x - b.x,
  );

  const rows: Row[] = [];
  let current: TextItem[] = [];
  let currentY: number | null = null;
  let currentPage: number | null = null;

  const flush = () => {
    if (current.length === 0) return;
    const ordered = [...current].sort((a, b) => a.x - b.x);
    rows.push({
      page: ordered[0].page,
      y: ordered[0].y,
      items: ordered,
      text: ordered.map((i) => i.str).join(" ").replace(/\s+/g, " ").trim(),
    });
    current = [];
  };

  for (const item of sorted) {
    if (
      currentPage === null ||
      currentY === null ||
      item.page !== currentPage ||
      Math.abs(item.y - currentY) > ROW_TOLERANCE
    ) {
      flush();
      currentPage = item.page;
      currentY = item.y;
    }
    current.push(item);
  }
  flush();
  return rows;
}

/**
 * Identify class-section boundaries by scanning rows for positive/negative
 * class headers. Each header opens a new section that runs until the next
 * header (positive or negative).
 *
 * Headers are short rows (≤ ~6 items) whose text matches one of the regexes.
 * This avoids misclassifying a results row that happens to mention "ILCA 7".
 */
function findSections(rows: Row[]): Section[] {
  type Boundary = { idx: number; type: "positive" | "negative"; label: string };
  const boundaries: Boundary[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.items.length > 8) continue; // body row, not a header
    if (POSITIVE_HEADER_RE.test(r.text)) {
      boundaries.push({ idx: i, type: "positive", label: r.text });
    } else if (NEGATIVE_HEADER_RE.test(r.text)) {
      boundaries.push({ idx: i, type: "negative", label: r.text });
    }
  }

  if (boundaries.length === 0) {
    // No section markers: treat whole doc as one section, classify on full text.
    const allText = rows.map((r) => r.text).join("\n");
    return [{
      start: 0,
      end: rows.length,
      classDetection: classify(allText),
      fleetLabel: null,
    }];
  }

  const sections: Section[] = [];
  // Optional pre-section before first boundary — usually metadata, ignore.
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    const next = boundaries[i + 1];
    sections.push({
      start: b.idx,
      end: next ? next.idx : rows.length,
      classDetection: b.type === "positive" ? "match" : "mismatch",
      fleetLabel: b.label,
    });
  }
  return sections;
}

/**
 * Find a finish position by looking at the leftmost cells of the matched row.
 *
 * Strategy:
 *   1. The matched row's items are sorted by x (ascending).
 *   2. The first integer in [1, 500] that is NOT a 4–6 digit sail number
 *      (column heuristic: ~before column 4) is the finishing position.
 */
function parsePositionFromRow(row: Row, _sectionRows: Row[]): number | null {
  for (const item of row.items.slice(0, 4)) {
    const raw = item.str.trim();
    if (/^[A-Z]{2,4}$/.test(raw)) continue; // DNF, DNC, OCS, etc.
    const m = raw.match(/^(\d{1,3})(?:st|nd|rd|th)?\.?$/i);
    if (!m) continue;
    const n = Number(m[1]);
    if (n >= 1 && n <= 500) return n;
  }
  return null;
}

/** Count rows that look like data rows (have at least 4 items — pos/sail/name/score). */
function countDataRows(rows: Row[]): number | null {
  const data = rows.filter((r) => {
    if (r.items.length < 4) return false;
    // Must start with a small integer in column 1.
    const first = r.items[0].str.trim();
    return /^\d{1,3}(?:st|nd|rd|th)?\.?$/i.test(first);
  });
  return data.length > 1 ? data.length : null;
}
