import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Fonte display (títulos) — mais personalidade que a Inter
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-cal",
  weight: ["600", "700", "800"],
  display: "swap",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ApenasPromo";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "https://apenaspromo.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Melhores Promoções do Dia`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "As melhores promoções e cupons de desconto do dia. Amazon, Mercado Livre, Shopee e muito mais. Atualizadas em tempo real!",
  keywords: ["promoções", "cupons", "desconto", "ofertas", "amazon", "mercado livre", "shopee"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: APP_NAME,
    title: `${APP_NAME} — Melhores Promoções do Dia`,
    description: "As melhores promoções atualizadas em tempo real.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${sora.variable} dark`}>
      <body className="ambient-glow bg-grid min-h-screen antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
