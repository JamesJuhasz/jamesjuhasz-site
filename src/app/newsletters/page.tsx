import { Container } from "@/components/ui/Container";
import { PostCard } from "@/components/cards/PostCard";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getPostsIndex } from "@/sanity/fetch";
import { isSanityConfigured } from "@/sanity/env";

export const revalidate = 60;

export const metadata = {
  title: "Newsletters",
  description:
    "Race recaps, training notes, and the unglamorous parts of the campaign — published as they happen.",
};

export default async function NewslettersPage() {
  const posts = await getPostsIndex();
  const usingSanity = isSanityConfigured();

  return (
    <>
      <section className="relative isolate overflow-hidden min-h-[55svh] flex items-end">
        <HeroParallax
          src="/images/hero-candidates/img_8859.jpg"
          alt="Quiet moment on the water"
          priority
          amount={0.1}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/4 -z-10 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent"
        />
        <Container width="wide" className="pt-section-y pb-section-y">
          <p className="text-eyebrow uppercase font-medium text-paper/70 mb-3">
            Newsletters
          </p>
          <h1 className="font-display text-display text-paper max-w-[20ch]">
            The journey, post by post
          </h1>
          <p className="mt-6 max-w-prose text-body-lg text-paper/85">
            Race recaps, training notes, what&apos;s working, what isn&apos;t. Published the first week of each month.
          </p>
          {!usingSanity ? (
            <p className="mt-6 text-caption text-paper/75 max-w-prose">
              Showing seed data. Configure Sanity (see{" "}
              <code className="bg-paper/15 text-paper px-1.5 py-0.5 rounded">
                docs/SANITY_SETUP.md
              </code>
              ) to publish from the studio.
            </p>
          ) : null}
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          {posts.length === 0 ? (
            <p className="text-body text-ink-3 text-center">
              No posts published yet.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <Reveal key={p.slug} delay={Math.min(i * 0.06, 0.36)}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          )}
        </Container>
      </section>

      <DonateCTAInline location="newsletters_inline" />
    </>
  );
}
