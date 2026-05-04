/*
  /design-system — internal review page. NOT for public launch.
  404s in production; available in development for primitive review.
*/

import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatNumber } from "@/components/ui/StatNumber";
import {
  DonateCTAInline,
  DonateCTASidebar,
} from "@/components/cta/DonateCTA";

export const metadata = {
  title: "Design System (internal)",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "red", hex: "#D52B1E", role: "Canadian flag red — primary signal (≤10%)" },
  { name: "red-deep", hex: "#A6160C", role: "Pressed / hover" },
  { name: "ink", hex: "#0E1116", role: "Primary type, deep ink" },
  { name: "ink-2", hex: "#2A2F36", role: "Secondary type" },
  { name: "ink-3", hex: "#5A6068", role: "Tertiary / captions" },
  { name: "paper", hex: "#FFFFFF", role: "Default surface" },
  { name: "fog", hex: "#F5F2ED", role: "Warm secondary surface" },
  { name: "mist", hex: "#E8E5DF", role: "Hairlines, dividers" },
  { name: "haze", hex: "#C8CDD3", role: "Cool gray, ocean fog" },
  { name: "sea", hex: "#0B1E2E", role: "Deep ocean (dark inversions)" },
];

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="py-section-y">
      <Container width="wide">
        <Badge tone="donate">Internal — remove before launch</Badge>
        <h1 className="mt-4 text-display font-display text-ink">
          Design System
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-ink/75">
          A single review surface for every primitive. The donate accent is
          reserved for donation CTAs only — used sparingly so it pops on photo
          backgrounds.
        </p>

        {/* Color */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="01"
            title="Color"
            lede="Canadian Red on ink + paper. One bold signal — red appears in ≤10% of any composition. No gradients; red punctuates, never fills."
          />
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl ring-1 ring-mist overflow-hidden bg-paper"
              >
                <div
                  className="h-20"
                  style={{ background: s.hex }}
                  aria-hidden
                />
                <div className="p-3">
                  <p className="text-body font-medium text-ink">{s.name}</p>
                  <p className="text-caption font-mono text-ink-3">{s.hex}</p>
                  <p className="mt-1 text-caption text-ink-3 leading-snug">{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="02"
            title="Typography"
            lede="Space Grotesk display + Inter text + JetBrains Mono for data/labels. Athletic, technical, editorial."
          />
          <div className="mt-8 space-y-6">
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">display</p>
              <p className="text-display font-display text-ink">
                Chasing Olympic gold.
              </p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">h1</p>
              <h1 className="text-h1">Help me get to LA 2028.</h1>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">h2</p>
              <h2 className="text-h2">The campaign trail.</h2>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">h3</p>
              <h3 className="text-h3">Recent results.</h3>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">body-lg</p>
              <p className="text-body-lg max-w-prose">
                It started in the summer on my parent’s boat — every weekend
                exploring the lake. Now I split my time between Europe and home,
                training twelve months a year toward the Olympic start line.
              </p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">body</p>
              <p className="text-body max-w-prose">
                Funding a campaign year costs around $60,000. Half is covered by
                national team funding — the rest comes from donations and
                sponsorship.
              </p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">caption</p>
              <p className="text-caption text-ink-3">
                Photo: training camp, Mallorca — March 2026.
              </p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">eyebrow (mono)</p>
              <p className="font-mono text-eyebrow uppercase tracking-[0.22em] text-red">
                ILCA 7 · CAN 217718 · LA28
              </p>
            </div>
            <div>
              <p className="text-eyebrow uppercase text-ink-3 mb-1">data (mono)</p>
              <p className="font-mono text-body text-ink">
                42°N · 12 kts · WSW
              </p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="03"
            title="Buttons"
            lede="Four variants. Donate is the reserved CTA color — used only for donation paths."
          />
          <div className="mt-8 grid gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="donate">Donate</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button href="/donate" variant="donate" size="lg">
                As Link →
              </Button>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mt-section-y-lg">
          <SectionHeader eyebrow="04" title="Cards" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card>
              <h4 className="font-display text-h3">Default card</h4>
              <p className="mt-2 text-body text-ink/75">
                White background with a soft shadow. Use for content surfaces
                that sit on the foam page background.
              </p>
            </Card>
            <Card tone="muted">
              <h4 className="font-display text-h3">Muted card</h4>
              <p className="mt-2 text-body text-ink/75">
                Foam-deep background. Use for de-emphasized surfaces — sidebars,
                metadata blocks.
              </p>
            </Card>
            <Card tone="navy">
              <h4 className="font-display text-h3 text-paper">Navy card</h4>
              <p className="mt-2 text-body text-paper/80">
                For high-impact callouts. Pairs with sand or donate accents.
              </p>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="mt-section-y-lg">
          <SectionHeader eyebrow="05" title="Badges" />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Badge>Default</Badge>
            <Badge tone="navy">Navy</Badge>
            <Badge tone="sand">Sand</Badge>
            <Badge tone="donate">Donate</Badge>
            <Badge tone="navy">Upcoming</Badge>
            <Badge tone="sand">Recent</Badge>
          </div>
        </section>

        {/* Stat numbers */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="06"
            title="Stat numbers"
            lede="Animated count-up on scroll into view. Honors prefers-reduced-motion via framer-motion."
          />
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <StatNumber value={203} label="Days on the water" />
            <StatNumber value={12} suffix="+" label="International regattas" />
            <StatNumber prefix="$" value={60000} label="Campaign cost / year" />
          </div>
        </section>

        {/* Section header showcase */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="07"
            title="Section header"
            lede="Eyebrow / headline / lede. Aligns left by default; `align='center'` for hero-style sections."
          />
        </section>

        {/* Donate CTAs */}
        <section className="mt-section-y-lg">
          <SectionHeader
            eyebrow="08"
            title="Donate CTAs"
            lede="Three variants. Inline for end-of-page bands, sidebar for blog rails, floating for mobile."
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl">
              {/* Use the actual inline variant in a constrained showcase */}
              <DonateCTAInline location="design_system_demo" />
            </div>
            <div>
              <DonateCTASidebar location="design_system_demo" />
            </div>
          </div>
          <p className="mt-6 text-caption text-ink-3">
            Floating CTA is mobile-only and appears after 50% scroll on a real
            page. Scroll the home page on a phone to see it.
          </p>
        </section>
      </Container>
    </div>
  );
}
