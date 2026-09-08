import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained production output (only the files the server actually
  // needs at runtime, with a pruned node_modules) -- what the Dockerfile's
  // production stage runs via `node server.js` instead of `next start`.
  output: "standalone",
};

export default nextConfig;
