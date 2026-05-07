import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostById } from "@/lib/admin/store/posts";
import { SendControls } from "./SendControls";

export const dynamic = "force-dynamic";

export default async function SendPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const post = await getPostById(id);
  if (!post) notFound();

  const sent = Boolean(post.sentAt);

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">
        <Link href={`/admin/newsletters/${id}`} className="hover:underline">
          ← Back to edit
        </Link>
      </p>
      <h1 className="mt-2 mb-2 font-display text-h1 leading-tight">Send</h1>
      <p className="text-body text-ink-3 mb-8">
        Test sends go to <strong>{process.env.CONTACT_TO_ADDRESS ?? "rjamesjuhasz@gmail.com"}</strong>.
        Sending to all subscribers creates a Resend broadcast and is a one-shot
        action.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="border border-ink/10 bg-white">
          <div className="border-b border-ink/10 bg-ink/[0.02] px-4 py-3 text-caption uppercase tracking-wider text-ink-3">
            Preview
          </div>
          <div className="p-6">
            <h2 className="font-display text-h2 leading-tight">{post.title}</h2>
            {post.excerpt ? (
              <p className="mt-3 text-body-lg text-ink-3">{post.excerpt}</p>
            ) : null}
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt ?? ""}
                className="mt-6 w-full"
              />
            ) : null}
            <div
              className="prose-newsletter mt-6"
              dangerouslySetInnerHTML={{ __html: post.bodyHtml ?? "" }}
            />
          </div>
        </section>

        <aside className="flex flex-col gap-4 border border-ink/10 p-5 lg:sticky lg:top-6 self-start">
          <SendControls postId={id} alreadySent={sent} title={post.title} />
          {sent ? (
            <p className="text-caption text-ink-3">
              Broadcast sent {post.sentAt ? new Date(post.sentAt).toLocaleString() : ""}.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
