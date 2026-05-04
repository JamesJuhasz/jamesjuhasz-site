import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SeedPost } from "@/lib/seed-data";

const monthFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Defensive cleanup for text that may have come from the Squarespace XML
 * import: decodes the most common HTML entities, strips leading/trailing
 * whitespace (including non-breaking-space artifacts left by the importer),
 * and capitalises a known proper-noun typo from the source data
 * ("european" → "European").
 *
 * Seed-data is already clean — this guards against Sanity-fetched posts that
 * still carry the un-decoded entities the importer produced.
 */
function cleanText(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .replace(/\beuropean\b/g, "European")
    .trim();
}

export function PostCard({ post }: { post: SeedPost }) {
  const coverUrl = post.coverImage?.asset?.url;
  const title = cleanText(post.title);
  const excerpt = cleanText(post.excerpt);
  return (
    <Link
      href={`/newsletters/${post.slug}`}
      className="group flex flex-col gap-4 rounded-2xl bg-white ring-1 ring-mist p-6 hover:shadow-lift hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-fog">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={post.coverImage?.alt ?? ""}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wider text-ink-3">
          {monthFmt.format(new Date(post.publishedAt))}
        </p>
        <h3 className="font-display text-h3 text-ink group-hover:text-ink-2 transition-colors">
          {title}
        </h3>
        <p className="text-body text-ink/75 line-clamp-3">{excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1 text-caption text-ink font-medium">
          Read post <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}
