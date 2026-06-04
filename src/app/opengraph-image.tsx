import { ImageResponse } from "next/og";

export const runtime = "nodejs";
// Gera sob demanda (evita bug do @vercel/og ao prerender em path com espaço)
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ApenasPromo — As melhores promoções do dia";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1020 55%, #2a1505 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120 }}>🔥</div>
        <div style={{ fontSize: 88, fontWeight: 800, color: "#fff", marginTop: 8 }}>
          Apenas<span style={{ color: "#f97316" }}>Promo</span>
        </div>
        <div style={{ fontSize: 40, color: "#cfcfe0", marginTop: 12 }}>
          As melhores promoções do dia, sem frescura
        </div>
      </div>
    ),
    { ...size }
  );
}
