import { Reveal } from "@/components/ui/Reveal";
import { careerTimeline } from "@/lib/seed-data";

export function CareerTimeline() {
  return (
    <ol className="relative grid gap-10">
      <span
        aria-hidden
        className="absolute left-4 md:left-1/2 top-2 bottom-2 w-px bg-mist md:-translate-x-1/2"
      />
      {careerTimeline.map((item, i) => {
        const right = i % 2 === 1;
        return (
          <li
            key={item.year}
            className={`relative grid grid-cols-[2rem_1fr] md:grid-cols-12 gap-6 md:gap-12 items-start`}
          >
            <span
              aria-hidden
              className="md:col-start-7 md:-translate-x-1/2 mt-1 md:mt-2 inline-flex h-3 w-3 rounded-full bg-red ring-4 ring-paper"
            />
            <Reveal
              className={
                right
                  ? "md:col-start-8 md:col-end-13 md:pl-8"
                  : "md:col-start-1 md:col-end-7 md:pr-8"
              }
            >
              <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-2">
                {item.year} · {item.location}
              </p>
              <h3 className="font-display text-h3 text-ink">{item.title}</h3>
              <p className="mt-2 text-body text-ink/80 max-w-prose">
                {item.body}
              </p>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
