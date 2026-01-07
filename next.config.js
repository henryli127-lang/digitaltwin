/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow file uploads up to 50MB
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
}

module.exports = nextConfig

