import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Output minimale e self-contained per l'immagine Docker (server.js + node_modules tracciati).
  output: "standalone",
  // ioredis e il client OpenRouter restano solo lato server.
  serverExternalPackages: ["ioredis"],
};

export default nextConfig;
