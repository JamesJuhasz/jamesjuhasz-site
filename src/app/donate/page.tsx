import Image from "next/image";
import Link from "next/link";
import { Compass, Plane, Wrench, Ship, Award, ShieldCheck, Sparkles, Receipt, Utensils, Building2, Package, Flag } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DonorboxEmbed } from "@/components/sections/DonorboxEmbed";
import { DonorboxGoalMeter } from "@/components/sections/DonorboxGoalMeter";
import { FAQ } from "@/components/sections/FAQ";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { SectionNav } from "@/components/layout/SectionNav";
import { JsonLd } from "@/components/JsonLd";
import { donateActionJsonLd } from "@/lib/json-ld";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Donate — Help me get to LA 2028",
  description:
    "Support the Olympic sailing campaign. Recurring monthly support makes the biggest difference. Tax receipts where available.",
  openGraph: {
    title: "Help me get to LA 2028",
    description: "Donate to the Olympic ILCA 7 sailing campaign.",
    images: [
      `/api/og?title=${encodeURIComponent("Help me get to LA 2028.")}&subtitle=${encodeURIComponent("Donate to the Olympic ILCA 7 campaign")}`,
    ],
  },
};

const DONATE_COLORS = [
  "#0D1014",
  "#1A2430",
  "#2A3848",
  "#3D5060",
  "#556878",
  "#6E8290",
  "#90A8B4",
  "#BECDD6",
] as const;

const budgetCategories = [
  {
    icon: Compass,
    label: "Coaching fees",
    pct: 25,
    dollars: 16600,
    body: "Professional coach on the water, RIB fuel, and real-time feedback throughout the season.",
  },
  {
    icon: Utensils,
    label: "Food",
    pct: 16,
    dollars: 10800,
    body: "Meals while on the road — roughly $30/day across 11 months of international travel.",
  },
  {
    icon: Building2,
    label: "Accommodation",
    pct: 15,
    dollars: 10000,
    body: "Rentals and hotels across Malta, Europe, North America, and Australia.",
  },
  {
    icon: Plane,
    label: "Flights + transport",
    pct: 14,
    dollars: 9549,
    body: "Flights across three continents — Europe, Australia, and North America — plus ground transport.",
  },
  {
    icon: Package,
    label: "Other",
    pct: 9,
    dollars: 6000,
    body: "Miscellaneous campaign costs — visas, kit, admin, and expenses that don't fit a neat category.",
  },
  {
    icon: Wrench,
    label: "Equipment",
    pct: 9,
    dollars: 6057,
    body: "Competition sails ($2,478), boat transport ($1,500), launching fees ($1,359), and gym membership ($720).",
  },
  {
    icon: Ship,
    label: "Boat charter",
    pct: 8,
    dollars: 5706,
    body: "Chartered ILCA 7 in Europe — cheaper than shipping my own boat across the Atlantic.",
  },
  {
    icon: Flag,
    label: "Regatta entries",
    pct: 4,
    dollars: 2654,
    body: "Entry fees for 5–6 regattas a year — World Cup, continental championships, and selection events.",
  },
];

function DonatePieChart() {
  let cumulative = 0;
  const stops = budgetCategories
    .map((c, i) => {
      const start = cumulative;
      cumulative += c.pct;
      return `${DONATE_COLORS[i]} ${start}% ${cumulative}%`;
    })
    .join(", ");
  return (
    <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
      <div className="rounded-full w-full h-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Budget breakdown pie chart" />
      <div className="absolute rounded-full bg-paper flex flex-col items-center justify-center gap-0.5" style={{ width: "50%", height: "50%", top: "25%", left: "25%" }}>
        <span className="font-display text-h3 text-ink leading-none">$67k</span>
        <span className="text-caption text-ink-3">CAD/yr</span>
      </div>
    </div>
  );
}

