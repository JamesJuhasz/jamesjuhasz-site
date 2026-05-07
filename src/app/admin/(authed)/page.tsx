import Link from "next/link";

const tiles = [
  {
    href: "/admin/newsletters",
    title: "Newsletters",
    body: "Write, publish, and send updates to subscribers.",
  },
  {
    href: "/admin/events",
    title: "Events",
    body: "Add regattas, training blocks, and clinics.",
  },
  {
    href: "/admin/results",
    title: "Results",
    body: "Edit positions, fleet sizes, and notes.",
  },
  {
    href: "/admin/results-review",
    title: "Results review",
    body: "Approve or reject scraped results.",
  },
  {
    href: "/admin/subscribers",
    title: "Subscribers",
    body: "Resend audience snapshot.",
  },
];

export default function AdminLanding() {
  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        Dashboard
      </p>
      <h1 className="mt-2 font-display text-h1 leading-tight">
        Campaign control room
      </h1>
      <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block border border-ink/10 p-6 transition-colors hover:border-ink hover:bg-ink/[0.02]"
            >
              <p className="font-display text-h3 leading-tight">{t.title}</p>
              <p className="mt-2 text-body text-ink-3">{t.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
