/*
  Thin gtag wrapper. Safe in dev (no GA4 ID set) and SSR (window guard).
  Custom events used in the donation funnel:
    - donate_cta_click          { location }
    - giving_level_selected     { amount }
    - donorbox_visible          { embed_id }
    - subscribe_submitted       { source }
    - form_submitted            { form }
    - donate_page_viewed        { source }
*/

type GtagFn = (event: "event", name: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

export function track(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function trackDonateCtaClick(location: string) {
  track("donate_cta_click", { location });
}

export function trackGivingLevelSelected(amount: number) {
  track("giving_level_selected", { amount });
}

export function trackFormSubmitted(form: string) {
  track("form_submitted", { form });
}

export function trackSubscribeSubmitted(source: string) {
  track("subscribe_submitted", { source });
}
