"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import type { Gallery } from "@/lib/galleries";

type Props = {
  galleries: Gallery[];
};

export function GalleryShowcase({ galleries }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {galleries.map((g, i) => (
        <GalleryCard key={g.slug} gallery={g} index={i} />
      ))}
    </div>
  );
}

function GalleryCard({ gallery, index }: { gallery: Gallery; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Scale: ramp up while entering, peak in the middle of the card's scroll range,
  // ramp down while leaving. Keeps the focused card at full size, others smaller.
  const rawScale = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    [0.86, 1, 1, 0.86],
  );
  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    [0.55, 1, 1, 0.55],
  );

  const scale = useSpring(rawScale, { stiffness: 140, damping: 24, mass: 0.4 });
  const opacity = useSpring(rawOpacity, {
    stiffness: 140,
    damping: 24,
    mass: 0.4,
  });

  const Wrapper = motion.div;
  const motionStyle = reduce ? undefined : { scale, opacity };

  return (
    <Wrapper
      ref={ref}
      style={motionStyle}
      className="will-change-transform"
    >
      <Link
        href={`/gallery/${gallery.slug}`}
        className="group relative block overflow-hidden rounded-2xl ring-1 ring-mist/50 hover:shadow-lift transition-shadow"
      >
        <div className="relative aspect-[16/9] w-full">
          <Image
            src={gallery.coverImage}
            alt=""
            fill
            sizes="(min-width: 1100px) 1100px, 100vw"
            priority={index < 2}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent"
          />
          <div className="absolute top-4 right-4">
            <Badge tone="navy">View</Badge>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <p className="text-eyebrow uppercase tracking-wider text-red mb-2">
              {gallery.dateRange} · {gallery.photoCount} photos
            </p>
            <h3 className="font-display text-h3 text-paper max-w-prose">
              {gallery.title}
            </h3>
            {gallery.context ? (
              <p className="mt-2 text-body text-paper/80 max-w-prose line-clamp-2">
                {gallery.context}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </Wrapper>
  );
}
