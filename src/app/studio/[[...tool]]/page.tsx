"use client";

/*
  Mount the embedded Sanity Studio at /studio.
  Studio is a single-page app that handles its own routing under /studio/*.
*/

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export const dynamic = "force-static";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
