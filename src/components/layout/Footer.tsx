import Link from "next/link";
import { InstagramGlyph, YoutubeGlyph } from "@/components/ui/SocialIcons";
import { Container } from "@/components/ui/Container";
import { SubscribeInline } from "./SubscribeInline";
import { SITE } from "@/lib/site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-section-y bg-navy text-foam">
      <Container className="py-section-y">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5 flex flex-col">
            <p className="font-serif text-h2 leading-tight text-foam">
              {SITE.name}
            </p>
            <p className="mt-3 max-w-prose text-body-lg text-foam/75">
              {SITE.tagline}
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={SITE.social.instagram}
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-foam/30 text-foam hover:bg-foam hover:text-navy transition-colors"
              >
                <InstagramGlyph />
              </a>
              <a
                href={SITE.social.youtube}
                aria-label="YouTube"
                className="inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-foam/30 text-foam hover:bg-foam hover:text-navy transition-colors"
              >
                <YoutubeGlyph />
              </a>
            </div>
          </div>

          <div className="md:col-span-3">
            <p className="text-eyebrow uppercase text-foam/60 tracking-wider mb-4">
              Site
            </p>
            <ul className="flex flex-col gap-2">
              {SITE.nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-body text-foam/85 hover:text-foam"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={SITE.donate.href}
                  className="text-body text-donate hover:opacity-90"
                >
                  Donate
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <p className="text-eyebrow uppercase text-foam/60 tracking-wider mb-4">
              Get the campaign updates
            </p>
            <SubscribeInline />
          </div>
        </div>

        {/* Sponsor strip */}
        <div className="mt-section-y-lg border-t border-foam/15 pt-8">
          <p className="text-eyebrow uppercase tracking-wider text-foam/60 mb-4">
            Backed by
          </p>
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {SITE.supporters.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body text-foam/80 hover:text-foam transition-colors"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-caption text-foam/60">
          <p>
            © {year} {SITE.name}. All rights reserved. Built by James.
          </p>
          <p>
            This site uses analytics cookies to understand how visitors find the
            campaign.
          </p>
        </div>
      </Container>
    </footer>
  );
}
