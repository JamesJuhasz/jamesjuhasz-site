import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "muted" | "ink" | "navy";

const toneStyles: Record<Tone, string> = {
  default: "bg-paper ring-1 ring-mist",
  muted: "bg-fog ring-1 ring-mist/50",
  ink: "bg-ink text-paper ring-1 ring-ink-2",
  // Back-compat alias
  navy: "bg-ink text-paper ring-1 ring-ink-2",
};

const baseStyles = "rounded-2xl p-6 shadow-soft transition-shadow duration-200";

type CommonProps = {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
};

type CardAsDiv = CommonProps &
  Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children"> & {
    as?: "div";
    href?: undefined;
  };

type CardAsArticle = CommonProps &
  Omit<React.HTMLAttributes<HTMLElement>, "className" | "children"> & {
    as: "article";
    href?: undefined;
  };

type CardAsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & {
    as: typeof Link;
    href: string;
  };

export type CardProps = CardAsDiv | CardAsArticle | CardAsLink;

export function Card(props: CardProps) {
  const { tone = "default", className, children, as = "div", ...rest } = props;
  const classes = cn(baseStyles, toneStyles[tone], className);

  if (as === Link) {
    return (
      <Link {...(rest as Omit<CardAsLink, keyof CommonProps | "as">)} className={classes}>
        {children}
      </Link>
    );
  }

  if (as === "article") {
    return (
      <article {...(rest as React.HTMLAttributes<HTMLElement>)} className={classes}>
        {children}
      </article>
    );
  }

  return (
    <div {...(rest as React.HTMLAttributes<HTMLDivElement>)} className={classes}>
      {children}
    </div>
  );
}
