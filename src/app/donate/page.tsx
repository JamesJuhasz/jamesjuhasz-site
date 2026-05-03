import Link from "next/link";
import { Compass, Plane, Wrench, Ship, Award, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { DonorboxEmbed } from "@/components/sections/DonorboxEmbed";
import { GivingTiers } from "@/components/sections/GivingTiers";
import { FAQ } from "@/components/sections/FAQ";
import { JsonLd } from "@/components/JsonLd";
import { donateActionJsonLd } from "@/lib/json-ld";
import { pressEntries } from "@/lib/seed-data";
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

const budgetCategories = [
  {
    icon: Compass,
    label: "Coaching",
    pct: 30,
    dollars: 18000,
    body: "On-water coach time, RIB fuel, performance support, and review.",
  },
  {
    icon: Plane,
    label: "Travel",
    pct: 25,
    dollars: 15000,
    body: "Flights and ground travel between Canada, Europe, Australia, and the US.",
  },
  {
    icon: Ship,
    label: "Regatta entries + housing",
    pct: 30,
    dollars: 18000,
    body: "Entry fees, charter costs, club dues, and rent on the road.",
  },
  {
    icon: Wrench,
    label: "Equipment + boat",
    pct: 15,
    dollars: 9000,
    body: "Sails (4/year), lines, wetsuits, boat charter and transport.",
  },
];

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
];

