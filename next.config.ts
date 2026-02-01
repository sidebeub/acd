import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/free-allen-bradley-plc-viewer',
        destination: '/allen-bradley-plc-viewer',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
