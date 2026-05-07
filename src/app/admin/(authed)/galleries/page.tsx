import Link from "next/link";
import { listGalleriesWithCounts } from "@/lib/admin/store/galleries";

export const dynamic = "force-dynamic";

export default async function GalleriesIndex() {
  const rows = await listGalleriesWithCounts();
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow uppercase tracking-wider text-ink/50">
            Galleries
          </p>
          <h1 className="mt-2 font-display text-h1 leading-tight">
            Photo galleries
          </h1>
          <p className="mt-3 text-body text-ink-3 max-w-prose">
            Sub-collections shown on /gallery. Edit titles, dates, and
            subtitles. Upload new photos and reorder.
          </p>
        </div>
        <Link
          href="/admin/galleries/new"
          className="bg-ink text-paper px-5 py-3 text-button uppercase tracking-wider"
        >
          New gallery
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-body text-ink-3">
          No galleries yet — create one with “New gallery”.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-ink/10 border-y border-ink/10">
          {rows.map((g) => (
            <li key={g.id} className="grid grid-cols-12 items-center gap-4 py-4">
              <div className="col-span-12 md:col-span-5">
                <Link
                  href={`/admin/galleries/${g.id}`}
                  className="font-display text-h4 leading-tight hover:underline"
                >
                  {g.title}
                </Link>
                <p className="mt-1 text-caption text-ink-3">/gallery/{g.slug}</p>
              </div>
              <div className="col-span-6 md:col-span-3 text-caption text-ink/60">
                {g.dateRange}
              </div>
              <div className="col-span-6 md:col-span-3 text-caption text-ink/60">
                {g.photoCount} {g.photoCount === 1 ? "photo" : "photos"}
              </div>
              <div className="col-span-12 md:col-span-1 text-right text-caption uppercase tracking-wider">
                <Link href={`/admin/galleries/${g.id}`} className="hover:underline">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
