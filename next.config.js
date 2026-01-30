/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Optimize bundle size and loading
  swcMinify: true,
  // Enable compression
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Reduce warnings in production
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

module.exports = nextConfig

