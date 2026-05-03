import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { DonateCTASidebar, DonateCTAInline } from "@/components/cta/DonateCTA";
import { PortableText } from "@/components/sanity/PortableText";
import { JsonLd } from "@/components/JsonLd";
import { articleJsonLd } from "@/lib/json-ld";
import { getPostBySlug, getPostsIndex } from "@/sanity/fetch";

export const revalidate = 60;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateStaticParams() {
  const posts = await getPostsIndex();
  return posts.map((p) => ({ slug: p.slug }));
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

  const hasBody = !!post.body;

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
      <section className="py-section-y bg-foam-deep border-b border-line">
        <Container width="prose">
          <Link
            href="/newsletters"
            className="inline-flex items-center gap-1 text-mist hover:text-navy mb-6 text-caption uppercase tracking-wider"
          >
            <ChevronLeft size={14} /> All posts
          </Link>
          <p className="text-eyebrow uppercase tracking-wider text-mist mb-3">
            {dateFmt.format(new Date(post.publishedAt))}
            {post.tags?.length ? (
              <>
                {" · "}
                {post.tags.slice(0, 2).join(" · ")}
              </>
            ) : null}
          </p>
          <h1 className="font-serif text-h1 text-navy">{post.title}</h1>
          {post.excerpt ? (
            <p className="mt-4 text-body-lg text-ink/75 max-w-prose">
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
                  <PortableText value={post.body} />
                ) : (
                  <p className="text-body-lg text-ink/80 max-w-prose">
                    {post.excerpt ??
                      "Full body text lands once Sanity is set up and content is imported (Day 5)."}
                  </p>
                )}
              </Reveal>

              <DonateCTAInline
                location="post_body_close"
                className="my-12 -mx-container-x"
              />

              <nav className="mt-12 grid sm:grid-cols-2 gap-4 border-t border-line pt-8">
                {"previous" in post && post.previous ? (
                  <Link
                    href={`/newsletters/${post.previous.slug}`}
                    className="rounded-2xl ring-1 ring-line p-5 hover:bg-foam-deep transition-colors"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-mist mb-1">
                      <ChevronLeft size={12} className="inline" /> Previous
                    </p>
                    <p className="font-serif text-h3 text-navy">
                      {post.previous.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
                {"next" in post && post.next ? (
                  <Link
                    href={`/newsletters/${post.next.slug}`}
                    className="rounded-2xl ring-1 ring-line p-5 hover:bg-foam-deep transition-colors text-right"
                  >
                    <p className="text-eyebrow uppercase tracking-wider text-mist mb-1">
                      Next <ChevronRight size={12} className="inline" />
                    </p>
                    <p className="font-serif text-h3 text-navy">
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
