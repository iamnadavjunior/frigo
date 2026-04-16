import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["xlsx", "pg"],
};

export default nextConfig;
