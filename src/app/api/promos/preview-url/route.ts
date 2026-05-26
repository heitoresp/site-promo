import { NextRequest, NextResponse } from "next/server";
import { nomeDaLoja } from "@/lib/afiliados";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

const NOMES_SITE = new Set([
  "mercado libre", "mercadolivre", "mercado livre",
  "amazon", "amazon.com.br", "shopee",
  "magazine luiza", "magalu", "americanas",
  "netshoes", "aliexpress", "casas bahia",
  "extra", "submarino",
]);

// Remove sufixos de loja e preços do título
function limparTitulo(titulo: string): string {
  return titulo
    .replace(/\s*[-–]\s*R\$\s*[\d.,]+/gi, "")
    .replace(/\s*[|]\s*(Amazon\.com\.br|Amazon|Mercado Livre|Mercado Libre|Shopee|Magalu|Magazine Luiza|Americanas|Netshoes|AliExpress).*/gi, "")
    .replace(/,\s*R\$\s*[\d.,]+\s*$/, "")
    .trim()
    .slice(0, 200);
}

// Valida imagem — rejeita logos genéricas da Amazon
function validarImagem(url: string | null, hostname: string): string | null {
  if (!url) return null;
  if (hostname.includes("amazon") && (
    url.includes("share-icons") || url.includes("previewdoh") ||
    url.includes("favicon") || url.includes("/G/01/")
  )) return null;
  return url;
}

// 1. JSON-LD — mais confiável para e-commerces
function extrairJsonLd(html: string): { titulo?: string; imagem?: string; descricao?: string } {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    try {
      const data = JSON.parse(match[1].trim());
      const items: unknown[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (typeof item !== "object" || !item) continue;
        const obj = item as Record<string, unknown>;
        if (obj["@type"] !== "Product" && obj["@type"] !== "ItemPage") continue;
        const titulo = typeof obj.name === "string" ? obj.name : undefined;
        if (!titulo || NOMES_SITE.has(titulo.toLowerCase().trim())) continue;

        let imagem: string | undefined;
        if (typeof obj.image === "string") imagem = obj.image;
        else if (Array.isArray(obj.image)) imagem = String(obj.image[0]);
        else if (obj.image && typeof obj.image === "object") {
          const img = obj.image as Record<string, unknown>;
          imagem = typeof img.url === "string" ? img.url : undefined;
        }

        const descricao = typeof obj.description === "string" ? obj.description.slice(0, 500) : undefined;
        return { titulo, imagem, descricao };
      }
    } catch { /* continua */ }
  }
  return {};
}

// 2. Open Graph / Twitter / meta name
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
    const tag = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
    if (tag?.[1]) {
      const partes = tag[1].trim().split(/\s*[|]\s*/);
      return partes.sort((a, b) => b.length - a.length)[0].trim();
    }
  }
  return null;
}

// 3. itemprop — usado pelo Mercado Livre e outros
function extrairItemprop(html: string): { titulo?: string; imagem?: string; descricao?: string } {
  const nome = html.match(/<[^>]+itemprop=["']name["'][^>]*(?:content=["']([^"']{5,300})["']|>([^<]{5,300})<)/i);
  const img  = html.match(/<[^>]+itemprop=["']image["'][^>]*(?:content=["']([^"']+)["']|src=["']([^"']+)["'])/i);
  const desc = html.match(/<[^>]+itemprop=["']description["'][^>]*content=["']([^"']{1,500})["']/i);

  const titulo = (nome?.[1] ?? nome?.[2])?.trim();
  const imagem = (img?.[1] ?? img?.[2])?.trim();
  const descricao = desc?.[1]?.trim();

  return {
    titulo: titulo && !NOMES_SITE.has(titulo.toLowerCase()) ? titulo : undefined,
    imagem,
    descricao,
  };
}

// 4. <h1> como último recurso
function extrairH1(html: string): string | null {
  const m = html.match(/<h1[^>]*>([^<]{10,300})<\/h1>/i);
  const texto = m?.[1]?.trim();
  if (!texto || NOMES_SITE.has(texto.toLowerCase())) return null;
  return texto;
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
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return NextResponse.json(vazio);
    const html = await res.text();

    // Tenta cada estratégia em ordem de confiabilidade
    const jsonLd    = extrairJsonLd(html);
    const itemprop  = extrairItemprop(html);
    const ogTitulo  = extrairMeta(html, "title");
    const ogImagem  = extrairMeta(html, "image");
    const ogDesc    = extrairMeta(html, "description");
    const h1        = extrairH1(html);

    const tituloRaw = jsonLd.titulo ?? itemprop.titulo ?? ogTitulo ?? h1;
    const titulo    = tituloRaw ? limparTitulo(tituloRaw) : null;

    // Valida e filtra imagens genéricas
    const imagemRaw = jsonLd.imagem ?? itemprop.imagem ?? ogImagem ?? null;
    const imagem    = validarImagem(imagemRaw ?? null, hostname);

    const descricao = (jsonLd.descricao ?? itemprop.descricao ?? ogDesc ?? null)?.slice(0, 500) ?? null;

    return NextResponse.json({ titulo, imagem, descricao, loja });
  } catch {
    return NextResponse.json(vazio);
  }
}
