import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@donq/security"],
  serverExternalPackages: ["ioredis"],
};

export default nextConfig;
