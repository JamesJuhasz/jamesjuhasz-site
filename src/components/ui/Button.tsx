import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "donate";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-navy text-foam hover:bg-navy-deep focus-visible:outline-navy",
  secondary:
    "bg-foam-deep text-navy hover:bg-sand/60 ring-1 ring-line",
  ghost:
    "bg-transparent text-navy hover:bg-foam-deep ring-1 ring-line",
  donate:
    "bg-donate text-white hover:bg-donate-hover shadow-soft hover:shadow-lift",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-5 text-body",
  lg: "h-12 px-6 text-body-lg",
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-tight transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children, ...rest } = props;
  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if ("href" in rest && rest.href) {
    return (
      <Link {...(rest as ButtonAsLink)} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} className={classes}>
      {children}
    </button>
  );
}
