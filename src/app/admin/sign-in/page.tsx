import { Container } from "@/components/ui/Container";
import { SignInForm } from "./SignInForm";

export const metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="bg-paper min-h-[70vh] py-section-y">
      <Container>
        <div className="max-w-sm">
          <p className="text-eyebrow uppercase tracking-wider text-ink/50 mb-2">
            Admin
          </p>
          <h1 className="font-display text-h1 leading-tight">Sign in</h1>
          <p className="mt-3 text-body text-ink-3">
            Password-gated dashboard for newsletters, events, and results.
          </p>
          <SignInForm next={sp.next} initialError={sp.error} />
        </div>
      </Container>
    </main>
  );
}
