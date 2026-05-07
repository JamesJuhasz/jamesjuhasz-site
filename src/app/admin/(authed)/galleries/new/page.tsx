import { GalleryForm } from "../GalleryForm";

export default function NewGalleryPage() {
  return (
    <div>
      <p className="text-eyebrow uppercase tracking-wider text-ink/50">Galleries</p>
      <h1 className="mt-2 mb-8 font-display text-h1 leading-tight">New gallery</h1>
      <GalleryForm />
    </div>
  );
}
