"use client";

import * as React from "react";
import { careerTimeline } from "@/lib/seed-data";

type Item = (typeof careerTimeline)[number];

/* Image heights are fixed per breakpoint so the connecting rail and the
   dots line up across every card. If you change these, also update the
   matching `top-[…]` values on the rail line below. */
const IMG_H = "h-64 sm:h-72 md:h-80 lg:h-96";

/* Distance ranges (px) for the scale/opacity falloff. */
const FALLOFF = 720;

export function CareerTimeline() {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);

  /* On every scroll/resize, query cards by data-step (no ref array — those
     get nulled-then-reset on every parent re-render, and `setActive` from
     inside compute would race with that), then write transform + opacity
     straight to each <li>. CSS transitions on the cards smooth it out, so
     no spring is needed.

     Reduced-motion users get the unstyled (full-size) layout, since we
     simply never write the transform/opacity inline styles for them. */
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let lastActive = -1;

    const compute = () => {
      const cards = scroller.querySelectorAll<HTMLLIElement>("[data-step]");
      const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      cards.forEach((el, i) => {
        const cardCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (!reduce) {
          const t = Math.min(1, dist / FALLOFF);
          const scale = 1 - t * 0.18;
          const opacity = 1 - t * 0.55;
          const y = t * 10;
          el.style.transform = `translateY(${y}px) scale(${scale})`;
          el.style.opacity = String(opacity);
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      if (bestIdx !== lastActive) {
        lastActive = bestIdx;
        setActive(bestIdx);
      }
    };

    /* Scroll fires often enough that calling compute directly on each event
       is fine — DOM writes are cheap and the browser already coalesces
       repaints. Skipping rAF here also keeps things working when the tab is
       backgrounded (rAF is paused, but scroll events still deliver). */
    const onScroll = () => compute();

    /* First paint reflects the initial scroll position. */
    compute();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(`[data-step="${i}"]`);
    if (!card) return;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    el.scrollTo({ left: cardCenter - el.clientWidth / 2, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Career timeline, scroll horizontally"
        className="
          relative
          overflow-x-auto overflow-y-hidden
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
          [scroll-snap-type:x_mandatory]
        "
      >
        <ol
          className="
            relative flex items-start w-max
            gap-10 md:gap-16
            pt-4 pb-6 md:pt-6 md:pb-8
            ps-[calc(50%-39vw)] pe-[calc(50%-39vw)]
            sm:ps-[calc(50%-29vw)] sm:pe-[calc(50%-29vw)]
            md:ps-[calc(50%-12rem)] md:pe-[calc(50%-12rem)]
            lg:ps-[calc(50%-13rem)] lg:pe-[calc(50%-13rem)]
          "
        >
          {/* Connecting rail. Top values must match (pt + IMG_H + 1rem). */}
          <span
            aria-hidden
            className="
              pointer-events-none absolute left-0 right-0 h-px bg-mist
              top-[calc(1rem+16rem+1rem)]
              sm:top-[calc(1rem+18rem+1rem)]
              md:top-[calc(1.5rem+20rem+1rem)]
              lg:top-[calc(1.5rem+24rem+1rem)]
            "
          />
          {careerTimeline.map((item, i) => (
            <TimelineCard
              key={item.year}
              item={item}
              index={i}
              total={careerTimeline.length}
              isActive={active === i}
            />
          ))}
        </ol>
      </div>

      {/* Step indicator + arrow controls */}
      <div className="mt-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => scrollToIndex(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label="Previous step"
          className="
            inline-flex h-10 w-10 items-center justify-center rounded-pill
            border border-mist bg-paper text-ink
            transition hover:bg-fog hover:border-haze
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 12 6 8l4-4" />
          </svg>
        </button>

        <div
          className="flex items-center gap-2 overflow-x-auto"
          role="tablist"
          aria-label="Timeline steps"
        >
          {careerTimeline.map((item, i) => (
            <button
              key={item.year}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`${item.year} — ${item.title}`}
              onClick={() => scrollToIndex(i)}
              className={`
                h-1.5 rounded-pill transition-all duration-300 shrink-0
                ${active === i ? "w-8 bg-red" : "w-2 bg-mist hover:bg-haze"}
              `}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            scrollToIndex(Math.min(careerTimeline.length - 1, active + 1))
          }
          disabled={active === careerTimeline.length - 1}
          aria-label="Next step"
          className="
            inline-flex h-10 w-10 items-center justify-center rounded-pill
            border border-mist bg-paper text-ink
            transition hover:bg-fog hover:border-haze
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 4 4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TimelineCard({
  item,
  index,
  total,
  isActive,
}: {
  item: Item;
  index: number;
  total: number;
  isActive: boolean;
}) {
  /* CSS handles the smoothing — we just write transform/opacity per frame
     from the scroll handler in the parent. transform-origin keeps the card
     anchored at center while it scales. The transition is suppressed when
     the user prefers reduced motion via a media query. */
  return (
    <li
      data-step={index}
      data-active={isActive ? "true" : undefined}
      className="
        relative shrink-0 origin-center
        w-[78vw] sm:w-[58vw] md:w-[24rem] lg:w-[26rem]
        [scroll-snap-align:center]
        transition-[transform,opacity] duration-200 ease-out
        motion-reduce:transition-none
      "
    >
      <article className="grid">
        <div className={`relative ${IMG_H} overflow-hidden bg-haze/40`}>
          {/* Plain <img> instead of next/image: Next's IntersectionObserver-
              based lazy loading is unreliable inside a horizontally
              overflowing scroller (cards past the right edge can stay
              unloaded forever), and these are small static photos where
              the optimization isn't worth the fragility. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.image}
            alt={`${item.title} — ${item.location}`}
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Rail strip — dot sits at the line's Y. */}
        <div className="relative h-8 flex items-center justify-center">
          <span
            aria-hidden
            className={`
              inline-flex rounded-full bg-red ring-4 ring-paper origin-center
              transition-all duration-300
              ${isActive ? "h-4 w-4" : "h-3 w-3"}
            `}
          />
        </div>

        <div className="text-center pt-2">
          <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-2">
            <span className="font-mono">{item.year}</span>
            <span className="mx-2 text-ink-3/60">·</span>
            {item.location}
          </p>
          <h3 className="font-display text-h3 text-ink">{item.title}</h3>
          <p className="mt-3 text-body text-ink/75 mx-auto max-w-prose">
            {item.body}
          </p>

          {item.results.length > 0 && (
            <ul className="mt-5 inline-flex flex-col gap-1.5 text-left border-l-2 border-red/70 pl-4">
              {item.results.map((r) => (
                <li
                  key={r}
                  className="text-caption font-mono uppercase tracking-wider text-ink-2"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <span className="sr-only">
          Step {index + 1} of {total}: {item.title}
        </span>
      </article>
    </li>
  );
}
