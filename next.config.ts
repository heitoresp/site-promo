import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Não expõe "X-Powered-By: Next.js" (não entrega o stack pra quem busca exploit)
  poweredByHeader: false,
  typescript: {
    // Erros de tipo agora QUEBRAM o build (deploy não sobe bug silencioso).
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint segue fora do build (evita travar deploy por regra de estilo);
    // rodar `npm run lint` no CI quando quiser endurecer.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "**.shopee.com.br" },
      { protocol: "https", hostname: "**.susercontent.com" },
      { protocol: "https", hostname: "**.magazineluiza.com.br" },
      { protocol: "https", hostname: "images-americanas.com.br" },
      { protocol: "https", hostname: "**.casasbahia.com.br" },
      { protocol: "https", hostname: "**.aliexpress.com" },
    ],
  },
  experimental: {
    // Server Actions habilitadas por padrão no Next.js 15
  },
  // Cabeçalhos de segurança aplicados a todas as rotas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Impede o site de ser embutido em iframe (anti-clickjacking/phishing)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Navegador não "adivinha" tipo de conteúdo (anti-MIME-sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Não vaza a URL completa do site como referer pra terceiros
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Bloqueia APIs sensíveis do navegador que o site não usa
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
