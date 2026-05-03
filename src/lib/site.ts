export const SITE = {
  name: "James Juhasz",
  tagline: "Olympic ILCA 7 Sailor — Road to LA 2028",
  shortDescription:
    "Canadian Sailing Team athlete chasing Olympic gold. Follow the campaign and help fund the next regatta.",
  url: "https://jamesjuhasz.com",
  donate: {
    href: "/donate",
    label: "Donate",
  },
  social: {
    instagram: "#",
    youtube: "#",
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/events", label: "Events" },
    { href: "/gallery", label: "Gallery" },
    { href: "/newsletters", label: "Newsletters" },
    { href: "/press", label: "Press" },
    { href: "/contact", label: "Contact" },
  ] as const,
  supporters: [
    { name: "Sport Canada", href: "https://www.canada.ca/en/canadian-heritage/services/sport.html" },
    { name: "Canadian Sailing Team", href: "https://www.sailing.ca" },
    { name: "Oakville Yacht Squadron", href: "https://www.oys.ca" },
    { name: "Devoti Sailing", href: "https://devoti-sailing.com" },
  ],
} as const;
