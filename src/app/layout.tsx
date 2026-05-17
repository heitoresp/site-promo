import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PromoHot";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  ?? "https://promohot.com.br";

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
    <html lang="pt-BR" className={`${inter.variable} dark`}>
      <body className="ambient-glow bg-grid min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
