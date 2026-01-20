/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Optimize development server performance
  typescript: {
    // Skip type checking during build (faster dev server)
    ignoreBuildErrors: false,
  },
  // Reduce bundle analysis overhead in dev
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize dev server performance
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
