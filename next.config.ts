import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Used only for Arena's proxied development preview, not production origins.
  allowedDevOrigins: ["*.e2b.app"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
      ...[
        "/api/auth/:path*",
        "/api/bot/:path*",
        "/api/artworks/:path*",
        "/api/settings",
        "/api/categories",
        "/api/health",
        "/api/upload",
      ].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store" }],
      })),
    ];
  },
};
export default nextConfig;
