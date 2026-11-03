import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // Foto tempat dari Wikimedia Commons (src/lib/commons.ts); host harus sama dengan THUMB_HOSTS di sana.
  images: {
    remotePatterns: ["thumb.wikimedia.org", "upload.wikimedia.org"].map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/wikipedia/commons/**",
      search: "",
    })),
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
