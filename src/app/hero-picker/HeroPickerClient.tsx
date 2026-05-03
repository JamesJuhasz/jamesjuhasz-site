"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Check, Save, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

/*
  Slot model:
   - "hero"       — single (one winner) — home page background
   - "portrait"   — single — about page hero
   - "event"      — single — featured event card on home
   - "section-bg" — multi — anywhere we currently have a gradient placeholder
   - "skip"       — multi — hide from layout (still visible in picker)
*/

type Slot = "hero" | "portrait" | "event" | "section-bg" | "skip";

const SINGLE_SLOTS: ReadonlyArray<Slot> = ["hero", "portrait", "event"];

const SLOT_META: Record<
  Slot,
  { label: string; tone: string; activeTone: string; description: string }
> = {
  hero: {
    label: "Hero",
    tone: "ring-1 ring-line text-navy bg-foam hover:bg-foam-deep",
    activeTone: "bg-donate text-white ring-donate shadow-soft",
    description: "Home page background — pick one.",
  },
  portrait: {
    label: "Portrait",
    tone: "ring-1 ring-line text-navy bg-foam hover:bg-foam-deep",
    activeTone: "bg-navy text-foam ring-navy shadow-soft",
    description: "About page hero — pick one.",
  },
  event: {
    label: "Event",
    tone: "ring-1 ring-line text-navy bg-foam hover:bg-foam-deep",
    activeTone: "bg-sand-warm text-navy ring-sand-warm shadow-soft",
    description: "Featured event card on home — pick one.",
  },
  "section-bg": {
    label: "Section bg",
    tone: "ring-1 ring-line text-navy bg-foam hover:bg-foam-deep",
    activeTone: "bg-navy-soft text-foam ring-navy-soft shadow-soft",
    description: "Section / card backgrounds — pick any number.",
  },
  skip: {
    label: "Skip",
    tone: "ring-1 ring-line text-mist bg-foam hover:bg-foam-deep",
    activeTone: "bg-mist text-foam ring-mist",
    description: "Hide from layout (still visible here).",
  },
};

const STORAGE_KEY = "hero-picker:picks-v1";

type Picks = Record<string, Slot | null>;

