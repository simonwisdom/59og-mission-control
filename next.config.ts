import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Actual's client runs its own engine with a native SQLite module, so it's loaded from
  // node_modules at runtime rather than bundled
  serverExternalPackages: ["@actual-app/api"],
  experimental: {
    serverActions: {
      // Room for a photo added to a page; the editor shrinks photos well below this first
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
