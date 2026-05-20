import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Strict Mode double-mounts effects in dev. Vapi/Daily lifecycle is handled
   * by VapiSessionManager (singleton + listener attach/detach only).
   */
  reactStrictMode: true,

  /** Avoid serving the app on 127.0.0.1 by default — Vapi CORS expects localhost. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
