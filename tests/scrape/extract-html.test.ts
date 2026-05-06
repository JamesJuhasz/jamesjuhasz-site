import { describe, expect, it } from "vitest";
import { extractFromHtml } from "../../src/lib/scrape/extract-html";

describe("extractFromHtml — single ILCA 7 table", () => {
  const html = `
    <!doctype html><html><body>
      <h1>53rd Trofeo Princesa Sofia 2026 — ILCA 7 Men</h1>
      <p>Held 27 March - 4 April 2026 in Palma de Mallorca.</p>
      <table>
        <caption>ILCA 7 Men — Final Standings</caption>
        <thead><tr><th>Pos</th><th>Sail</th><th>Name</th><th>Nat</th><th>Total</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>9876</td><td>SCOTT Matt</td><td>AUS</td><td>14</td></tr>
          <tr><td>2</td><td>4321</td><td>STIPANOVIC Tonci</td><td>CRO</td><td>22</td></tr>
          <tr><td>43</td><td>17</td><td>JUHASZ James</td><td>CAN</td><td>198</td></tr>
          <tr><td>44</td><td>1234</td><td>OTHER Person</td><td>USA</td><td>200</td></tr>
        </tbody>
      </table>
    </body></html>
  `;

  it("finds James's row and parses position", () => {
    const r = extractFromHtml(html);
    expect(r.externalPosition).toBe(43);
  });
  it("counts data rows", () => {
    const r = extractFromHtml(html);
    expect(r.totalCompetitors).toBe(4);
  });
  it("captures fleet from caption", () => {
    const r = extractFromHtml(html);
    expect(r.fleet).toContain("ILCA 7");
  });
  it("classifies as match", () => {
    const r = extractFromHtml(html);
    expect(r.classDetection).toBe("match");
  });
  it("extracts page dates", () => {
    const r = extractFromHtml(html);
    expect(r.pageDates.some((d) => d.startsWith("2026-"))).toBe(true);
  });
  it("not ambiguous (only one James Juhasz row)", () => {
    const r = extractFromHtml(html);
    expect(r.ambiguous).toBe(false);
  });
});

describe("extractFromHtml — mixed-fleet doc rejects ILCA 6 hit", () => {
  // Two tables: ILCA 6 lists a "James Juhasz" by mistake (or namesake);
  // ILCA 7 has the real entry. Verifier must prefer the ILCA 7 hit.
  const html = `
    <!doctype html><html><body>
      <h2>ILCA 6 Women — Final Standings</h2>
      <table><caption>ILCA 6 Women</caption>
        <tr><th>Pos</th><th>Name</th></tr>
        <tr><td>5</td><td>James Juhasz</td></tr>
      </table>
      <h2>ILCA 7 Men — Final Standings</h2>
      <table><caption>ILCA 7 Men</caption>
        <tr><th>Pos</th><th>Name</th></tr>
        <tr><td>43</td><td>James Juhasz</td></tr>
      </table>
    </body></html>
  `;
  it("picks ILCA 7 row, not ILCA 6", () => {
    const r = extractFromHtml(html);
    expect(r.externalPosition).toBe(43);
    expect(r.classDetection).toBe("match");
  });
  it("flags ambiguous (two rows match across tables)", () => {
    const r = extractFromHtml(html);
    expect(r.ambiguous).toBe(true);
  });
});

describe("extractFromHtml — ILCA 6 only doc rejects entirely", () => {
  const html = `
    <!doctype html><html><body>
      <h1>ILCA 6 Women — Final</h1>
      <table><caption>ILCA 6 Women</caption>
        <tr><th>Pos</th><th>Name</th></tr>
        <tr><td>5</td><td>James Juhasz</td></tr>
      </table>
    </body></html>
  `;
  it("returns null position with mismatch class", () => {
    const r = extractFromHtml(html);
    expect(r.externalPosition).toBeNull();
    expect(r.classDetection).toBe("mismatch");
  });
});

describe("extractFromHtml — handles diacritic Juhász", () => {
  const html = `
    <!doctype html><html><body>
      <h1>ILCA 7 Final</h1>
      <table>
        <tr><th>Pos</th><th>Name</th></tr>
        <tr><td>17</td><td>Juhász, James</td></tr>
      </table>
    </body></html>
  `;
  it("matches the accented row", () => {
    const r = extractFromHtml(html);
    expect(r.externalPosition).toBe(17);
  });
});

describe("extractFromHtml — name not found", () => {
  const html = `<html><body><table><tr><td>1</td><td>Other Sailor</td></tr></table></body></html>`;
  it("returns null position", () => {
    const r = extractFromHtml(html);
    expect(r.externalPosition).toBeNull();
    expect(r.fleet).toBeNull();
  });
});
