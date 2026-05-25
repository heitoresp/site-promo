// ============================================================
// Sistema de temperatura automática de promoções
// Consulta a API do Mercado Livre para comparar preços
// e calcular se a promo é boa, média ou ruim
// ============================================================

interface MLItem {
  price: number;
  title: string;
  condition: string;
}

interface MLSearchResponse {
  results: MLItem[];
}

// Limpa o título para melhorar a busca no ML
// Remove palavras genéricas e mantém o essencial
function limparTituloParaBusca(titulo: string): string {
  const stopwords = [
    "oferta", "promoção", "promo", "desconto", "barato", "imperdível",
    "apenas", "somente", "kit", "combo", "unidade", "unid", "cx",
    "com", "para", "por", "em", "de", "da", "do", "das", "dos",
    "um", "uma", "uns", "umas", "no", "na", "nos", "nas",
  ];

  return titulo
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => !stopwords.includes(w) && w.length > 2)
    .slice(0, 6) // Pega os 6 primeiros termos relevantes
    .join(" ");
}

// Calcula a mediana de um array de números
function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Busca preços similares no Mercado Livre
async function buscarPrecoML(titulo: string): Promise<number | null> {
  try {
    const query = limparTituloParaBusca(titulo);
    if (!query) return null;

    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=12&condition=new`;

    // Timeout manual — AbortSignal.timeout() pode não estar disponível em todos os ambientes
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ApenasPromo/1.0 (price comparison bot)",
          "Accept": "application/json",
        },
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      console.warn(`[ML API] status ${res.status} para query: "${query}"`);
      return null;
    }

    const data: MLSearchResponse = await res.json();

    const precos = data.results
      .filter((item) => item.condition === "new" && item.price > 0)
      .map((item) => item.price)
      .slice(0, 10);

    if (precos.length === 0) return null;

    const resultado = mediana(precos);
    console.log(`[ML API] "${query}" → mediana R$${resultado} (${precos.length} resultados)`);
    return resultado;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[ML API] timeout para:", titulo);
    } else {
      console.warn("[ML API] erro:", err);
    }
    return null;
  }
}

// Converte a diferença de preço em temperatura (0–100)
function calcularPontuacao(precoPromo: number, precoMercado: number): number {
  if (precoMercado <= 0) return 50; // sem dados → neutro

  const desconto = (precoMercado - precoPromo) / precoMercado;

  if (desconto >= 0.5)  return 95; // +50% abaixo → imperdível
  if (desconto >= 0.35) return 80; // 35–50% abaixo → muito boa
  if (desconto >= 0.2)  return 65; // 20–35% abaixo → boa
  if (desconto >= 0.1)  return 50; // 10–20% abaixo → ok
  if (desconto >= 0)    return 30; // 0–10% abaixo → fraca
  return 15;                        // acima do mercado → fria
}

// Função principal — retorna temperatura 0–100
export async function calcularTemperatura(
  titulo: string,
  precoPromo: number
): Promise<number> {
  const precoMercado = await buscarPrecoML(titulo);

  if (precoMercado === null) {
    // Sem dados do ML → usa só o desconto percentual como fallback
    return 50;
  }

  return calcularPontuacao(precoPromo, precoMercado);
}

// Converte temperatura em label e emoji para exibição
export function labelTemperatura(temp: number | null): {
  emoji: string;
  label: string;
  cor: string;
} {
  if (temp === null) return { emoji: "⏳", label: "Avaliando...", cor: "text-gray-500" };
  if (temp >= 80)    return { emoji: "🔥🔥🔥", label: "Imperdível", cor: "text-red-400" };
  if (temp >= 60)    return { emoji: "🔥🔥", label: "Muito boa",   cor: "text-orange-400" };
  if (temp >= 40)    return { emoji: "🔥",    label: "Boa",        cor: "text-amber-400" };
  if (temp >= 20)    return { emoji: "😐",    label: "Ok",         cor: "text-gray-400" };
  return               { emoji: "❄️",    label: "Fria",       cor: "text-blue-400" };
}
