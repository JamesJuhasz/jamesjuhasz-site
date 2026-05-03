import Image from "next/image";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

/*
  /hero-picker — internal review surface for Day 7 asset curation.
  Auto-discovers any image dropped into public/images/hero-candidates/.
  NOT for public launch — disable / remove before Day 8 deploy.
*/

export const metadata = {
  title: "Hero Picker (internal)",
  robots: { index: false, follow: false },
};

const CANDIDATES_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "hero-candidates",
);

function loadCandidates() {
  try {
    const files = readdirSync(CANDIDATES_DIR)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .map((file) => {
        const stat = statSync(path.join(CANDIDATES_DIR, file));
        return { file, mtime: stat.mtimeMs };
      })
      // Newest first — your recently-added photos surface at the top
      .sort((a, b) => b.mtime - a.mtime);
    return files;
  } catch {
    return [];
  }
}

export default function HeroPickerPage() {
  const candidates = loadCandidates();

  return (
    <div className="py-section-y">
      <Container width="wide">
        <Badge tone="donate">Internal — remove before launch</Badge>
        <h1 className="mt-4 font-serif text-display text-navy">
          Pick the hero photo
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-ink/75">
          {candidates.length} candidates from{" "}
          <code className="bg-foam-deep px-1.5 py-0.5 rounded text-caption">
            public/images/hero-candidates/
          </code>
          . Newest first. Click any to open full size in a new tab.
        </p>
        <p className="mt-2 text-caption text-mist max-w-prose">
          Criteria: action shot, athlete identifiable, dramatic ocean/sky,
          composition with negative space for overlaid text, ≥ 2400px wide,
          emotional weight (ambition, movement, focus). Pick a hero, an about
          portrait, and a few section backgrounds.
        </p>

        {candidates.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-foam-deep ring-1 ring-line p-6">
            <p className="text-body text-mist">
              No candidates found. Drop image files into{" "}
              <code className="bg-white px-1.5 py-0.5 rounded text-caption">
                public/images/hero-candidates/
              </code>
              .
            </p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map(({ file }) => {
              const name = file.replace(/\.[^.]+$/, "");
              return (
                <li
                  key={file}
                  className="rounded-2xl overflow-hidden ring-1 ring-line bg-white"
                >
                  <a
                    href={`/images/hero-candidates/${file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="relative aspect-[3/2] bg-foam-deep">
                      <Image
                        src={`/images/hero-candidates/${file}`}
                        alt={`Candidate ${name}`}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </div>
                  </a>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <p className="font-mono text-caption text-mist truncate">
                      {name}
                    </p>
                    <a
                      href={`/images/hero-candidates/${file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-caption text-navy underline whitespace-nowrap"
                    >
                      Open full
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-16 rounded-2xl bg-foam-deep ring-1 ring-line p-6">
          <h2 className="font-serif text-h3 text-navy">Once you've picked</h2>
          <ol className="mt-4 list-decimal list-inside space-y-2 text-body text-ink/80">
            <li>
              Note the file name(s). Tell me which one is the hero, which is
              the about portrait, and any others you want as section
              backgrounds.
            </li>
            <li>
              I'll convert the originals to .webp + .avif via sharp, wire
              them into <code>HomeHero</code>, the about page, and any other
              spots with gradient placeholders today.
            </li>
            <li>Then we delete this route + the candidates folder before Day 8 deploy.</li>
          </ol>
        </div>
      </Container>
    </div>
  );
}
