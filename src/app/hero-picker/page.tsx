import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

/*
  /hero-picker — internal review surface for Day 7 asset curation.
  NOT for public launch — disable / remove before Day 8 deploy.

  Compares 12 hero candidates side-by-side. Pick the strongest, then
  edit src/components/sections/HomeHero.tsx to use it as a next/image
  fill background. Move chosen file out of /hero-candidates and into
  /public/images/hero.jpg (or whatever name you prefer), then optimize
  to .webp via sharp before launch.
*/

export const metadata = {
  title: "Hero Picker (internal)",
  robots: { index: false, follow: false },
};

const candidates = [
  "IMG_9100",
  "IMG_9128",
  "IMG_1133",
  "IMG_8822",
  "IMG_9203",
  "IMG_8476",
  "IMG_8572",
  "IMG_3664",
  "IMG_8853",
  "IMG_8661",
  "IMG_8810",
  "IMG_9095",
];

export default function HeroPickerPage() {
  return (
    <div className="py-section-y">
      <Container width="wide">
        <Badge tone="donate">Internal — remove before launch</Badge>
        <h1 className="mt-4 font-serif text-display text-navy">
          Pick the hero photo
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-ink/75">
          12 candidates from the Squarespace backup. Click any to see it as a
          full-bleed hero. The strongest one becomes the home page background;
          the rest become section / card backgrounds elsewhere.
        </p>
        <p className="mt-2 text-caption text-mist max-w-prose">
          Criteria: action shot, athlete identifiable, dramatic ocean/sky,
          composition with negative space for overlaid text, ≥ 2400px wide,
          emotional weight (ambition, movement, focus).
        </p>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((name) => (
            <li
              key={name}
              className="rounded-2xl overflow-hidden ring-1 ring-line bg-white"
            >
              <div className="relative aspect-[3/2] bg-foam-deep">
                <Image
                  src={`/images/hero-candidates/${name}.jpg`}
                  alt={`Candidate ${name}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <p className="font-mono text-caption text-mist">{name}</p>
                <a
                  href={`/images/hero-candidates/${name}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption text-navy underline"
                >
                  Open full
                </a>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-16 rounded-2xl bg-foam-deep ring-1 ring-line p-6">
          <h2 className="font-serif text-h3 text-navy">Once you've picked</h2>
          <ol className="mt-4 list-decimal list-inside space-y-2 text-body text-ink/80">
            <li>
              Note the chosen file name (e.g. <code>IMG_9100</code>).
            </li>
            <li>
              Tell me which file (or paste the file name) and I'll wire it into
              the hero component, optimize to .webp via sharp, and move it to
              <code> /public/images/hero.webp</code>.
            </li>
            <li>
              Repeat for the about portrait + supporter logos + per-gallery
              covers.
            </li>
            <li>Delete this route before Day 8 deploy.</li>
          </ol>
        </div>
      </Container>
    </div>
  );
}
