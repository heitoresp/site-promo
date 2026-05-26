// ============================================================
// Sistema de transformação de links em links de afiliado
//
// Suporte:
//   - Amazon Associates  → adiciona ?tag=
//   - Mercado Livre      → adiciona ?matt_word= (programa ML Afiliados)
//   - Lomadee API        → deeplink para Shopee, Magalu, Netshoes, Americanas
//   - AliExpress         → adiciona parâmetros Awin/Alibaba
//   - Fallback           → retorna link original sem modificação
//
// Configuração via variáveis de ambiente (.env.local / Vercel)
// ============================================================

// Lojas cobertas pelo Lomadee (adicione mais conforme necessário)
const LOMADEE_STORES = [
  "shopee.com.br",
  "magazineluiza.com.br",
  "magazinevoce.com.br",
  "netshoes.com.br",
  "zattini.com.br",
  "americanas.com.br",
  "shoptime.com.br",
  "submarino.com.br",
  "carrefour.com.br",
  "casasbahia.com.br",
  "pontofrio.com.br",
  "extra.com.br",
];

// Lojas AliExpress (via Awin ou programa próprio)
const ALIEXPRESS_STORES = [
  "aliexpress.com",
  "pt.aliexpress.com",
  "s.click.aliexpress.com",
];

// ─── Detectores ────────────────────────────────────────────

function detectarLoja(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("amazon.com.br"))       return "amazon";
    if (hostname.includes("mercadolivre.com.br") ||
        hostname.includes("mercadopago.com.br") ||
        hostname.includes("meli.com"))             return "mercadolivre";
    if (ALIEXPRESS_STORES.some(s => hostname.includes(s))) return "aliexpress";
    if (LOMADEE_STORES.some(s => hostname.includes(s)))    return "lomadee";
    return null;
  } catch {
    return null;
  }
}

// ─── Transformadores por rede ──────────────────────────────

function transformAmazon(urlOriginal: string): string {
  const tag = process.env.AMAZON_AFFILIATE_TAG;
  if (!tag) return urlOriginal;
  try {
    const u = new URL(urlOriginal);
    u.searchParams.set("tag", tag);
    // Remove parâmetros de rastreio que podem conflitar
    ["ref", "ref_", "pf_rd_r", "pf_rd_p"].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return urlOriginal;
  }
}

function transformMercadoLivre(urlOriginal: string): string {
  const id = process.env.ML_AFFILIATE_ID;
  if (!id) return urlOriginal;
  try {
    const u = new URL(urlOriginal);
    u.searchParams.set("matt_word", id);
    u.searchParams.set("matt_from", "NULL");
    u.searchParams.set("matt_campaign", "apenaspromo");
    return u.toString();
  } catch {
    return urlOriginal;
  }
}

async function transformLomadee(urlOriginal: string): Promise<string> {
  const sourceId = process.env.LOMADEE_SOURCE_ID;
  const token    = process.env.LOMADEE_TOKEN;
  if (!sourceId || !token) return urlOriginal;

  try {
    const apiUrl = `https://api.lomadee.com/v3/${sourceId}/deeplink/_create?token=${token}&url=${encodeURIComponent(urlOriginal)}`;
    const res  = await fetch(apiUrl, { signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
    if (!res.ok) return urlOriginal;
    const data = await res.json();
    return data?.deeplink?.url ?? urlOriginal;
  } catch {
    return urlOriginal;
  }
}

function transformAliExpress(urlOriginal: string): string {
  const awinId  = process.env.AWIN_AFFILIATE_ID;
  const awinMid = process.env.ALIEXPRESS_AWIN_MID ?? "32274"; // MID padrão AliExpress Awin
  if (!awinId) return urlOriginal;
  try {
    const destino = encodeURIComponent(urlOriginal);
    return `https://www.awin1.com/cread.php?awinaffid=${awinId}&awinmid=${awinMid}&p=${destino}`;
  } catch {
    return urlOriginal;
  }
}

// ─── Função principal ──────────────────────────────────────

/**
 * Transforma uma URL de produto em link de afiliado configurado.
 * Detecta a loja automaticamente e aplica a rede correta.
 * Retorna o link original se nenhuma configuração for encontrada.
 */
export async function transformarLinkAfiliado(urlOriginal: string): Promise<string> {
  const loja = detectarLoja(urlOriginal);

  switch (loja) {
    case "amazon":
      return transformAmazon(urlOriginal);
    case "mercadolivre":
      return transformMercadoLivre(urlOriginal);
    case "lomadee":
      return await transformLomadee(urlOriginal);
    case "aliexpress":
      return transformAliExpress(urlOriginal);
    default:
      return urlOriginal; // Loja não configurada → mantém original
  }
}

/**
 * Detecta o nome da loja a partir de uma URL para exibição.
 */
export function nomeDaLoja(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    const mapa: Record<string, string> = {
      "amazon.com.br":        "Amazon",
      "mercadolivre.com.br":  "Mercado Livre",
      "shopee.com.br":        "Shopee",
      "magazineluiza.com.br": "Magalu",
      "magazinevoce.com.br":  "Magalu",
      "netshoes.com.br":      "Netshoes",
      "zattini.com.br":       "Zattini",
      "americanas.com.br":    "Americanas",
      "submarino.com.br":     "Submarino",
      "casasbahia.com.br":    "Casas Bahia",
      "aliexpress.com":       "AliExpress",
      "carrefour.com.br":     "Carrefour",
      "extra.com.br":         "Extra",
    };
    for (const [domain, nome] of Object.entries(mapa)) {
      if (hostname.includes(domain)) return nome;
    }
    // Capitaliza o domínio como fallback
    return hostname.split(".")[0].charAt(0).toUpperCase() +
           hostname.split(".")[0].slice(1);
  } catch {
    return "Loja";
  }
}
