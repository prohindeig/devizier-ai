import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pe Vercel NU folosim output standalone (Vercel își gestionează singur build-ul).
  // Local/sandbox păstrăm standalone pentru rularea în mod producție.
  output: process.env.VERCEL ? undefined : "standalone",
  // Pachete server-side rulate din node_modules (fără bundling) — evită probleme
  // de bundling cu SDK-ul AI și cu motorul Prisma pe serverless.
  serverExternalPackages: ["z-ai-web-dev-sdk", "@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
