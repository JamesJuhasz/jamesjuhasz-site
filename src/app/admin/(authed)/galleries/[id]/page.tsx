import { notFound } from "next/navigation";
import { getGalleryById } from "@/lib/admin/store/galleries";
import { GalleryForm } from "../GalleryForm";

export const dynamic = "force-dynamic";

export default async function EditGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const gallery = await getGalleryById(id);
  if (!gallery) notFound();

  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">Galleries</p>
      <h1 className="mt-2 mb-8 font-display text-h1 leading-tight">Edit gallery</h1>
      <GalleryForm
        initial={{
          id: gallery.id,
          title: gallery.title,
          slug: gallery.slug,
          dateRange: gallery.dateRange,
          context: gallery.context,
          coverImageUrl: gallery.coverImageUrl,
          lastAnnouncedAt: gallery.lastAnnouncedAt
            ? gallery.lastAnnouncedAt.toISOString()
            : null,
          photos: gallery.photos.map((p) => ({
            id: p.id,
            url: p.url,
            alt: p.alt,
          })),
        }}
      />
    </div>
  );
}
