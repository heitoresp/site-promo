import type { MetadataRoute } from "next";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ApenasPromo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Melhores Promoções do Dia`,
    short_name: APP_NAME,
    description:
      "As melhores promoções e cupons de desconto do dia, atualizadas em tempo real.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#f97316",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
