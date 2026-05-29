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

// 5. Extração específica para Mercado Livre
// ML renderiza com JS — o HTML cru tem poucos dados, mas:
//   - A URL sempre contém o slug do produto
//   - As imagens mlstatic.com aparecem em scripts/data-src
async function extrairMercadoLivre(url: string, html: string): Promise<{
  titulo?: string; imagem?: string;
}> {
  const isMl = /mercadolivre\.com\.br|mercadopago\.com\.br/.test(url);
  if (!isMl) return {};

  // Título via URL slug — suporta /slug-do-produto-_JM e /slug-do-produto/p/MLB123
  let titulo: string | undefined;
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    // Pega o primeiro segmento que tem hífens e tamanho razoável (o slug do produto)
    const slugSeg = segments.find(s => s.includes("-") && s.length > 10 && !/^MLB\d+$/i.test(s));
    if (slugSeg) {
      titulo = slugSeg
        .replace(/-_[A-Z]{2,}$/i, "")   // remove sufixo -_JM, -_MLB etc
        .split("-")
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
        .slice(0, 200);
      if (NOMES_SITE.has(titulo.toLowerCase())) titulo = undefined;
    }
  } catch { /* ok */ }

  // Imagem via ML API autenticada (client_credentials — app token gratuito)
  let imagem: string | undefined;
  const mlId = url.match(/\/(ML[A-Z]\d{6,})/i)?.[1];

  if (mlId) {
    try {
      // 1. Obter app token via client_credentials
      const clientId     = process.env.ML_CLIENT_ID;
      const clientSecret = process.env.ML_CLIENT_SECRET;
      let token: string | null = null;

      console.log("[ML] clientId set:", !!clientId, "| clientSecret set:", !!clientSecret);
      if (clientId && clientSecret) {
        const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
          body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
          signal: AbortSignal.timeout(5000),
        });
        console.log("[ML] token status:", tokenRes.status);
        if (tokenRes.ok) {
          const td = await tokenRes.json() as { access_token?: string };
          token = td.access_token ?? null;
          console.log("[ML] token obtido:", !!token);
        } else {
          const err = await tokenRes.text();
          console.log("[ML] token erro:", err.slice(0, 200));
        }
      }

      // 2. Buscar produto com token
      if (token) {
        const r = await fetch(`https://api.mercadolibre.com/products/${mlId}`, {
          headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        console.log("[ML] products status:", r.status);
        if (r.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = await r.json() as any;
          const pic = d?.pictures?.[0]?.secure_url ?? d?.pictures?.[0]?.url;
          console.log("[ML] pic:", pic ?? "nenhuma");
          if (pic) imagem = pic;
        }
      }
    } catch (e) { console.log("[ML] erro geral:", String(e)); }
  }

  return { titulo, imagem };
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
    const ml        = await extrairMercadoLivre(url, html);
    const jsonLd    = extrairJsonLd(html);
    const itemprop  = extrairItemprop(html);
    const ogTitulo  = extrairMeta(html, "title");
    const ogImagem  = extrairMeta(html, "image");
    const ogDesc    = extrairMeta(html, "description");
    const h1        = extrairH1(html);

    // ML tem prioridade para título (OG/itemprop retornam "Mercado Libre" sem JS)
    const tituloRaw = ml.titulo ?? jsonLd.titulo ?? itemprop.titulo ?? ogTitulo ?? h1;
    const titulo    = tituloRaw ? limparTitulo(tituloRaw) : null;

    const isMl = hostname.includes("mercadolivre") || hostname.includes("mercadolibre");

    // Para ML: API pública → og:image (mais confiável que regex no HTML JS-rendered)
    // Para outros: JSON-LD → itemprop → og:image
    const imagemRaw = isMl
      ? (ml.imagem ?? ogImagem ?? jsonLd.imagem ?? null)
      : (jsonLd.imagem ?? itemprop.imagem ?? ogImagem ?? null);
    const imagem    = validarImagem(imagemRaw ?? null, hostname);

    const descricao = (jsonLd.descricao ?? itemprop.descricao ?? ogDesc ?? null)?.slice(0, 500) ?? null;

    return NextResponse.json({ titulo, imagem, descricao, loja });
  } catch {
    return NextResponse.json(vazio);
  }
}
