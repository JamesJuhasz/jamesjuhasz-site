import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { SITE } from "@/lib/site";

/*
  Day 1 home page — placeholder. Confirms layout shell renders correctly
  with header, footer, and donation CTAs on every viewport.
  Day 2 (Prompt 4) replaces this with the full conversion-optimized home page.
*/

export default function HomePage() {
  return (
    <>
      <section className="py-section-y-lg">
        <Container>
          <Badge tone="sand">Day 1 placeholder — full home lands Day 2</Badge>
          <h1 className="mt-6 font-serif text-display tracking-tight text-navy">
            {SITE.name}
          </h1>
          <p className="mt-4 max-w-prose text-body-lg text-ink/75">
            {SITE.tagline}. {SITE.shortDescription}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              href="/donate"
              variant="donate"
              size="lg"
              data-cta-location="home_hero"
            >
              Support the campaign
            </Button>
            <Button href="/design-system" variant="ghost" size="lg">
              View design system
            </Button>
          </div>
        </Container>
      </section>

      <DonateCTAInline location="home_inline_1" />
    </>
  );
}
