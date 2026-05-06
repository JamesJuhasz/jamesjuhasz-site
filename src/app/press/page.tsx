import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getPressMentions } from "@/sanity/fetch";

export const revalidate = 60;

export const metadata = {
  title: "Press",
  description:
    "Media coverage of James Juhasz's Olympic sailing campaign — selected articles and recognition.",
};

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
});

/**
 * Hand-mapped monograms for known publications. Falls back to the first 1-2
 * uppercase letters of the publication name for anything not in the table.
 */
const MONOGRAM_MAP: Record<string, string> = {
  "sail canada": "SC",
  "toronto guardian": "TG",
  "sail-world.com": "SW",
  "sail-world": "SW",
  "world sailing": "WS",
  "sailweb": "SW",
  "scuttlebutt": "SB",
  "scuttlebutt sailing news": "SB",
  "oakville news": "ON",
  "oakville beaver": "OB",
  "afloat.ie": "AF",
  "afloat": "AF",
  "inhalton": "IN",
  "inhalton.com": "IN",
};

function getMonogram(publication: string): string {
  const key = publication.trim().toLowerCase();
  if (MONOGRAM_MAP[key]) return MONOGRAM_MAP[key];

  // Fallback: take first letters of the first two words, uppercased.
  const words = publication
    .replace(/[^A-Za-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  // Last resort: strip non-alpha and take first two chars.
  const stripped = publication.replace(/[^A-Za-z]/g, "");
  return stripped.slice(0, 2).toUpperCase() || "··";
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+-\s+\S.*$/, "") // strip " - Publication Name" suffix
    .trim();
}

export default async function PressPage() {
  const press = await getPressMentions();
  const sorted = [...press].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  // Deduplicate same-story articles from different publications, keeping the
  // entry with an image where one exists.
  const byTitle = new Map<string, (typeof sorted)[0]>();
  for (const p of sorted) {
    const key = normalizeTitle(p.articleTitle);
    const existing = byTitle.get(key);
    if (!existing || (!existing.imageUrl && p.imageUrl)) {
      byTitle.set(key, p);
    }
  }
  const deduped = Array.from(byTitle.values()).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const publications = Array.from(new Set(deduped.map((p) => p.publication)));

  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/dsc_1946.jpg"
          alt="Action photographed on the racecourse"
          priority
          amount={0.1}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <p className="text-eyebrow uppercase font-medium text-paper/70 mb-3">
            Press
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            Media & recognition
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-paper/85">
            Selected coverage of the campaign — published articles, profiles, and results coverage.
          </p>
          {publications.length > 1 ? (
            <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
              {publications.map((p) => (
                <li
                  key={p}
                  className="text-body-lg font-display text-paper/75"
                >
                  {p}
                </li>
              ))}
            </ul>
          ) : null}
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="default">
          <Reveal>
            <ul className="flex flex-col divide-y divide-mist">
              {deduped.map((p) => (
                <li key={p.externalUrl} className="py-6 first:pt-0 last:pb-0">
                  <a
                    href={p.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group grid md:grid-cols-12 gap-4 items-start"
                  >
                    <div className="md:col-span-3">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imageUrl}
                          alt=""
                          loading="lazy"
                          className="w-full aspect-[4/3] object-cover rounded-md bg-fog mb-3"
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="w-12 h-12 mb-3 inline-flex items-center justify-center bg-fog ring-1 ring-mist rounded-md font-display text-h3 font-semibold text-ink-3"
                        >
                          {getMonogram(p.publication)}
                        </div>
                      )}
                      <Badge>{p.publication}</Badge>
                      <p className="mt-2 text-caption text-ink-3">
                        {dateFmt.format(new Date(p.publishedAt))}
                      </p>
                    </div>
                    <div className="md:col-span-8">
                      <h3 className="font-display text-h3 text-ink group-hover:text-ink-2 transition-colors">
                        {p.articleTitle}
                      </h3>
                      {p.excerpt ? (
                        <p className="mt-2 text-body text-ink/75 max-w-prose">
                          {p.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <span className="md:col-span-1 inline-flex items-center justify-end text-ink-3 group-hover:text-ink">
                      <ExternalLink size={18} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section className="py-section-y bg-fog border-y border-mist">
        <Container width="default">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <Card className="lg:col-span-2">
              <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-2">
                For media inquiries
              </p>
              <h3 className="font-display text-h3 text-ink">
                Press, sponsorship, and partnership inquiries
              </h3>
              <p className="mt-3 text-body text-ink/75 max-w-prose">
                Available for interviews, profiles, and partnership
                conversations. Quickest response via the contact form.
              </p>
              <div className="mt-4">
                <Button href="/contact" variant="secondary" size="md">
                  Contact James
                </Button>
              </div>
            </Card>
            <div>
              <Card tone="navy" className="flex flex-col gap-3">
                <p className="text-eyebrow uppercase tracking-wider text-red">
                  Quick links
                </p>
                <a
                  href="/about"
                  className="text-body text-paper hover:underline"
                >
                  Bio + career timeline
                </a>
                <a
                  href="/events"
                  className="text-body text-paper hover:underline"
                >
                  Recent + upcoming events
                </a>
                <a
                  href="/gallery"
                  className="text-body text-paper hover:underline"
                >
                  Photo library
                </a>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      <DonateCTAInline
        location="press_inline"
        headline="Like what you've read?"
        body="Help me write the next chapter. Every contribution funds the next regatta, the next training block, the next start line."
        ctaLabel="Support the campaign"
      />
    </>
  );
}
