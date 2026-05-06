"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

const SESSION_KEY = "donate_popup_seen";
const DELAY_MS = 60_000;

const BUDGET_COLORS = ["#0E1116", "#2A2F36", "#5A6068", "#C8CDD3"] as const;
const BUDGET = [
  { label: "Coaching + boat", pct: 35, amt: "~$23,500", desc: "Coach fees, charter & freight" },
  { label: "Regattas + housing", pct: 35, amt: "~$23,500", desc: "Entry fees, accommodation" },
  { label: "Travel", pct: 16, amt: "~$10,700", desc: "Flights, transport to venues" },
  { label: "Equipment + other", pct: 14, amt: "~$9,300", desc: "Sails, gear, admin" },
];

function BudgetDonut() {
  let cumulative = 0;
  const stops = BUDGET.map((c, i) => {
    const start = cumulative;
    cumulative += c.pct;
    return `${BUDGET_COLORS[i]} ${start}% ${cumulative}%`;
  }).join(", ");
  return (
    <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
      <div
        className="rounded-full w-full h-full"
        style={{ background: `conic-gradient(${stops})` }}
        role="img"
        aria-label="Budget breakdown"
      />
      <div
        className="absolute rounded-full bg-paper inset-0 m-auto"
        style={{ width: "50%", height: "50%", top: "25%", left: "25%" }}
      />
    </div>
  );
}

export function DonatePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const suppressed = pathname === "/donate" || pathname === "/thank-you";

  useEffect(() => {
    if (suppressed) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    let armed = false;
    const arm = () => {
      if (armed) return;
      armed = true;
      window.removeEventListener("scroll", arm);
      timerRef.current = window.setTimeout(() => {
        if (sessionStorage.getItem(SESSION_KEY)) return;
        sessionStorage.setItem(SESSION_KEY, "1");
        setOpen(true);
        if ("gtag" in window) {
          const gtag = (window as unknown as { gtag: (...a: unknown[]) => void }).gtag;
          gtag("event", "donate_popup_shown", { trigger: "scroll" });
        }
      }, DELAY_MS);
    };

    window.addEventListener("scroll", arm, { passive: true });
    return () => {
      window.removeEventListener("scroll", arm);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [suppressed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <button
        type="button"
        aria-label="Close donation popup"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full rounded-2xl bg-paper shadow-lift max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "420px" }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 z-10 rounded-full bg-paper/90 p-1.5 text-ink/60 hover:bg-fog hover:text-ink transition shadow-soft"
        >
          <X size={18} aria-hidden />
        </button>
        <div className="p-5 sm:p-6">
          <h2
            id="donate-popup-title"
            className="font-display text-h3 text-ink leading-tight pr-8"
          >
            Most Olympic campaigns don&rsquo;t make it. The ones that do, do it
            on the back of supporters.
          </h2>
          <p className="mt-4 text-body text-ink/80">
            A full year on campaign costs $67,000 CAD. National funding covers
            part — donations and sponsorship close the $39,000 gap. Recurring
            monthly support is the most useful as it allows me to plan out my
            entire season.
          </p>

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-mist pt-5">
            <div>
              <dt className="font-display text-lg font-bold text-ink leading-none">
                ~$39,000
              </dt>
              <dd className="text-caption text-ink-3 mt-1 leading-tight">
                Annual supporter gap
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-bold text-ink leading-none">
                4 pillars
              </dt>
              <dd className="text-caption text-ink-3 mt-1 leading-tight">
                Coaching · regattas · travel · equipment
              </dd>
            </div>
            <div>
              <dt className="font-display text-lg font-bold text-ink leading-none">
                LA 2028
              </dt>
              <dd className="text-caption text-ink-3 mt-1 leading-tight">
                Olympic Games target
              </dd>
            </div>
          </dl>

          <div className="mt-6 rounded-xl ring-1 ring-mist p-5">
            <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-3">
              Where your support goes
            </p>
            <div className="flex gap-4 items-start">
              <BudgetDonut />
              <ul className="flex-1 min-w-0 flex flex-col gap-2">
                {BUDGET.map((c, i) => (
                  <li key={c.label} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ background: BUDGET_COLORS[i] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-ink leading-tight">
                        {c.label}
                      </p>
                      <p className="text-[10px] text-ink-3 leading-tight mt-0.5">
                        {c.desc}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-caption font-semibold text-ink leading-tight">
                        {c.pct}%
                      </p>
                      <p className="text-[10px] text-ink-3 leading-tight mt-0.5">
                        {c.amt}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-caption text-ink-3">
              $67k CAD/yr —{" "}
              <a href="/donate#where" className="underline">
                see the full breakdown
              </a>
            </p>
          </div>

          <div className="mt-6">
            <iframe
              title="Fundraising goal"
              height={93}
              width="100%"
              src="https://donorbox.org/embed/james-juhasz-sailing?donation_meter_color=%23e32400&only_donation_meter=true"
              style={{
                maxWidth: "100%",
                minWidth: "250px",
                minHeight: "90px",
                maxHeight: "none",
                border: 0,
              }}
              seamless
              name="donorbox-meter"
              scrolling="no"
            />
          </div>

          <Button
            href={SITE.donate.href}
            variant="donate"
            size="lg"
            className="mt-5 w-full justify-center"
            data-cta-location="popup_personal"
            onClick={() => setOpen(false)}
          >
            <Heart size={16} aria-hidden />
            Make it possible
          </Button>
        </div>
        <Script
          src="https://donorbox.org/widget.js"
          strategy="lazyOnload"
        />
      </div>
    </div>
  );
}
