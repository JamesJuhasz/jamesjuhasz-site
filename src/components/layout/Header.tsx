"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile sheet open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-200",
        scrolled
          ? "bg-foam/85 backdrop-blur-md ring-1 ring-line/60"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-wide items-center justify-between gap-6 px-container-x">
        <Link
          href="/"
          className="font-serif text-h3 leading-none text-navy hover:text-navy-deep"
          onClick={() => setOpen(false)}
        >
          {SITE.name}
        </Link>

        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
          {SITE.nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-body text-ink/75 hover:text-navy transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button
            href={SITE.donate.href}
            variant="donate"
            size="sm"
            data-cta-location="header"
          >
            {SITE.donate.label}
          </Button>
          <button
            type="button"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 ring-line bg-foam text-navy hover:bg-foam-deep"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        id="mobile-nav"
        className={cn(
          "lg:hidden fixed inset-x-0 top-16 bottom-0 z-30 bg-foam transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col px-container-x py-8">
          <nav
            className="flex flex-col gap-1"
            aria-label="Primary mobile"
          >
            {SITE.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-h3 font-serif text-navy hover:bg-foam-deep"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <Button
              href={SITE.donate.href}
              variant="donate"
              size="lg"
              className="w-full"
              data-cta-location="header_mobile"
              onClick={() => setOpen(false)}
            >
              {SITE.donate.label}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