const trustSignals = [
  {
    icon: Award,
    label: "Canadian Sailing Team",
    body: "Member of the national squad for the LA 2028 cycle.",
  },
  {
    icon: ShieldCheck,
    label: "Direct campaign",
    body: "No admin fee on the way through — every donation funds training, travel, or entries.",
  },
  {
    icon: Sparkles,
    label: "Year-round campaign",
    body: "Twelve months of training across Canada, Malta, and Europe.",
  },
  {
    icon: Receipt,
    label: "Tax status",
    body: (
      <>
        Donations through Wind Athletes Canada are tax-deductible.{" "}
        <a
          href="https://www.windathletes.ca/athletes/james-juhasz"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          windathletes.ca/athletes/james-juhasz
        </a>
      </>
    ),
  },
];

const faqItems = [
  {
    question: "Where does my donation go?",
    answer: (
      <p>
        Directly to campaign costs — coaching, travel, entry fees, and
        equipment. The campaign runs at roughly $67,000 CAD/year; about half is
        covered by Canadian Sailing Team support, and donations close the gap.
      </p>
    ),
  },
  {
    question: "Can I give monthly?",
    answer: (
      <p>
        Yes — and monthly is the default. Recurring support is the most useful
        kind because it lets me plan a season instead of a regatta. You can
        adjust or cancel any time from your Donorbox account.
      </p>
    ),
  },
  {
    question: "Is my donation tax-deductible?",
    answer: (
      <p>
        Yes — donations made through Wind Athletes Canada are tax-deductible.
        See{" "}
        <a
          href="https://www.windathletes.ca/athletes/james-juhasz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline"
        >
          windathletes.ca/athletes/james-juhasz
        </a>{" "}
        for details and to donate through that channel.
      </p>
    ),
  },
  {
    question: "Can I sponsor specific equipment or a regatta?",
    answer: (
      <p>
        Yes. For sail branding, a named regatta sponsorship, or a specific
        equipment package, get in touch via the{" "}
        <Link href="/contact" className="text-ink underline">
          contact form
        </Link>{" "}
        and we'll put a partnership package together.
      </p>
    ),
  },
  {
    question: "Will I get updates?",
    answer: (
      <p>
        Yes. Every supporter receives the monthly newsletter — race recaps,
        training notes, and travel updates. You can also{" "}
        <Link href="/subscribe" className="text-ink underline">
          subscribe directly
        </Link>{" "}
        without donating.
      </p>
    ),
  },
];