export function HeroPickerClient({ candidates }: { candidates: string[] }) {
  const [picks, setPicks] = useState<Picks>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Hydrate from API (or localStorage as fallback) once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let initial: Picks = {};
      try {
        const res = await fetch("/api/picks", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { picks?: Picks };
          if (data.picks) initial = data.picks;
        }
      } catch {}
      // Merge localStorage on top (so unsaved edits survive)
      try {
        const ls = localStorage.getItem(STORAGE_KEY);
        if (ls) {
          const parsed = JSON.parse(ls) as Picks;
          initial = { ...initial, ...parsed };
        }
      } catch {}
      if (!cancelled) {
        setPicks(initial);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {}
  }, [picks, hydrated]);

  function setSlot(file: string, slot: Slot) {
    setPicks((current) => {
      const next: Picks = { ...current };
      // For single-slot designations, clear any other photo holding that slot
      if (SINGLE_SLOTS.includes(slot)) {
        for (const [k, v] of Object.entries(next)) {
          if (v === slot && k !== file) next[k] = null;
        }
      }
      // Toggle off if same slot tapped again
      next[file] = next[file] === slot ? null : slot;
      return next;
    });
    setSaveState("idle");
  }

  function clearAll() {
    setPicks({});
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        body: JSON.stringify({ picks }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  const summary = useMemo(() => {
    const counts: Record<Slot, string[]> = {
      hero: [],
      portrait: [],
      event: [],
      "section-bg": [],
      skip: [],
    };
    for (const [file, slot] of Object.entries(picks)) {
      if (slot) counts[slot].push(file);
    }
    return counts;
  }, [picks]);

  const totalAssigned =
    summary.hero.length +
    summary.portrait.length +
    summary.event.length +
    summary["section-bg"].length;

  return (
    <>
      {/* Sticky summary panel */}
      <div className="sticky top-20 z-20 mt-8 -mx-container-x px-container-x py-4 bg-foam/85 backdrop-blur-md ring-1 ring-line rounded-2xl">
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
          <SummaryItem label="Hero" filename={summary.hero[0]} />
          <SummaryItem label="Portrait" filename={summary.portrait[0]} />
          <SummaryItem label="Event" filename={summary.event[0]} />
          <SummaryItem
            label="Section bg"
            count={summary["section-bg"].length}
          />
          <SummaryItem label="Skip" count={summary.skip.length} muted />
          <div className="flex-1" />
          <button
            type="button"
            onClick={clearAll}
            disabled={totalAssigned === 0 && summary.skip.length === 0}
            className="text-caption text-mist hover:text-donate disabled:opacity-40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saveState === "saving"}
            className={cn(
              "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-caption font-medium transition-colors",
              saveState === "saved"
                ? "bg-navy text-foam"
                : "bg-donate text-white hover:bg-donate-hover disabled:opacity-60",
            )}
          >
            {saveState === "saved" ? (
              <>
                <Check size={14} /> Saved
              </>
            ) : saveState === "saving" ? (
              "Saving..."
            ) : (
              <>
                <Save size={14} /> Save picks
              </>
            )}
          </button>
        </div>
        {saveState === "error" ? (
          <p className="mt-2 text-caption text-donate">
            Save failed. Dev server still running? Picks remain in browser
            storage either way.
          </p>
        ) : null}
      </div>

      {/* Slot legend */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-caption text-mist hover:text-navy">
          What do the slots mean?
        </summary>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-caption text-ink/75">
          {(Object.keys(SLOT_META) as Slot[]).map((slot) => (
            <li key={slot} className="inline-flex gap-2">
              <span
                className={cn(
                  "rounded-pill px-2 py-0.5 text-eyebrow uppercase tracking-wider",
                  SLOT_META[slot].activeTone,
                )}
              >
                {SLOT_META[slot].label}
              </span>
              <span>{SLOT_META[slot].description}</span>
            </li>
          ))}
        </ul>
      </details>

      {/* Grid */}
      {candidates.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-foam-deep ring-1 ring-line p-6">
          <p className="text-body text-mist">
            No candidates found. Drop image files into{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-caption">
              public/images/hero-candidates/
            </code>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((file) => {
            const slot = picks[file] ?? null;
            const isSkipped = slot === "skip";
            return (
              <li
                key={file}
                className={cn(
                  "rounded-2xl overflow-hidden ring-1 bg-white transition-all",
                  slot === "hero" && "ring-2 ring-donate shadow-lift",
                  slot === "portrait" && "ring-2 ring-navy shadow-lift",
                  slot === "event" && "ring-2 ring-sand-warm shadow-lift",
                  slot === "section-bg" && "ring-1 ring-navy-soft",
                  !slot && "ring-line",
                  isSkipped && "opacity-40 ring-line",
                )}
              >
                <div className="relative aspect-[3/2] bg-foam-deep">
                  <Image
                    src={`/images/hero-candidates/${file}`}
                    alt={file}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  {slot && slot !== "skip" ? (
                    <div className="absolute top-3 left-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-eyebrow uppercase tracking-wider font-medium",
                          SLOT_META[slot].activeTone,
                        )}
                      >
                        <Check size={12} />
                        {SLOT_META[slot].label}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="font-mono text-caption text-mist truncate flex-1"
                      title={file}
                    >
                      {file}
                    </p>
                    <Link
                      href={`/images/hero-candidates/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-mist hover:text-navy"
                      aria-label="Open full size"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["hero", "portrait", "event", "section-bg"] as Slot[]).map(
                      (s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSlot(file, s)}
                          aria-pressed={slot === s}
                          className={cn(
                            "rounded-pill px-2.5 py-1 text-caption font-medium transition-all",
                            slot === s
                              ? SLOT_META[s].activeTone
                              : SLOT_META[s].tone,
                          )}
                        >
                          {SLOT_META[s].label}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setSlot(file, "skip")}
                      aria-pressed={slot === "skip"}
                      className={cn(
                        "ml-auto inline-flex items-center justify-center h-7 w-7 rounded-pill transition-all",
                        slot === "skip"
                          ? SLOT_META.skip.activeTone
                          : "ring-1 ring-line text-mist bg-foam hover:bg-foam-deep hover:text-donate",
                      )}
                      aria-label="Skip"
                      title="Skip"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-16 rounded-2xl bg-foam-deep ring-1 ring-line p-6">
        <h2 className="font-serif text-h3 text-navy">When you're done</h2>
        <ol className="mt-4 list-decimal list-inside space-y-2 text-body text-ink/80">
          <li>
            Hit <strong>Save picks</strong>. Writes to{" "}
            <code className="bg-white px-1.5 py-0.5 rounded text-caption">
              .picks.json
            </code>{" "}
            at the project root (gitignored).
          </li>
          <li>
            Tell me you're done. I'll read the file, optimize the chosen
            photos via sharp, and wire them into the layout.
          </li>
          <li>localStorage also keeps your picks if you refresh.</li>
        </ol>
      </div>
    </>
  );
}

function SummaryItem({
  label,
  filename,
  count,
  muted,
}: {
  label: string;
  filename?: string;
  count?: number;
  muted?: boolean;
}) {
  const empty = filename === undefined && (count === undefined || count === 0);
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        empty && "text-mist",
        muted && "text-mist",
      )}
    >
      <span className="text-eyebrow uppercase tracking-wider">{label}</span>
      <span className="text-caption font-mono">
        {filename
          ? filename.replace(/\.[^.]+$/, "")
          : count !== undefined
            ? `${count}`
            : "—"}
      </span>
    </div>
  );
}
