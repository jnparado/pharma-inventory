import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: "/orders/:id",
        destination: "/orders",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
