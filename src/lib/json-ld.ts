/*
  JSON-LD structured data builders. Drop the returned object into a
  <Script type="application/ld+json"> tag, or render via dangerouslySetInnerHTML.
*/

import { SITE } from "@/lib/site";

export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.name,
  url: SITE.url,
  jobTitle: "Olympic-class sailor",
  description: SITE.shortDescription,
  knowsAbout: ["Sailing", "ILCA 7", "Olympic sailing"],
  affiliation: SITE.supporters.map((s) => ({
    "@type": "Organization",
    name: s.name,
    url: s.href,
  })),
  sameAs: [SITE.social.instagram, SITE.social.youtube].filter(
    (u) => u && u !== "#",
  ),
};

export function articleJsonLd(post: {
  title: string;
  publishedAt: string;
  excerpt?: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt,
    description: post.excerpt,
    author: { "@type": "Person", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Person", name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/newsletters/${post.slug}`,
  };
}

export function eventJsonLd(event: {
  title: string;
  eventDate: string;
  endDate?: string;
  location: string;
  excerpt?: string;
  slug: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.title,
    startDate: event.eventDate,
    endDate: event.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.location,
      address: event.location,
    },
    competitor: { "@type": "Person", name: SITE.name, url: SITE.url },
    description: event.excerpt,
    url: `${SITE.url}/events/${event.slug}`,
  };
}

export const donateActionJsonLd = {
  "@context": "https://schema.org",
  "@type": "DonateAction",
  recipient: { "@type": "Person", name: SITE.name, url: SITE.url },
  description:
    "Donate to support James Juhasz's Olympic ILCA 7 sailing campaign for LA 2028.",
  url: `${SITE.url}/donate`,
};
