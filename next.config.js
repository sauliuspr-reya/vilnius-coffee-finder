/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/place/photo/**',
      },
      {
        protocol: 'https',
        hostname: 'vijkvgfgcvkwouivfrjw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/place-photos/**',
      },
    ],
  },
};

module.exports = nextConfig;
