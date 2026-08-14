import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["openai"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
