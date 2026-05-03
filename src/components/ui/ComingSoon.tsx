import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/*
  Day 1 stub helper for routes that ship later in the migration.
  Replace each callsite with the real page on the listed Day.
*/

export function ComingSoon({
  title,
  day,
  blurb,
}: {
  title: string;
  day: string;
  blurb?: string;
}) {
  return (
    <section className="py-section-y-lg">
      <Container width="narrow">
        <Badge tone="sand">Coming on {day}</Badge>
        <h1 className="mt-4 font-serif text-h1 text-navy">{title}</h1>
        {blurb ? (
          <p className="mt-4 text-body-lg text-ink/75">{blurb}</p>
        ) : null}
        <div className="mt-8 flex gap-3">
          <Button href="/" variant="ghost">
            Back home
          </Button>
          <Button href="/donate" variant="donate" data-cta-location="stub_page">
            Donate now
          </Button>
        </div>
      </Container>
    </section>
  );
}
