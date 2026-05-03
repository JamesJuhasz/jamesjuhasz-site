import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PostCard } from "@/components/cards/PostCard";
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
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="wide">
          <SectionHeader
            eyebrow="Newsletters"
            title="The journey, post by post"
            lede="Race recaps, training notes, what's working, what isn't. Published the first week of each month."
          />
          {!usingSanity ? (
            <p className="mt-6 text-caption text-mist max-w-prose">
              Showing seed data. Configure Sanity (see{" "}
              <code className="bg-foam px-1.5 py-0.5 rounded">
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
            <p className="text-body text-mist text-center">
              No posts published yet.
            </p>
          ) : (
            <Reveal>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </Reveal>
          )}
        </Container>
      </section>

      <DonateCTAInline location="newsletters_inline" />
    </>
  );
}
