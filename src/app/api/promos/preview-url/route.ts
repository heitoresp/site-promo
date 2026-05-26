// Busca metadados (título, imagem, descrição) de uma URL de produto
// Estratégia em camadas:
//   1. JSON-LD (dados estruturados — mais confiável para e-commerce)
//   2. Open Graph meta tags
//   3. <title> tag como fallback
//
// Também limpa os títulos removendo sufixos de loja e preços embutidos.

import { NextRequest, NextResponse } from "next/server";
import { nomeDaLoja } from "@/lib/afiliados";

// User-Agents que funcionam melhor com grandes e-commerces
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

// Remove sufixos de loja e preços embutidos do título
function limparTitulo(titulo: string): string {
  return titulo
    // Remove " - R$ 134,9" e variações
    .replace(/\s*[-–]\s*R\$\s*[\d.,]+/gi, "")
    // Remove sufixos de loja: "| Amazon.com.br", "| Mercado Livre", etc.
    .replace(/\s*[\|]\s*(Amazon\.com\.br|Amazon|Mercado Livre|Shopee|Magalu|Magazine Luiza|Americanas|Netshoes|AliExpress)[^$]*/gi, "")
    // Remove ": Amazon.com.br: [categoria]" no meio
    .replace(/:\s*Amazon\.com\.br:.*/gi, "")
    // Remove vírgula + preço no final (ML faz isso às vezes)
    .replace(/,\s*R\$\s*[\d.,]+\s*$/, "")
    .trim()
    .slice(0, 200);
}

// Extrai imagem garantindo que não seja logo/ícone genérico da loja
function validarImagem(url: string | null, hostname: string): string | null {
  if (!url) return null;
  // Ignora imagens genéricas de logo/share da Amazon
  if (hostname.includes("amazon") && (
    url.includes("share-icons") ||
    url.includes("previewdoh") ||
    url.includes("favicon") ||
    url.includes("/G/01/")
  )) return null;
  return url;
}

// Tenta extrair dados do JSON-LD (Product schema)
function extrairJsonLd(html: string): {
  titulo?: string; imagem?: string; descricao?: string;
} {
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    try {
      const raw = match[1].trim();
      const data = JSON.parse(raw);

      // Pode ser um array ou objeto direto
      const items: unknown[] = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (typeof item !== "object" || !item) continue;
        const obj = item as Record<string, unknown>;
        if (obj["@type"] === "Product" || obj["@type"] === "ItemPage") {
          const titulo = typeof obj.name === "string" ? obj.name : undefined;

          let imagem: string | undefined;
          if (typeof obj.image === "string") imagem = obj.image;
          else if (Array.isArray(obj.image)) imagem = String(obj.image[0]);
          else if (obj.image && typeof obj.image === "object") {
            const img = obj.image as Record<string, unknown>;
            imagem = typeof img.url === "string" ? img.url : undefined;
          }

          const descricao =
            typeof obj.description === "string"
              ? obj.description.slice(0, 500)
              : undefined;

          if (titulo) return { titulo, imagem, descricao };
        }
      }
    } catch {
      // JSON inválido, tenta o próximo
    }
  }

  return {};
}

// Extrai meta tags Open Graph / Twitter / name
function extrairMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']{1,500})["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']twitter:${property}["'][^>]+content=["']([^"']{1,500})["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']{1,500})["']`, "i"),
  ];

  for (const regex of patterns) {
    const m = html.match(regex);
    if (m?.[1]) return m[1].trim();
  }

  if (property === "title") {
    const titleTag = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    if (titleTag?.[1]) return titleTag[1].trim();
  }

  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

  const loja = nomeDaLoja(url);
  let hostname = "";
  try { hostname = new URL(url).hostname; } catch { /* ok */ }

  const vazio = { titulo: null, imagem: null, descricao: null, loja };

  try {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    });

    if (!res.ok) return NextResponse.json(vazio);

    const html = await res.text();

    // 1ª tentativa: JSON-LD (mais preciso para produtos)
    const jsonLd = extrairJsonLd(html);

    // 2ª tentativa: Open Graph / meta tags
    const ogTitulo  = extrairMeta(html, "title");
    const ogImagem  = extrairMeta(html, "image");
    const ogDescricao = extrairMeta(html, "description");

    // Escolhe a melhor fonte para cada campo
    const tituloRaw = jsonLd.titulo ?? ogTitulo;
    const titulo    = tituloRaw ? limparTitulo(tituloRaw) : null;

    const imagemRaw = jsonLd.imagem ?? ogImagem ?? null;
    const imagem    = validarImagem(imagemRaw, hostname);

    const descricao = (jsonLd.descricao ?? ogDescricao ?? null)?.slice(0, 500) ?? null;

    return NextResponse.json({ titulo, imagem, descricao, loja });
  } catch {
    return NextResponse.json(vazio);
  }
}
