import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // compila il pacchetto TS condiviso del workspace.
  transpilePackages: ["@donq/security"],
  // ioredis resta solo lato server.
  serverExternalPackages: ["ioredis"],
};

export default nextConfig;
