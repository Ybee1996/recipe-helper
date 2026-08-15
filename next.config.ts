import type { NextConfig } from "next";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const isOneDriveWindows =
  process.platform === "win32" && __dirname.includes("OneDrive");

const webpackCacheDir = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "recipe-helper",
  "webpack-cache",
);

if (isOneDriveWindows) {
  fs.mkdirSync(webpackCacheDir, { recursive: true });
}

const nextConfig: NextConfig = {
  // Keep DB/blob drivers out of webpack vendor chunks so OneDrive/HMR
  // cannot orphan numbered files like vendor-chunks/@neondatabase.js.
  serverExternalPackages: ["openai", "@neondatabase/serverless", "@vercel/blob"],
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config, { dev }) => {
    if (isOneDriveWindows && dev) {
      // cache: false makes webpack drop module factories during HMR
      // (`undefined.call`). Keep a filesystem cache, just not on OneDrive.
      config.cache = {
        type: "filesystem",
        cacheDirectory: webpackCacheDir,
        // Windows can fail renaming compressed .pack_ files (ENOENT).
        compression: false,
      };
    }
    return config;
  },
};

export default nextConfig;
