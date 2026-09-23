/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "120mb",
    },
  },
  // react-pdf / pdfjs optional native canvas — not used in browser viewer
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
  async redirects() {
    return [
      // Browsers request /favicon.ico by default; we ship SVG only.
      { source: "/favicon.ico", destination: "/favicon.svg", permanent: false },
      { source: "/branch-manager-dashboard", destination: "/dashboard", permanent: true },
      { source: "/branch-manager-dashboard/:path*", destination: "/dashboard/:path*", permanent: true },
      // Static HTML → Next.js website routes
      { source: "/landing.html", destination: "/", permanent: true },
      { source: "/courses-details.html", destination: "/courses", permanent: true },
      { source: "/store.html", destination: "/store", permanent: true },
    ]
  },
}

export default nextConfig
