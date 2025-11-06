/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:4000'
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ]
  }
};

module.exports = nextConfig;


