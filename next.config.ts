import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev overlay badge sits on top of the asset panel in the bottom-left
  // corner of the studio, so it is off by default here.
  devIndicators: false,
};

export default nextConfig;
