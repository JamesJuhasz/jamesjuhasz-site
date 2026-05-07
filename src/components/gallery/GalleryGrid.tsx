"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Reveal } from "@/components/ui/Reveal";

type Props = {
  heroPhoto: string;
  tilePhotos: string[];
  blurDataURLs: Record<string, string>;
};

const aspects = ["aspect-[4/5]", "aspect-[3/2]", "aspect-square", "aspect-[5/4]"];

export function GalleryGrid({ heroPhoto, tilePhotos, blurDataURLs }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const allPhotos = [heroPhoto, ...tilePhotos];
  const slides = allPhotos.map((src) => ({ src }));

  const open = useCallback((index: number) => setLightboxIndex(index), []);
  const close = useCallback(() => setLightboxIndex(-1), []);

  const blur = (src: string) =>
    blurDataURLs[src]
      ? { placeholder: "blur" as const, blurDataURL: blurDataURLs[src] }
      : {};

  return (
    <>
      {heroPhoto ? (
        <Reveal className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-fog mb-3 cursor-zoom-in">
          <Image
            src={heroPhoto}
            alt=""
            fill
            priority
            quality={75}
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="object-cover hover:scale-[1.02] transition-transform duration-700"
            onClick={() => open(0)}
            {...blur(heroPhoto)}
          />
        </Reveal>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {tilePhotos.map((src, i) => (
          <Reveal
            key={`${src}-${i}`}
            delay={Math.min(i * 0.04, 0.32)}
            className={`relative ${aspects[i % aspects.length]} rounded-xl overflow-hidden bg-fog cursor-zoom-in`}
          >
            <Image
              src={src}
              alt=""
              fill
              quality={45}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover hover:scale-[1.03] transition-transform duration-700"
              onClick={() => open(i + 1)}
              {...blur(src)}
            />
          </Reveal>
        ))}
      </div>

      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={close}
        slides={slides}
        on={{ view: ({ index }) => setLightboxIndex(index) }}
        controller={{ closeOnBackdropClick: true }}
        styles={{ root: { "--yarl__color_backdrop": "rgba(0,0,0,0.92)" } }}
      />
    </>
  );
}
