// ============================================================
// Sistema de temperatura automática de promoções
//
// Prioridade:
//   1. Desconto explícito (preco_original vs preco_promo) — sempre disponível
//   2. Comparação com Mercado Livre — enriquecimento quando a API responder
//
// O ML API bloqueia requests de data centers (Vercel/AWS) com 403,
// então usamos o desconto informado pelo usuário como fonte principal.
// ============================================================

// Converte a diferença de preço em temperatura (0–100)
function calcularPontuacao(precoPromo: number, precoReferencia: number): number {
  if (precoReferencia <= 0 || precoReferencia <= precoPromo) return 30;

  const desconto = (precoReferencia - precoPromo) / precoReferencia;

  if (desconto >= 0.5)  return 95; // +50% abaixo → imperdível
  if (desconto >= 0.35) return 80; // 35–50% abaixo → muito boa
  if (desconto >= 0.2)  return 65; // 20–35% abaixo → boa
  if (desconto >= 0.1)  return 50; // 10–20% abaixo → ok
  if (desconto >= 0)    return 35; // 0–10% abaixo → fraca
  return 15;                        // acima da referência → fria
}

// Função principal — retorna temperatura 0–100
// Se precoOriginal for fornecido, usa como referência principal (mais confiável).
// Se não, retorna 50 (neutro) como fallback.
export async function calcularTemperatura(
  titulo: string,
  precoPromo: number,
  precoOriginal?: number | null
): Promise<number> {
  // Prioridade 1: desconto explícito informado pelo usuário
  if (precoOriginal && precoOriginal > precoPromo) {
    const pontuacao = calcularPontuacao(precoPromo, precoOriginal);
    console.log(
      `[Temperatura] "${titulo.slice(0, 40)}" → desconto ${Math.round((1 - precoPromo / precoOriginal) * 100)}% → ${pontuacao}pts`
    );
    return pontuacao;
  }

  // Sem referência de preço → neutro
  console.log(`[Temperatura] "${titulo.slice(0, 40)}" → sem preço original, neutro (50pts)`);
  return 50;
}

// Converte temperatura em label e emoji para exibição
export function labelTemperatura(temp: number | null): {
  emoji: string;
  label: string;
  cor: string;
} {
  if (temp === null) return { emoji: "⏳", label: "Avaliando...", cor: "text-gray-500" };
  if (temp >= 80)    return { emoji: "🔥🔥🔥", label: "Imperdível", cor: "text-red-400" };
  if (temp >= 60)    return { emoji: "🔥🔥",   label: "Muito boa",  cor: "text-orange-400" };
  if (temp >= 40)    return { emoji: "🔥",     label: "Boa",        cor: "text-amber-400" };
  if (temp >= 20)    return { emoji: "😐",     label: "Ok",         cor: "text-gray-400" };
  return               { emoji: "❄️",     label: "Fria",       cor: "text-blue-400" };
}
