import { ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { pressEntries } from "@/lib/seed-data";

export const metadata = {
  title: "Press",
  description:
    "Media coverage of James Juhasz's Olympic sailing campaign — selected articles and recognition.",
};

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
});

export default function PressPage() {
  const sorted = [...pressEntries].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const publications = Array.from(new Set(sorted.map((p) => p.publication)));

  return (
    <>
      <section className="py-section-y bg-foam-deep border-b border-line">
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
                  className="text-body-lg font-serif text-navy/70"
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
            <ul className="flex flex-col divide-y divide-line">
              {sorted.map((p) => (
                <li key={p.articleTitle} className="py-6 first:pt-0 last:pb-0">
                  <a
                    href={p.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group grid md:grid-cols-12 gap-4 items-start"
                  >
                    <div className="md:col-span-3">
                      <Badge>{p.publication}</Badge>
                      <p className="mt-2 text-caption text-mist">
                        {dateFmt.format(new Date(p.publishedAt))}
                      </p>
                    </div>
                    <div className="md:col-span-8">
                      <h3 className="font-serif text-h3 text-navy group-hover:text-navy-deep transition-colors">
                        {p.articleTitle}
                      </h3>
                      {p.excerpt ? (
                        <p className="mt-2 text-body text-ink/75 max-w-prose">
                          {p.excerpt}
                        </p>
                      ) : null}
                    </div>
                    <span className="md:col-span-1 inline-flex items-center justify-end text-mist group-hover:text-navy">
                      <ExternalLink size={18} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="default">
          <div className="grid lg:grid-cols-3 gap-8 items-center">
            <Card className="lg:col-span-2">
              <p className="text-eyebrow uppercase tracking-wider text-mist mb-2">
                For media inquiries
              </p>
              <h3 className="font-serif text-h3 text-navy">
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
                <p className="text-eyebrow uppercase tracking-wider text-sand">
                  Quick links
                </p>
                <a
                  href="/about"
                  className="text-body text-foam hover:underline"
                >
                  Bio + career timeline
                </a>
                <a
                  href="/events"
                  className="text-body text-foam hover:underline"
                >
                  Recent + upcoming events
                </a>
                <a
                  href="/gallery"
                  className="text-body text-foam hover:underline"
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
