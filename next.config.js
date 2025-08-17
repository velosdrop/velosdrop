/** @type {import('next').NextConfig} */
const nextConfig = {
  // Essential for env vars to work in server-side code
  env: {
    TURSO_CONNECTION_URL: process.env.TURSO_CONNECTION_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig