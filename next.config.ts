import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for a photo added to a page; the editor shrinks photos well below this first
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
