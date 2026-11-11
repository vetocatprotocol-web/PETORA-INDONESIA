/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@petora/ui", "@petora/db", "@petora/core", "@petora/auth", "@petora/rbac", "@petora/integrations", "@petora/documents"],
  experimental: {
    turbo: {}
  }
}

export default nextConfig
