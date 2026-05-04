export const SITE = {
  name: "James Juhasz",
  tagline: "ILCA 7 · CAN 217718 · Road to LA28",
  shortDescription:
    "Canadian Sailing Team athlete chasing Olympic gold. Follow the campaign and help fund the next regatta.",
  url: "https://jamesjuhasz.com",
  sailNumber: "CAN 217718",
  classLabel: "ILCA 7",
  campaignLabel: "LA28",
  donate: {
    href: "/donate",
    label: "Donate",
  },
  social: {
    // Set to a real URL to render the icon button. Leave undefined to hide it.
    instagram: undefined as string | undefined,
    youtube: undefined as string | undefined,
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/events", label: "Events" },
    { href: "/results", label: "Results" },
    { href: "/gallery", label: "Gallery" },
    { href: "/newsletters", label: "Newsletters" },
    { href: "/press", label: "Press" },
    { href: "/contact", label: "Contact" },
  ] as const,
  supporterGroups: [
    {
      label: "Program",
      items: [
        { name: "Sport Canada", href: "https://www.canada.ca/en/canadian-heritage/services/sport.html" },
        { name: "Canadian Sailing Team", href: "https://www.sailing.ca" },
        { name: "Ontario Quest for Gold", href: "https://www.coachingathletes.org" },
      ],
    },
    {
      label: "Equipment",
      items: [
        { name: "Devoti Sailing", href: "https://devoti-sailing.com" },
        { name: "Allen Sailing Hardware", href: "https://www.allenbrothers.co.uk" },
        { name: "Helly Hansen", href: "https://www.hellyhansen.com" },
        { name: "Maurten", href: "https://www.maurten.com" },
      ],
    },
    {
      label: "Club",
      items: [
        { name: "Oakville Yacht Squadron", href: "https://www.oys.ca" },
      ],
    },
  ],
  /** Flat list retained for any consumer that needs the unstructured roster. */
  supporters: [
    { name: "Sport Canada", href: "https://www.canada.ca/en/canadian-heritage/services/sport.html" },
    { name: "Canadian Sailing Team", href: "https://www.sailing.ca" },
    { name: "Oakville Yacht Squadron", href: "https://www.oys.ca" },
    { name: "Devoti Sailing", href: "https://devoti-sailing.com" },
    { name: "Ontario Quest for Gold", href: "https://www.coachingathletes.org" },
    { name: "Allen Sailing Hardware", href: "https://www.allenbrothers.co.uk" },
    { name: "Helly Hansen", href: "https://www.hellyhansen.com" },
    { name: "Maurten", href: "https://www.maurten.com" },
  ],
} as const;
