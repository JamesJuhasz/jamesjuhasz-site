"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PrimaryLockup } from "@/components/brand/PrimaryLockup";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/cn";

// Pages where the hero is dark (full-bleed photo behind header until scroll).
// On these, when the header is in transparent state we invert nav/lockup to light.
const DARK_HERO_PATHS = new Set(["/", "/donate", "/about"]);

export function Header() {
  const pathname = usePathname();
  const onDarkHero = pathname ? DARK_HERO_PATHS.has(pathname) : false;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  // Header overlays a dark photo only when on a dark-hero page AND not scrolled.
  const overDark = onDarkHero && !scrolled;

  // Page-wide scroll progress for the donate-red bar
  const { scrollYProgress } = useScroll();
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
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
        "sticky top-0 z-40 w-full transition-[background-color,backdrop-filter] duration-300",
        scrolled
          ? "bg-paper/90 backdrop-blur-md ring-1 ring-mist/70"
          : "bg-transparent",
        // Subtle dim band only when transparent over a dark hero — gives the
        // nav links and lockup enough contrast against the hero photo at top.
        overDark
          ? "before:absolute before:inset-x-0 before:top-0 before:h-24 before:bg-gradient-to-b before:from-ink/55 before:to-transparent before:-z-10 before:pointer-events-none"
          : "",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-wide items-center justify-between gap-6 px-container-x">
        <Link
          href="/"
          className="leading-none transition-opacity hover:opacity-80"
          aria-label={`${SITE.name} — home`}
          onClick={() => setOpen(false)}
        >
          <PrimaryLockup
            scale={overDark ? 0.65 : 0.55}
            showTagline={false}
            mode={overDark ? "dark" : "light"}
          />
        </Link>

        <nav
          className="hidden lg:flex items-center gap-7 font-mono text-[11px] uppercase tracking-[0.18em]"
          aria-label="Primary"
        >
          {SITE.nav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors relative after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-red after:transition-all hover:after:w-full",
                overDark
                  ? "text-paper hover:text-paper"
                  : "text-ink-2 hover:text-ink",
              )}
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
            className={cn(
              "lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-pill ring-1 transition-colors",
              overDark
                ? "ring-paper/30 bg-transparent text-paper hover:bg-paper/10"
                : "ring-mist bg-paper text-ink hover:bg-fog",
            )}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Scroll progress bar (page-wide) — Canadian Red */}
      <motion.div
        aria-hidden
        className="origin-left h-[2px] w-full bg-red"
        style={{ scaleX: progressScaleX }}
      />

      {/* Mobile sheet — h-[calc(100svh-4rem)] because transformed parent (header) breaks `bottom-0` */}
      <div
        id="mobile-nav"
        className={cn(
          "lg:hidden fixed inset-x-0 top-16 h-[calc(100svh-4rem)] z-30 bg-paper transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col px-container-x py-8">
          <nav className="flex flex-col gap-1" aria-label="Primary mobile">
            {SITE.nav.map((item, i) => (
              <motion.div
                key={item.href}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={
                  open && !reduceMotion
                    ? { opacity: 1, y: 0 }
                    : reduceMotion
                      ? undefined
                      : { opacity: 0, y: 8 }
                }
                transition={{
                  duration: 0.4,
                  delay: open ? i * 0.04 : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-h3 font-display font-semibold tracking-tight text-ink hover:bg-fog"
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>
          <div className="mt-auto pt-8">
            <Button
              href={SITE.donate.href}
              variant="donate"
              size="lg"
              className="w-full active:scale-[0.98] transition-transform"
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
