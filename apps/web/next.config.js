import createNextIntlPlugin from "next-intl/plugin"

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@petora/ui",
    "@petora/db",
    "@petora/core",
    "@petora/auth",
    "@petora/rbac",
    "@petora/integrations",
    "@petora/documents"
  ],
  experimental: {
    turbo: {}
  }
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