const faqItems = [
  {
    question: "Where does my donation go?",
    answer: (
      <p>
        Directly to campaign costs — coaching, travel, entry fees, and
        equipment. The campaign runs at roughly $60,000 CAD/year; about half is
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
        Tax-receipt status is in progress. Once finalized I'll update this
        section and email past supporters. Until then, donations are personal
        contributions to the campaign.
      </p>
    ),
  },
  {
    question: "Can I sponsor specific equipment or a regatta?",
    answer: (
      <p>
        Yes. For sail branding, a named regatta sponsorship, or a specific
        equipment package, get in touch via the{" "}
        <Link href="/contact" className="text-navy underline">
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
        <Link href="/subscribe" className="text-navy underline">
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
  const featuredPress = pressEntries[0];
  // Site (used in OG image fallback)
  void SITE;

  return (
    <>
      <JsonLd data={donateActionJsonLd} />
      {/* HERO — half-viewport, embed above the fold */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 70% at 80% 20%, #1F365A 0%, #0E2240 50%, #061122 100%)",
          }}
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 text-foam">
              <Badge tone="donate">Donate</Badge>
              <h1 className="mt-4 font-serif text-display text-foam max-w-[16ch]">
                Help me get to LA 2028.
              </h1>
              <p className="mt-6 max-w-prose text-body-lg text-foam/85">
                A full year on the campaign costs around $60,000 CAD. National
                team funding covers about half — donations and sponsorship close
                the gap. Recurring monthly support is the most useful thing,
                because it lets me plan a season instead of a regatta.
              </p>
              <p className="mt-3 text-caption text-foam/60">
                Stripe + PayPal via Donorbox · Secure · Cancel anytime
              </p>
            </div>
            <div className="lg:col-span-7" id="give">
              <DonorboxEmbed amount={amount} />
              {amount ? (
                <p className="mt-3 text-caption text-foam/70">
                  Pre-filled with {fmtCurrency.format(amount)}. Adjust the
                  amount inside the form if you'd like.
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      {/* GIVING LEVELS */}
      <section className="py-section-y">
        <Container width="wide">
          <SectionHeader
            eyebrow="Giving levels"
            title="Pick a tier — or set your own."
            lede="Each level maps to something specific the campaign actually needs. Click a tier to pre-fill the form above."
          />
          <Reveal>
            <div className="mt-12">
              <GivingTiers />
            </div>
          </Reveal>
          <p className="mt-6 text-caption text-mist">
            Most supporters give monthly — recurring support is the most useful kind.
          </p>
        </Container>
      </section>

      {/* WHERE YOUR SUPPORT GOES */}
      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="wide">
          <SectionHeader
            eyebrow="Transparency"
            title="Where your support goes"
            lede="A 12-month campaign runs around $60,000 CAD. Here's where it lands."
          />
          <Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {budgetCategories.map(({ icon: Icon, ...c }) => (
                <Card key={c.label} className="flex flex-col gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-navy text-foam">
                    <Icon size={18} aria-hidden />
                  </div>
                  <p className="font-serif text-h3 text-navy">{c.label}</p>
                  <p className="text-body text-ink/75">{c.body}</p>
                  <div className="mt-auto pt-2 flex items-baseline justify-between border-t border-line">
                    <span className="text-body-lg font-medium text-navy">
                      {c.pct}%
                    </span>
                    <span className="text-caption text-mist">
                      ~{fmtCurrency.format(c.dollars)}/yr
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>
          {/* Bar chart */}
          <Reveal delay={0.1}>
            <div className="mt-12 rounded-2xl bg-white ring-1 ring-line p-6">
              <p className="text-eyebrow uppercase tracking-wider text-mist mb-4">
                Annual budget split
              </p>
              <div className="flex h-10 w-full overflow-hidden rounded-pill ring-1 ring-line">
                {budgetCategories.map((c, i) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-center text-caption text-foam font-medium"
                    style={{
                      width: `${c.pct}%`,
                      background: ["#0E2240", "#1F365A", "#B89878", "#D8C4A6"][i % 4],
                      color: i < 2 ? "#F6F2EA" : "#0A1628",
                    }}
                    title={`${c.label}: ${c.pct}%`}
                  >
                    {c.pct}%
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-caption text-mist">
                {budgetCategories.map((c, i) => (
                  <span key={c.label} className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: ["#0E2240", "#1F365A", "#B89878", "#D8C4A6"][i % 4],
                      }}
                    />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* TRANSPARENCY + TRUST */}
      <section className="py-section-y">
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
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-pill bg-navy text-foam flex-shrink-0">
                        <Icon size={18} aria-hidden />
                      </div>
                      <div>
                        <p className="font-serif text-h3 text-navy">{t.label}</p>
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

      {/* SOCIAL PROOF */}
      <section className="py-section-y bg-foam-deep border-y border-line">
        <Container width="wide">
          <SectionHeader
            eyebrow="Voices"
            title="Why people support the campaign"
          />
          <div className="mt-10 grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <Card tone="navy" className="h-full flex flex-col gap-4">
                <p className="text-eyebrow uppercase tracking-wider text-sand">
                  From a supporter
                </p>
                <p className="font-serif text-h3 text-foam leading-snug">
                  "James turned up to every regatta last year better prepared
                  than the year before. That's the campaign in one sentence —
                  and that's what supporting him gets you."
                </p>
                <p className="mt-auto text-caption text-foam/70">
                  — Founding supporter, Oakville
                </p>
              </Card>
            </div>
            <div className="lg:col-span-7">
              <Card className="flex flex-col gap-4">
                <p className="text-eyebrow uppercase tracking-wider text-mist">
                  From the press
                </p>
                <p className="font-serif text-h3 text-navy leading-snug">
                  "{featuredPress.articleTitle}"
                </p>
                {featuredPress.excerpt ? (
                  <p className="text-body text-ink/75">
                    {featuredPress.excerpt}
                  </p>
                ) : null}
                <p className="text-caption text-mist">
                  — {featuredPress.publication}
                </p>
                <Link
                  href="/press"
                  className="text-caption text-navy underline mt-auto"
                >
                  Read all coverage →
                </Link>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-section-y-lg">
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
          <div className="rounded-3xl bg-navy text-foam p-8 md:p-12 lg:p-16 shadow-lift overflow-hidden text-center">
            <h2 className="font-serif text-display text-foam max-w-[20ch] mx-auto">
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
                className="text-foam ring-foam/30 hover:bg-foam/10"
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
