import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Required for PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
  // Security headers - see OWASP recommendations
  // https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking by blocking iframe embedding
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevents MIME type sniffing attacks
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Controls referrer info sent with requests (balance privacy vs functionality)
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Forces HTTPS for 1 year; browsers remember and auto-upgrade HTTP
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disables browser features we don't use (reduces attack surface)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
