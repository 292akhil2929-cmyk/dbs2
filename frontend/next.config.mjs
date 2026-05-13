/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",             // static HTML/CSS/JS for GitHub Pages
  basePath: "/shopsphere",      // GitHub Pages: https://<user>.github.io/shopsphere
  assetPrefix: "/shopsphere",
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
