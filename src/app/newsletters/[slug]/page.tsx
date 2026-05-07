import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTASidebar, DonateCTAInline } from "@/components/cta/DonateCTA";
import { JsonLd } from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/json-ld";
import { getPostBySlug, getPostsIndex } from "@/lib/posts";

export const revalidate = 60;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateStaticParams() {
  // Resilient: if the DB is unreachable at build time, fall back to
  // on-demand generation. ISR (revalidate=60) handles the rest.
  try {
    const posts = await getPostsIndex();
    return posts.map((p) => ({ slug: p.slug }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[newsletters] generateStaticParams skipped:", err);
    }
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  const ogUrl = `/api/og?variant=post&title=${encodeURIComponent(
    post.title,
  )}&subtitle=${encodeURIComponent(
    new Intl.DateTimeFormat("en-CA", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(post.publishedAt)),
  )}`;
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      images: [ogUrl],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const hasBody = Boolean(post.bodyHtml);

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          publishedAt: post.publishedAt,
          excerpt: post.excerpt,
          slug: post.slug,
        })}
      />
      <section className="py-section-y bg-fog border-b border-mist">
        <Container width="prose">
          <Link
            href="/newsletters"
            className="inline-flex items-center gap-1 text-ink-3 hover:text-ink mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> All posts
          </Link>
          <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-3">
            {dateFmt.format(new Date(post.publishedAt))}
            {post.tags?.length ? (
              <>
                {" · "}
                {post.tags.slice(0, 2).join(" · ")}
              </>
            ) : null}
          </p>
          <h1 className="font-display text-h1 text-ink">{post.title}</h1>
          {post.excerpt ? (
            <p className="mt-4 text-body-lg text-ink/80 max-w-prose">
              {post.excerpt}
            </p>
          ) : null}
        </Container>
      </section>

      <section className="py-section-y">
        <Container width="wide">
          <div className="grid lg:grid-cols-12 gap-12">
            <article className="lg:col-span-8">
              <Reveal>
                {hasBody ? (
                  <div
                    className="prose-newsletter max-w-prose"
                    dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
                  />
                ) : (
                  <p className="text-body-lg text-ink/80 max-w-prose">
                    {post.excerpt ?? ""}
                  </p>
                )}
              </Reveal>

              <DonateCTAInline
                location="post_body_close"
                className="my-12 -mx-container-x"
              />

              <nav className="mt-12 grid sm:grid-cols-2 gap-4 border-t border-mist pt-8">
                {"previous" in post && post.previous ? (
                  <Link
                    href={`/newsletters/${post.previous.slug}`}
                    className="rounded-2xl ring-1 ring-mist p-5 hover:bg-fog transition-colors"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-1">
                      <ChevronLeft size={12} className="inline" /> Previous
                    </p>
                    <p className="font-display text-h3 text-ink">
                      {post.previous.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
                {"next" in post && post.next ? (
                  <Link
                    href={`/newsletters/${post.next.slug}`}
                    className="rounded-2xl ring-1 ring-mist p-5 hover:bg-fog transition-colors text-right"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-ink-3 mb-1">
                      Next <ChevronRight size={12} className="inline" />
                    </p>
                    <p className="font-display text-h3 text-ink">
                      {post.next.title}
                    </p>
                  </Link>
                ) : null}
              </nav>
            </article>

            <aside className="lg:col-span-4">
              <div className="sticky top-24">
                <DonateCTASidebar location="post_sidebar" />
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </>
  );
}
