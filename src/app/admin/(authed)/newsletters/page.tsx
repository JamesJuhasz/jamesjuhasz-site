import Link from "next/link";
import { listPosts, postStatus } from "@/lib/admin/store/posts";

export const dynamic = "force-dynamic";

export default async function NewslettersIndex() {
  const rows = await listPosts();
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wider text-ink/50">
            Newsletters
          </p>
          <h1 className="mt-2 font-display text-h1 leading-tight">
            All issues
          </h1>
        </div>
        <Link
          href="/admin/newsletters/new"
          className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider"
        >
          New newsletter
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-body text-ink-3">
          No newsletters yet — create your first one.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {rows.map((p) => {
            const status = postStatus(p);
            return (
              <li key={p.id} className="grid grid-cols-12 items-center gap-4 py-4">
                <div className="col-span-12 md:col-span-6">
                  <Link
                    href={`/admin/newsletters/${p.id}`}
                    className="font-display text-h4 leading-tight hover:underline"
                  >
                    {p.title}
                  </Link>
                  {p.excerpt ? (
                    <p className="mt-1 text-body-sm text-ink-3 line-clamp-1">
                      {p.excerpt}
                    </p>
                  ) : null}
                </div>
                <div className="col-span-6 md:col-span-2 text-caption uppercase tracking-wider text-ink/60">
                  <StatusBadge status={status} />
                </div>
                <div className="col-span-6 md:col-span-2 text-caption text-ink/60">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString("en-CA")
                    : new Date(p.updatedAt).toLocaleDateString("en-CA")}
                </div>
                <div className="col-span-12 md:col-span-2 flex justify-end gap-3 text-caption uppercase tracking-wider">
                  <Link
                    href={`/admin/newsletters/${p.id}`}
                    className="text-ink hover:underline"
                  >
                    Edit
                  </Link>
                  {status !== "draft" ? (
                    <Link
                      href={`/admin/newsletters/${p.id}/send`}
                      className="text-ink hover:underline"
                    >
                      Send
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" | "sent" }) {
  const map: Record<string, string> = {
    draft: "bg-ink/10 text-ink",
    published: "bg-yellow-100 text-yellow-900",
    sent: "bg-green-100 text-green-900",
  };
  return (
    <span className={`px-2 py-0.5 text-caption uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}
