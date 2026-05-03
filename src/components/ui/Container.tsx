import * as React from "react";
import { cn } from "@/lib/cn";

type Width = "narrow" | "default" | "wide" | "prose";

const widthStyles: Record<Width, string> = {
  narrow: "max-w-narrow",
  default: "max-w-default",
  wide: "max-w-wide",
  prose: "max-w-prose",
};

export function Container({
  width = "default",
  className,
  children,
  as: Component = "div",
}: {
  width?: Width;
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-container-x",
        widthStyles[width],
        className,
      )}
    >
      {children}
    </Component>
  );
}
