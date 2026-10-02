import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(),
  webpack(config) {
    config.resolve.alias["@shared"] = path.resolve(__dirname, "./shared");
    return config;
  },
};

export default nextConfig;
