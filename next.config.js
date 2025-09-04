/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // reduce double-invocation noise in dev
  experimental: {
    optimizePackageImports: [
      '@tabler/icons-react',
    ],
  },
};

module.exports = nextConfig;
