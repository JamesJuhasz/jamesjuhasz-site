import type { NextConfig } from "next";

const remotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [];

// Allow next/image to load from the Cloudflare R2 public domain when configured.
// Skipped in environments where R2_PUBLIC_BASE_URL isn't set so dev builds
// without R2 don't crash; runtime image loads will then surface the
// misconfiguration loudly.
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
if (r2PublicBaseUrl) {
  try {
    const r2 = new URL(r2PublicBaseUrl);
    remotePatterns.push({
      protocol: r2.protocol.replace(/:$/, "") as "http" | "https",
      hostname: r2.hostname,
      pathname: "/uploads/**",
    });
  } catch {
    // Bad URL in env — skip silently; image loads will fail loud at runtime.
  }
}

const nextConfig: NextConfig = {
  // Hide the Next.js dev "N" badge that overlays every page in development.
  // The badge clutters screenshots and isn't useful for the team.
  devIndicators: false,
  images: {
    qualities: [75, 90],
    remotePatterns,
  },
};

export default nextConfig;
