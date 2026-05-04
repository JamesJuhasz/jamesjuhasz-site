import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev "N" badge that overlays every page in development.
  // The badge clutters screenshots and isn't useful for the team.
  devIndicators: false,
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
