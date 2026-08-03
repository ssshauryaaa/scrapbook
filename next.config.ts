import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',  // Google OAuth avatars
      },
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
      },
      {
        protocol: 'https',
        hostname: 'media.tenor.com',
      },
    ],
  },
  // Allow react-pdf to work in server components
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    // Needed for server actions used in route handlers
  },
}

export default nextConfig
