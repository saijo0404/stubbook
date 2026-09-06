/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@stubbook/scraper-core', '@stubbook/database', '@stubbook/logger'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
