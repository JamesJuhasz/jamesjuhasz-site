import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/*
  /thank-you — context-aware via ?from=. Different copy per source so
  it doesn't feel like a generic dead-end. Soft secondary CTA to
  /newsletters and Instagram closes every variant.
*/

type FromKey =
  | "donate"
  | "subscribe"
  | "name-my-boat"
  | "clinic-registration"
  | "contact"
  | "default";

const variants: Record<
  FromKey,
  { eyebrow: string; title: string; body: string }
> = {
  donate: {
    eyebrow: "Thank you",
    title: "Without you, the campaign doesn't move.",
    body: "Your contribution lands directly in coaching, travel, and entry fees. I'll send a personalized thank-you note as soon as I'm off the road.",
  },
  subscribe: {
    eyebrow: "Welcome aboard",
    title: "You're on the list.",
    body: "Monthly newsletter goes out the first week of each month — race recaps, training notes, and the unglamorous parts of the campaign.",
  },
  "name-my-boat": {
    eyebrow: "Submitted",
    title: "Your name suggestion is in.",
    body: "Thanks for playing. If you became a monthly supporter, you're in the draw — winner picked before the new hull hits the water.",
  },
  "clinic-registration": {
    eyebrow: "Registered",
    title: "I'll be in touch shortly.",
    body: "Expect a follow-up within 24 hours with payment + scheduling details. Looking forward to a great few days on the water.",
  },
  contact: {
    eyebrow: "Message received",
    title: "I'll get back to you within a few days.",
    body: "Often within 48 hours, sometimes longer when I'm at a regatta. Thanks for getting in touch.",
  },
  default: {
    eyebrow: "Thank you",
    title: "Got it.",
    body: "Thanks for getting in touch with the campaign.",
  },
};

export const metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  const key = (raw as FromKey) ?? "default";
  const v = variants[key] ?? variants.default;

  return (
    <section className="py-section-y-lg">
      <Container width="narrow">
        <Badge tone="sand">{v.eyebrow}</Badge>
        <h1 className="mt-4 font-serif text-display text-navy">{v.title}</h1>
        <p className="mt-6 text-body-lg text-ink/80 max-w-prose">{v.body}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/newsletters" variant="primary" size="lg">
            Read the journey
          </Button>
          <Button href="/" variant="ghost" size="lg">
            Back home
          </Button>
        </div>
        <div className="mt-12 border-t border-line pt-6">
          <p className="text-eyebrow uppercase tracking-wider text-mist mb-2">
            While you're here
          </p>
          <p className="text-body text-ink/75">
            Follow along on{" "}
            <Link href="https://instagram.com" className="underline">
              Instagram
            </Link>
            ,{" "}
            <Link href="https://youtube.com" className="underline">
              YouTube
            </Link>
            , and the{" "}
            <Link href="/newsletters" className="underline">
              newsletter
            </Link>
            .
          </p>
        </div>
      </Container>
    </section>
  );
}
