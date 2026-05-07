import { Container } from "@/components/ui/Container";
import { PostCard } from "@/components/cards/PostCard";
import { HeroParallax } from "@/components/sections/HeroParallax";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTAInline } from "@/components/cta/DonateCTA";
import { getPostsIndex } from "@/lib/posts";

export const revalidate = 60;

export const metadata = {
  title: "Newsletters",
  description:
    "Race recaps, training notes, and the unglamorous parts of the campaign — published as they happen.",
};

export default async function NewslettersPage() {
  const posts = await getPostsIndex().catch(() => []);

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
