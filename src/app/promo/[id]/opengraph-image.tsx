import { ImageResponse } from "next/og";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Promoção no ApenasPromo";

function formatarBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();
  const { data: promo } = await supabase
    .from("promos")
    .select("titulo, preco_promo, preco_original, desconto_pct, loja, imagem_url")
    .eq("id", id)
    .maybeSingle();

  const titulo = promo?.titulo ?? "Promoção imperdível";
  const preco = promo ? formatarBRL(Number(promo.preco_promo)) : "";
  const original = promo?.preco_original ? formatarBRL(Number(promo.preco_original)) : null;
  const desconto = promo?.desconto_pct ? `-${Math.round(Number(promo.desconto_pct))}%` : null;
  const loja = promo?.loja ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1020 55%, #2a1505 100%)",
          padding: 64,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Marca */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40 }}>🔥</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: "#fff" }}>
            Apenas<span style={{ color: "#f97316" }}>Promo</span>
          </div>
        </div>

        {/* Título */}
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.1,
            marginTop: 48,
            maxWidth: 1000,
          }}
        >
          {titulo.length > 90 ? titulo.slice(0, 90) + "…" : titulo}
        </div>

        {/* Rodapé: preço + desconto */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 28, marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {original && (
              <div style={{ fontSize: 32, color: "#8a8a9a", textDecoration: "line-through" }}>
                {original}
              </div>
            )}
            <div style={{ fontSize: 84, fontWeight: 800, color: "#fb923c" }}>{preco}</div>
          </div>

          {desconto && (
            <div
              style={{
                display: "flex",
                fontSize: 44,
                fontWeight: 800,
                color: "#fff",
                background: "linear-gradient(135deg, #f97316, #dc5808)",
                borderRadius: 20,
                padding: "12px 28px",
                marginBottom: 16,
              }}
            >
              {desconto}
            </div>
          )}

          {loja && (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#cfcfe0",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 999,
                padding: "8px 22px",
                marginBottom: 22,
                marginLeft: "auto",
              }}
            >
              {loja}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
