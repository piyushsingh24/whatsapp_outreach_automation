/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["exceljs", "bullmq", "ioredis"],
  },
};

module.exports = nextConfig;
