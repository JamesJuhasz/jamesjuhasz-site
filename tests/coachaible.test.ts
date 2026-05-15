import { describe, expect, it } from "vitest";
import {
  consolidateEvents,
  filterDisplayable,
  filterOngoing,
  type CoachaibleRawEvent,
  type ConsolidatedEvent,
} from "../src/lib/coachaible";

describe("filterOngoing", () => {
  const ev = (
    overrides: Partial<ConsolidatedEvent> & { startDate: string; endDate: string },
  ): ConsolidatedEvent => ({
    id: "x",
    title: "T",
    eventType: "training",
    racePriority: null,
    country: null,
    ...overrides,
  });

  it("keeps events where today falls within [startDate, endDate]", () => {
    const events = [ev({ startDate: "2026-05-14", endDate: "2026-05-21" })];
    expect(filterOngoing(events, "2026-05-15")).toEqual(events);
  });

  it("treats endpoints as inclusive", () => {
    const events = [ev({ startDate: "2026-05-14", endDate: "2026-05-21" })];
    expect(filterOngoing(events, "2026-05-14")).toEqual(events);
    expect(filterOngoing(events, "2026-05-21")).toEqual(events);
  });

  it("drops events that haven't started or have already ended", () => {
    const events = [
      ev({ id: "a", startDate: "2026-05-20", endDate: "2026-05-21" }),
      ev({ id: "b", startDate: "2026-05-10", endDate: "2026-05-12" }),
    ];
    expect(filterOngoing(events, "2026-05-15")).toEqual([]);
  });

  it("regression — Bermuda training (May 14–21) is ongoing on May 15", () => {
    // The bug: ongoing training events disappeared from the schedule page
    // because the only ongoing source (getOngoingRegattas) skips non-race types.
    const raw: CoachaibleRawEvent[] = [
      {
        id: 401,
        title: "Bermuda",
        startDate: "2026-05-14",
        endDate: "2026-05-21",
        eventType: "training",
        racePriority: null,
      },
    ];
    const ongoing = filterOngoing(
      filterDisplayable(consolidateEvents(raw)),
      "2026-05-15",
    );
    expect(ongoing.map((e) => e.title)).toEqual(["Bermuda"]);
  });
});
