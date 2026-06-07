// ============================================================
// Extração de preço de páginas de produto (reutilizável)
//
// Usado por:
//   - /api/promos/preview-url  (ao postar/editar promo)
//   - /api/cron/verificar-precos (revisita periódica)
//
// Lê o preço atual e o preço "de" (riscado) do JSON-LD (schema.org)
// e de meta tags de produto. NÃO depende de loja específica.
//
// Cobertura: funciona em lojas que entregam preço no HTML server-side
// (KaBuM, lojas com schema.org). Amazon/Mercado Livre/Shopee bloqueiam
// ou renderizam via JS — nesses casos retorna preco=null.
// ============================================================

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
];

// Parse robusto: "1.299,90" (BR), "1,299.90" (US), "49.90", número.
export function parsePreco(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;

  let s = String(v).trim().replace(/[^\d.,]/g, "");
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const casas = s.length - lastComma - 1;
    s = casas === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Preços via JSON-LD (offers / AggregateOffer)
export function extrairPrecosJsonLd(html: string): { preco: number | null; referencia: number | null } {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    let data: unknown;
    try { data = JSON.parse(match[1].trim()); } catch { continue; }

    const fila: unknown[] = Array.isArray(data) ? [...data] : [data];
    while (fila.length) {
      const item = fila.shift();
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj["@graph"])) fila.push(...(obj["@graph"] as unknown[]));

      const offers = obj.offers;
      if (!offers) continue;
      const offerArr = Array.isArray(offers) ? offers : [offers];
      for (const off of offerArr) {
        if (!off || typeof off !== "object") continue;
        const o = off as Record<string, unknown>;
        const preco = parsePreco(o.price ?? o.lowPrice);
        const high = parsePreco(o.highPrice);
        if (preco) return { preco, referencia: high && high > preco ? high : null };
      }
    }
  }
  return { preco: null, referencia: null };
}

// Preços via meta tags (Open Graph / Facebook commerce)
export function extrairPrecosMeta(html: string): { preco: number | null; referencia: number | null } {
  const get = (prop: string): string | null => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
    return m?.[1] ?? null;
  };
  const preco = parsePreco(get("product:price:amount") ?? get("og:price:amount") ?? get("og:product:price:amount"));
  const referencia = parsePreco(get("product:original_price:amount"));
  return { preco, referencia: referencia && preco && referencia > preco ? referencia : null };
}

export interface PrecoExtraido {
  preco: number | null;
  preco_referencia: number | null;
  encontrouPagina: boolean; // true se a página respondeu (mesmo sem preço)
}

// Baixa a página e extrai preço. Tolerante a falhas (retorna nulls).
export async function extrairPrecoDeUrl(url: string, timeoutMs = 9000): Promise<PrecoExtraido> {
  try {
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return { preco: null, preco_referencia: null, encontrouPagina: false };

    const html = await res.text();
    const json = extrairPrecosJsonLd(html);
    const meta = extrairPrecosMeta(html);
    return {
      preco: json.preco ?? meta.preco ?? null,
      preco_referencia: json.referencia ?? meta.referencia ?? null,
      encontrouPagina: true,
    };
  } catch {
    return { preco: null, preco_referencia: null, encontrouPagina: false };
  }
}
