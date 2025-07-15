import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Increase limit to 10MB or more
    },
  },
};

export default nextConfig;
