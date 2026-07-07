import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@galaxy/schemas"],
  turbopack: {
    // Avoid monorepo/root inference issues when multiple lockfiles exist on the machine.
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "galaxy-prod.tlcdn.com",
        pathname: "/preview-assets/**",
      },
    ],
  },
};

export default nextConfig;
