import Link from "next/link";
import { InstagramGlyph, YoutubeGlyph } from "@/components/ui/SocialIcons";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SubscribeInline } from "./SubscribeInline";
import { SITE } from "@/lib/site";

const footerNavGroups: {
  label: string;
  items: { href: string; label: string }[];
}[] = [
  {
    label: "Story",
    items: [
      { href: "/about", label: "About" },
      { href: "/newsletters", label: "Newsletters" },
      { href: "/press", label: "Press" },
    ],
  },
  {
    label: "Calendar",
    items: [
      { href: "/events", label: "Events" },
      { href: "/results", label: "Results" },
    ],
  },
  {
    // Subscribe (active CTA) + Contact (utility link for press inquiries)
    // share a "ways to reach the campaign" theme. Donate stands alone as a
    // dedicated red CTA in the bottom row — too important to bury in a list.
    label: "Connect",
    items: [
      { href: "/subscribe", label: "Subscribe" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  const showSocial = Boolean(SITE.social.instagram || SITE.social.youtube);
  return (
    <footer className="mt-section-y bg-ink text-paper">
      <Container className="py-section-y">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5 flex flex-col">
            <p className="font-display text-h2 leading-tight text-paper">
              {SITE.name}
            </p>
            <p className="mt-3 max-w-prose text-body-lg text-paper/75">
              {SITE.tagline}
            </p>
            {showSocial ? (
              <div className="mt-6 flex gap-3">
                {SITE.social.instagram ? (
                  <a
                    href={SITE.social.instagram}
                    aria-label="Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-paper/30 text-paper hover:bg-paper hover:text-ink transition-colors"
                  >
                    <InstagramGlyph />
                  </a>
                ) : null}
                {SITE.social.youtube ? (
                  <a
                    href={SITE.social.youtube}
                    aria-label="YouTube"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-paper/30 text-paper hover:bg-paper hover:text-ink transition-colors"
                  >
                    <YoutubeGlyph />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="md:col-span-3">
            <p className="text-eyebrow uppercase text-paper/60 tracking-wider mb-4">
              Site
            </p>
            <div className="flex flex-col gap-6">
              {footerNavGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-caption uppercase tracking-wider text-paper/50 mb-2">
                    {group.label}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-body text-paper/85 hover:text-paper"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4">
            <p className="text-eyebrow uppercase text-paper/60 tracking-wider mb-4">
              Get the campaign updates
            </p>
            <SubscribeInline />
          </div>
        </div>

        {/* Sponsor strip */}
        <div className="mt-section-y-lg border-t border-paper/15 pt-8">
          <p className="text-eyebrow uppercase tracking-wider text-paper/60 mb-4">
            Backed by
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {SITE.supporters.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body text-paper/80 hover:text-paper transition-colors"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8 text-caption text-paper/60">
          <p>
            © {year} {SITE.name}. All rights reserved. Built by James.
          </p>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <p className="md:max-w-md">
              This site uses analytics cookies to understand how visitors find
              the campaign.
            </p>
            {/* Standalone red Donate CTA — promoted out of the nav list so the
                primary call to action remains visually prominent in the footer. */}
            <Button href={SITE.donate.href} variant="donate" size="sm">
              {SITE.donate.label}
            </Button>
          </div>
        </div>
      </Container>
    </footer>
  );
}
