import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4010";

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
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
