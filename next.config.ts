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
};

export default nextConfig;
