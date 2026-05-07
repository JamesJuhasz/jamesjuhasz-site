import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SignOutButton } from "./SignOutButton";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/newsletters", label: "Newsletters" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/galleries", label: "Galleries" },
  { href: "/admin/results-review", label: "Review" },
  { href: "/admin/subscribers", label: "Subscribers" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-paper">
        <Container>
          <div className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="font-display text-h4 leading-none">
                Admin
              </Link>
              <nav className="flex flex-wrap gap-x-5 gap-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-body-sm text-ink-3 hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-caption uppercase tracking-wider text-ink/50 hover:text-ink">
                View site
              </Link>
              <SignOutButton />
            </div>
          </div>
        </Container>
      </header>
      <main className="py-section-y">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
