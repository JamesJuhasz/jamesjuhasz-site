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
    instagram: "https://www.instagram.com/james.juhasz/",
    youtube: undefined as string | undefined,
  },
  nav: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/events", label: "Schedule" },
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
        { name: "Sport Canada", href: "https://www.canada.ca/en/canadian-heritage/services/sport.html", logo: "/images/supporters/sport-canada.svg" },
        { name: "Canadian Sailing Team", href: "https://www.sailing.ca", logo: "/images/supporters/canadian-sailing-team.png" },
        { name: "Ontario Quest for Gold", href: "https://www.coachingathletes.org", logo: "/images/supporters/ontario-quest-for-gold-dark.svg" },
        { name: "CoachAible.fit", href: "https://www.coachaible.fit", logo: "/images/supporters/coachaible-dark.svg" },
        { name: "SailCoach", href: "https://sailcoach.com", logo: "/images/supporters/sailcoach.png" },
      ],
    },
    {
      label: "Equipment",
      items: [
        { name: "Covey Watersport", href: "https://covywatersport.com", logo: "/images/supporters/covey-watersport.png" },
        { name: "Allen Sailing Hardware", href: "https://www.allenbrothers.co.uk", logo: "/images/supporters/allen-sailing-hardware.png" },
        { name: "Helly Hansen", href: "https://www.hellyhansen.com", logo: "/images/supporters/helly-hansen.png" },
      ],
    },
  ],
  /** Flat list retained for any consumer that needs the unstructured roster. */
  supporters: [
    { name: "Sport Canada", href: "https://www.canada.ca/en/canadian-heritage/services/sport.html", logo: "/images/supporters/sport-canada.svg" },
    { name: "Canadian Sailing Team", href: "https://www.sailing.ca", logo: "/images/supporters/canadian-sailing-team.png" },
    { name: "Ontario Quest for Gold", href: "https://www.coachingathletes.org", logo: "/images/supporters/ontario-quest-for-gold-dark.svg" },
    { name: "CoachAible.fit", href: "https://www.coachaible.fit", logo: "/images/supporters/coachaible-dark.svg" },
    { name: "SailCoach", href: "https://sailcoach.com", logo: "/images/supporters/sailcoach.png" },
    { name: "Covey Watersport", href: "https://covywatersport.com", logo: "/images/supporters/covey-watersport.png" },
    { name: "Allen Sailing Hardware", href: "https://www.allenbrothers.co.uk", logo: "/images/supporters/allen-sailing-hardware.png" },
    { name: "Helly Hansen", href: "https://www.hellyhansen.com", logo: "/images/supporters/helly-hansen.png" },
  ],
} as const;
