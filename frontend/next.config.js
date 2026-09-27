const runtimeCaching = require("next-pwa/cache");

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  runtimeCaching,
  buildExcludes: [/middleware-manifest\.json$/],
  scope: "/",
  sw: "service-worker.js",
  skipWaiting: true,
  disable: process.env.NODE_ENV !== "production",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,

  // 🔴 IMPORTANT (add this)
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    domains: [
      "res.cloudinary.com",
      "i.postimg.cc",
      "img.youtube.com",
      "placehold.co",
      "localhost",
      "127.0.0.1",
      "images.unsplash.com",
      "onemg.gumlet.io",
      "i.ibb.co",
      "farmacykart.com",
      "www.farmacykart.com",
      "api.farmacykart.com",
      "admin.farmacykart.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.farmacykart.com",
      },
      {
        protocol: "http",
        hostname: "**.farmacykart.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "onemg.gumlet.io",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },

  i18n: {
    locales: ["en", "es", "fr", "de"],
    defaultLocale: "en",
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
