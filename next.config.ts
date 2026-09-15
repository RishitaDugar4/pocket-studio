import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev overlay badge sits on top of the asset panel in the bottom-left
  // corner of the studio, so it is off by default here.
  devIndicators: false,

  // Prisma ships a native query engine. Leaving the client external keeps the
  // bundler from rewriting it into the serverless function, which is the usual
  // cause of "engine not found" at runtime on a serverless host.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
