"use client";

/*
  Sanity studio config — embedded at /studio. Visit /studio after setting
  env vars and running `npx sanity init` (see docs/SANITY_SETUP.md).
*/

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemas";
import { apiVersion, dataset, projectId } from "./src/sanity/env";

export default defineConfig({
  name: "default",
  title: "James Juhasz — Studio",
  basePath: "/studio",
  projectId: projectId ?? "missing-project-id",
  dataset,
  schema: { types: schemaTypes },
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
});