const fmtCurrency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default async function DonatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.amount) ? sp.amount[0] : sp.amount;
  const amount = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const rawInterval = Array.isArray(sp.interval) ? sp.interval[0] : sp.interval;
  const interval = rawInterval === "m" || rawInterval === "y" ? rawInterval : null;
  // Site (used in OG image fallback)
  void SITE;

  return (
    <>
      <JsonLd data={donateActionJsonLd} />
      <SectionNav
        sections={[
          { id: "give", label: "Give" },
          { id: "where", label: "Where it goes" },
          { id: "trust", label: "Trust" },
          { id: "faq", label: "FAQ" },
        ]}
      />
      {/* HERO — half-viewport, embed above the fold */}
      <section className="relative isolate overflow-hidden">
        <HeroParallax src="/images/hero-candidates/img_8434.jpg" priority amount={0.1} />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/40 to-ink/85"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 lg:items-stretch">
            <div className="lg:col-span-7 text-paper flex flex-col">
              <Badge tone="donate">Donate</Badge>
              <h1 className="mt-4 font-display text-display text-paper max-w-[16ch]">
                Help me get to LA 2028.
              </h1>
              <p className="mt-6 max-w-prose text-body-lg text-paper/85">
                A full year on campaign costs $67,000 CAD. National funding
                covers part — donations and sponsorship close the $39,000 gap.
                Recurring monthly support is the most useful as it allows me to
                plan out my entire season.
              </p>
              <p className="mt-3 text-caption text-paper/60">
                Stripe + PayPal via Donorbox · Secure · Cancel anytime
              </p>
              <div id="where" className="mt-5">
                <p className="font-display text-h3 text-paper mb-3">Where your support goes</p>
                <div className="rounded-2xl bg-paper ring-1 ring-mist p-5">
                  <div className="flex flex-col sm:flex-row gap-5 sm:items-start items-center">
                    <DonatePieChart />
                    <ul className="flex-1 divide-y divide-mist min-w-0">
                      {budgetCategories.map(({ icon: Icon, ...c }, i) => (
                        <li key={c.label} className="flex items-start gap-2 py-2">
                          <span aria-hidden className="mt-1.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: DONATE_COLORS[i] }} />
                          <Icon size={13} className="mt-1.5 text-ink-3 flex-shrink-0" aria-hidden />
                          <div className="flex-1 min-w-0">
                            <span className="text-caption font-medium text-ink">{c.label}</span>
                            <p className="text-[11px] text-ink-3 leading-snug">{c.body}</p>
                          </div>
                          <div className="text-right flex-shrink-0 pl-2">
                            <div className="text-caption font-semibold text-ink">{c.pct}%</div>
                            <div className="text-[11px] text-ink-3">~{fmtCurrency.format(c.dollars)}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 lg:flex lg:flex-col" id="give">
              <DonorboxEmbed amount={amount} interval={interval} className="lg:flex-1" />
              {amount ? (
                <p className="mt-3 text-caption text-paper/70">
                  Pre-filled with {fmtCurrency.format(amount)}. Adjust the
                  amount inside the form if you'd like.
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      {/* SEASON GOAL */}
      <section className="py-section-y bg-paper border-b border-mist">
        <Container width="default">
          <div className="max-w-3xl mx-auto">
            <p className="text-eyebrow uppercase tracking-wider text-ink-3">
              Season goal
            </p>
            <p className="mt-2 font-display text-h3 text-ink">
              Closing the gap on a $39,000 season.
            </p>
            <div className="mt-6 flex flex-col items-start gap-6">
              <DonorboxGoalMeter className="w-full" />
              <Button
                href="#give"
                variant="donate"
                size="md"
                data-cta-location="donate_progress"
              >
                Donate now
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* PHOTOGRAPHIC BREAK */}
      <section aria-hidden className="relative h-[42vh] min-h-[280px] overflow-hidden">
        <Image
          src="/images/hero-candidates/img_8859.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-fog/40" />
      </section>

      {/* TRANSPARENCY + TRUST */}
      <section id="trust" className="py-section-y">
        <Container width="default">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <SectionHeader
                eyebrow="Trust"
                title="Backed up the chain."
                lede="The campaign isn't running on hopes. National-team selection, a real coaching group, and direct accountability for every dollar."
              />
            </div>
            <div className="lg:col-span-7">
              <ul className="grid gap-4">
                {trustSignals.map(({ icon: Icon, ...t }) => (
                  <li key={t.label}>
                    <Card className="flex items-start gap-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-ink text-paper flex-shrink-0">
                        <Icon size={18} aria-hidden />
                      </div>
                      <div>
                        <p className="font-display text-h3 text-ink">{t.label}</p>
                        <p className="mt-1 text-body text-ink/75">{t.body}</p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-section-y-lg">
        <Container width="default">
          <SectionHeader
            eyebrow="FAQ"
            title="Frequently asked"
          />
          <div className="mt-10">
            <FAQ items={faqItems} />
          </div>
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="py-section-y-lg">
        <Container width="wide">
          <div className="rounded-3xl bg-ink text-paper p-8 md:p-12 lg:p-16 shadow-lift overflow-hidden text-center">
            <h2 className="font-display text-display text-paper max-w-[20ch] mx-auto">
              Every dollar gets me closer to the start line.
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                href="#give"
                variant="donate"
                size="lg"
                data-cta-location="donate_final"
              >
                Donate now
              </Button>
              <Button
                href="/subscribe"
                variant="ghost"
                size="lg"
                className="text-paper ring-paper/30 hover:bg-paper/10"
              >
                Just get updates
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
