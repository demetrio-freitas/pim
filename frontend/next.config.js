/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Local development - MinIO direct access
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/pim-assets/**',
      },
      // Docker internal network - MinIO service
      {
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
        pathname: '/pim-assets/**',
      },
      // Production - configure via environment or add your CDN/S3 hostname
      // Example for AWS S3:
      // {
      //   protocol: 'https',
      //   hostname: '*.s3.amazonaws.com',
      // },
    ],
    // Allow configuration via environment variable for production flexibility
    // This can be overridden at runtime with NEXT_PUBLIC_IMAGE_DOMAINS
    unoptimized: process.env.NODE_ENV === 'development' ? false : (process.env.NEXT_DISABLE_IMAGE_OPTIMIZATION === 'true'),
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
