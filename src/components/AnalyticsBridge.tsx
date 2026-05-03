"use client";

/*
  Single root-mounted client component that turns data-attributes into
  GA4 events. Lets us tag CTAs declaratively (data-cta-location="...")
  without sprinkling onClick handlers through every callsite.

  Also fires:
    - donate_page_viewed once on /donate page mount
    - giving_level_selected when a tier link with data-giving-amount is clicked
*/

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  track,
  trackDonateCtaClick,
  trackGivingLevelSelected,
} from "@/lib/gtag";

export function AnalyticsBridge() {
  const pathname = usePathname();

  // Page-view side effect: fire donate_page_viewed exactly once when /donate
  useEffect(() => {
    if (pathname === "/donate") {
      track("donate_page_viewed", { source: document.referrer || "direct" });
    }
  }, [pathname]);

  // Click delegation
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cta = target.closest<HTMLElement>("[data-cta-location]");
      if (cta) {
        const location = cta.getAttribute("data-cta-location");
        if (location) trackDonateCtaClick(location);
      }
      const tier = target.closest<HTMLElement>("[data-giving-amount]");
      if (tier) {
        const amt = Number(tier.getAttribute("data-giving-amount"));
        if (Number.isFinite(amt)) trackGivingLevelSelected(amt);
      }
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  return null;
}
