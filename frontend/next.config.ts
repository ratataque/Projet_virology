import type { NextConfig } from "next";

const BUILD_MODE =
  process.env.BUILD_MODE === "STANDALONE" ? "standalone" : "export";

const nextConfig: NextConfig = {
  output: BUILD_MODE,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
