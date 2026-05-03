"use client";

import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
} from "@portabletext/react";
import Image from "next/image";
import Link from "next/link";
import { urlFor } from "@/sanity/image";
import { DonateCTAInline } from "@/components/cta/DonateCTA";

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      const url = urlFor(value)?.width(1200).fit("max").url();
      if (!url) return null;
      return (
        <figure className="my-8">
          <Image
            src={url}
            alt={value.alt ?? ""}
            width={1200}
            height={800}
            className="rounded-2xl w-full h-auto"
            sizes="(min-width: 1024px) 70ch, 100vw"
          />
          {value.caption ? (
            <figcaption className="mt-2 text-caption text-mist text-center">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    pullQuote: ({ value }) => (
      <blockquote className="my-10 border-l-4 border-donate pl-6">
        <p className="font-serif text-h3 text-navy leading-snug">
          {value.text}
        </p>
        {value.attribution ? (
          <cite className="mt-3 block text-caption text-mist not-italic">
            — {value.attribution}
          </cite>
        ) : null}
      </blockquote>
    ),
    inlineDonateCta: ({ value }) => (
      <DonateCTAInline
        location="post_inline_cta"
        headline={value.headline}
        body={value.body}
        ctaLabel={value.ctaLabel}
        className="my-10 -mx-container-x"
      />
    ),
  },
  block: {
    h2: ({ children }) => (
      <h2 className="font-serif text-h2 text-navy mt-12 mb-4">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="font-serif text-h3 text-navy mt-10 mb-3">{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-line pl-5 text-body-lg text-ink/80 italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="my-5 text-body-lg text-ink/85 leading-relaxed">{children}</p>
    ),
  },
  marks: {
    link: ({ value, children }) => {
      const href = value?.href ?? "#";
      const isInternal = href.startsWith("/");
      if (isInternal) {
        return (
          <Link href={href} className="text-navy underline">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-navy underline"
        >
          {children}
        </a>
      );
    },
  },
};

export function PortableText({ value }: { value: unknown }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  return <PortableTextRenderer value={value as never} components={components} />;
}
