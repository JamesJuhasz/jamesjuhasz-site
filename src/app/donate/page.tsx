import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/*
  Day 1 placeholder. Day 4 (Prompt 9) builds the full /donate page —
  hero + Donorbox embed + giving levels + transparency + FAQ.
*/

export const metadata = {
  title: "Donate — Help me get to LA 2028",
  description:
    "Support James Juhasz's Olympic sailing campaign. Recurring monthly support makes the biggest difference.",
};

export default function DonatePage() {
  return (
    <section className="py-section-y-lg">
      <Container width="narrow">
        <Badge tone="donate">Donate</Badge>
        <h1 className="mt-4 font-serif text-h1 text-navy">
          Help me get to LA 2028.
        </h1>
        <p className="mt-4 text-body-lg text-ink/80">
          Day 1 placeholder. The full donate page — Donorbox embed, giving
          tiers, transparency, FAQ — ships on Day 4.
        </p>
        <div className="mt-8">
          <Button variant="donate" size="lg" disabled>
            Donorbox embed lands Day 4
          </Button>
        </div>
      </Container>
    </section>
  );
}
