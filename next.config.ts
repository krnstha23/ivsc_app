import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // When using `npm run dev:turbo`, avoid Turbopack’s on-disk cache (can corrupt
  // with missing .sst / middleware-manifest on some setups).
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  typescript: {
    // Type-checking runs separately via `npm run typecheck`.
    // Skipping here keeps Docker build RAM usage under control.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
