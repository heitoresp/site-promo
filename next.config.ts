import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "**.shopee.com.br" },
      { protocol: "https", hostname: "**.magazineluiza.com.br" },
      { protocol: "https", hostname: "images-americanas.com.br" },
      { protocol: "https", hostname: "**.casasbahia.com.br" },
      { protocol: "https", hostname: "**.aliexpress.com" },
    ],
  },
  experimental: {
    // Server Actions habilitadas por padrão no Next.js 15
  },
};

export default nextConfig;
