import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SeedPost } from "@/lib/seed-data";

const monthFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function PostCard({ post }: { post: SeedPost }) {
  return (
    <Link
      href={`/newsletters/${post.slug}`}
      className="group flex flex-col gap-4 rounded-2xl bg-white ring-1 ring-line p-6 hover:shadow-lift hover:-translate-y-0.5 transition-all"
    >
      <div
        aria-hidden
        className="aspect-[16/10] w-full rounded-xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1F365A 0%, #0E2240 50%, #061122 100%)",
        }}
      >
        {/* Real cover image lands Day 7 via Sanity asset pipeline */}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption uppercase tracking-wider text-mist">
          {monthFmt.format(new Date(post.publishedAt))}
        </p>
        <h3 className="font-serif text-h3 text-navy group-hover:text-navy-deep transition-colors">
          {post.title}
        </h3>
        <p className="text-body text-ink/75 line-clamp-3">{post.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1 text-caption text-navy font-medium">
          Read post <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}
