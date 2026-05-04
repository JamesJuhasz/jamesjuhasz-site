import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom font-size tokens defined in globals.css via @theme:
//   --text-display-xl, --text-display, --text-h1, --text-h2, --text-h3,
//   --text-body-lg, --text-body, --text-caption, --text-eyebrow
//
// Without this override, tailwind-merge's default config treats `text-paper`
// (a color token defined as --color-paper) as a font-size and strips it when
// followed by `text-body` (a real size token). That made `Button` variant=primary
// render with no visible label across the site (bg-ink + invisible text-paper).
//
// Override the `font-size` group to ONLY include our explicit size names. Anything
// else of the form `text-*` falls through to the `text-color` group as intended.
const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display",
            "h1",
            "h2",
            "h3",
            "body-lg",
            "body",
            "caption",
            "eyebrow",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
