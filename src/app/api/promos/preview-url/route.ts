// Busca metadados (título, imagem) de uma URL via Open Graph
// Usado pelo formulário de submissão para pré-preencher campos

import { NextRequest, NextResponse } from "next/server";
import { nomeDaLoja } from "@/lib/afiliados";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ApenasPromoBot/1.0; +https://apenaspromo.com.br)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });

    if (!res.ok) throw new Error("fetch failed");

    const html = await res.text();

    function getMeta(property: string): string | null {
      const ogMatch   = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i"));
      const nameMatch = html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"));
      const titleTag  = property === "title" ? html.match(/<title[^>]*>([^<]+)<\/title>/i) : null;
      return ogMatch?.[1] ?? nameMatch?.[1] ?? titleTag?.[1] ?? null;
    }

    const titulo   = getMeta("title")?.trim().slice(0, 200) ?? null;
    const imagem   = getMeta("image") ?? null;
    const descricao = getMeta("description")?.trim().slice(0, 500) ?? null;
    const loja     = nomeDaLoja(url);

    return NextResponse.json({ titulo, imagem, descricao, loja });
  } catch {
    return NextResponse.json(
      { titulo: null, imagem: null, descricao: null, loja: nomeDaLoja(url) },
      { status: 200 } // retorna vazio mas não quebra o formulário
    );
  }
}
