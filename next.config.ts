import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Type-checking runs separately via `npm run typecheck`.
    // Skipping here keeps Docker build RAM usage under control.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
