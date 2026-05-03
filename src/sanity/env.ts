/*
  Centralized Sanity env access. Falls back to undefined if not configured —
  callers must check `isSanityConfigured()` and degrade to seed-data fallback.
*/

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-05-01";
export const readToken = process.env.SANITY_API_READ_TOKEN;
export const writeToken = process.env.SANITY_API_WRITE_TOKEN;
export const revalidateSecret = process.env.SANITY_REVALIDATE_SECRET;

export function isSanityConfigured(): boolean {
  return Boolean(projectId);
}

export function getProjectIdOrThrow(): string {
  if (!projectId) {
    throw new Error(
      "Sanity is not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local. See docs/SANITY_SETUP.md.",
    );
  }
  return projectId;
}
