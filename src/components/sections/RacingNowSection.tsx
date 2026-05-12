import { Container } from "@/components/ui/Container";
import { ResultCard } from "@/components/cards/ResultCard";
import { Reveal } from "@/components/ui/Reveal";
import type { Result } from "@/lib/results";

export function RacingNowSection({ ongoing }: { ongoing: Result[] }) {
  if (ongoing.length === 0) return null;
  return (
    <section className="py-section-y bg-fog border-b border-mist">
      <Container width="wide">
        <h2 className="font-display text-h1 text-ink mb-8">Racing now</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {ongoing.map((r, i) => (
            <Reveal key={r.id} delay={Math.min(i * 0.06, 0.18)}>
              <ResultCard result={r} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
