"use client";

import { useEffect, useState } from "react";

/*
  Detects coarse-pointer / no-hover devices (phones, most tablets).
  Used to swap behaviors that stutter or feel wrong on touch — e.g. disabling
  scroll-bound parallax which thrashes on mobile Safari. Returns false during
  SSR so the desktop experience is the default render.
*/
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: none) and (pointer: coarse)");
    const update = () => setIsTouch(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isTouch;
}
