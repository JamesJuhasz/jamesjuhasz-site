import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostById, postStatus } from "@/lib/admin/store/posts";
import { PostForm } from "../PostForm";

export const dynamic = "force-dynamic";

export default async function EditNewsletterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const post = await getPostById(id);
  if (!post) notFound();
  const status = postStatus(post);

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        Newsletter · {status}
      </p>
      <div className="mt-2 mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-h1 leading-tight">Edit issue</h1>
        {status !== "draft" ? (
          <Link
            href={`/admin/newsletters/${id}/send`}
            className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider"
          >
            Send
          </Link>
        ) : null}
      </div>
      <PostForm
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          coverImageUrl: post.coverImageUrl,
          coverImageAlt: post.coverImageAlt,
          bodyHtml: post.bodyHtml,
          bodyJson: post.bodyJson,
          tags: post.tags,
          featured: post.featured,
          publishedAt: post.publishedAt
            ? post.publishedAt.toISOString()
            : null,
        }}
      />
    </div>
  );
}
