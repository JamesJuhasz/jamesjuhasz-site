import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getPressMentions } from "@/sanity/fetch";
import type { SeedPress } from "@/lib/seed-data";

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
 * Hand-curated URLs for articles where James is the primary subject but the
 * title/excerpt don't contain "Juhasz" explicitly. Auto-discovered entries
 * matching one of these are surfaced as featured.
 */
const featuredUrlMatchers: RegExp[] = [
  // Toronto Guardian: "Canadian sailor James Juhasz eyes post-pandemic competition"
  /toronto-guardian/i,
  // Sail Canada: "Juhasz named to Canadian Sailing Team for 2026 cycle"
  /juhasz-named/i,
];

function isJamesFeatured(p: SeedPress): boolean {
  if (p.featured) return true;
  const haystack = `${p.articleTitle} ${p.excerpt ?? ""}`.toLowerCase();
  if (haystack.includes("juhasz") || haystack.includes("james juhasz")) return true;
  if (featuredUrlMatchers.some((re) => re.test(p.externalUrl))) return true;
  return false;
}

export default async function PressPage() {
  const press = await getPressMentions();
  const sorted = [...press].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const featured = sorted.filter(isJamesFeatured);
  const others = sorted.filter((p) => !isJamesFeatured(p));
  const publications = Array.from(
    new Set(featured.map((p) => p.publication)),
  );

  return (
    <>
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="wide">
          <SectionHeader
            eyebrow="Press"
            title="Media & recognition"
            lede="Selected coverage of the campaign — published articles, profiles, and results coverage."
          />
          {publications.length > 1 ? (
            <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
              {publications.map((p) => (
                <li
                  key={p}
                  className="text-body-lg font-display text-ink/70"
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
              {featured.map((p) => (
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
                      ) : null}
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

      {others.length > 0 ? (
        <section className="py-section-y bg-fog border-t border-mist">
          <Container width="default">
            <SectionHeader
              eyebrow="Context"
              title="Canadian sailing in the news"
              lede="Coverage of the broader Canadian Olympic-class sailing scene — fellow teammates, fleet results, and program announcements."
            />
            <Reveal>
              <ul className="mt-10 flex flex-col divide-y divide-mist">
                {others.map((p) => (
                  <li
                    key={p.externalUrl}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <a
                      href={p.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group grid md:grid-cols-12 gap-3 items-baseline"
                    >
                      <p className="md:col-span-2 text-caption text-ink-3 font-mono">
                        {dateFmt.format(new Date(p.publishedAt))}
                      </p>
                      <p className="md:col-span-2 text-caption text-ink-3">
                        {p.publication}
                      </p>
                      <h4 className="md:col-span-7 text-body text-ink group-hover:text-ink-2 transition-colors">
                        {p.articleTitle}
                      </h4>
                      <span className="md:col-span-1 inline-flex items-center md:justify-end text-ink-3 group-hover:text-ink">
                        <ExternalLink size={14} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          </Container>
        </section>
      ) : null}

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
