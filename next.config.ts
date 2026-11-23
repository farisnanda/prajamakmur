import type { NextConfig } from "next";

const basePath = "/prajamakmur";

if (process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = new URL(
    `${basePath}/api/auth`,
    process.env.AUTH_URL,
  ).toString();
}

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  experimental: {
    // Cukup untuk beberapa foto 5 MB dalam satu formulir; 40 MB terlalu longgar.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
