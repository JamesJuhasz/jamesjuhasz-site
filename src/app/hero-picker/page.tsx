import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { HeroPickerClient } from "./HeroPickerClient";

/*
  /hero-picker — internal asset curation.
  Server reads the candidates folder; client component handles selection.
  Auto-discovers any image dropped into public/images/hero-candidates/.
  NOT for public launch — remove before Day 8 deploy.
*/

export const metadata = {
  title: "Hero Picker (internal)",
  robots: { index: false, follow: false },
};

// Re-read on every request so newly-added images appear without rebuild.
export const dynamic = "force-dynamic";

const CANDIDATES_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "hero-candidates",
);

function loadCandidates() {
  try {
    return readdirSync(CANDIDATES_DIR)
      .filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .map((file) => {
        const stat = statSync(path.join(CANDIDATES_DIR, file));
        return { file, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map(({ file }) => file);
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
        <h1 className="mt-4 font-display text-display text-ink">
          Pick the hero photos
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-ink/75">
          {candidates.length} candidates from{" "}
          <code className="bg-fog px-1.5 py-0.5 rounded text-caption">
            public/images/hero-candidates/
          </code>
          . Newest first. Tap a section pill on each photo to assign it. Tap
          again to clear.
        </p>
        <div className="md:hidden mt-6 rounded-2xl bg-fog ring-1 ring-mist p-5">
          <p className="font-display text-h3 text-ink">Best on desktop</p>
          <p className="mt-2 text-body text-ink/75">
            This is an internal curation tool — open it on a wider screen for
            the full grid and per-image controls.
          </p>
        </div>
        <div className="hidden md:block">
          <HeroPickerClient candidates={candidates} />
        </div>
      </Container>
    </div>
  );
}
