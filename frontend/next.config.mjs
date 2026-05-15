/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/dbs2",
  assetPrefix: "/dbs2",
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  trailingSlash: true,
};

export default nextConfig;
