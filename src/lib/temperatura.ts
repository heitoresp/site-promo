// ============================================================
// Sistema de pontuação (temperatura) das promoções — 0 a 100
//
// A nota mistura duas fontes:
//   1. BASE: o desconto (preco_original vs preco_promo)
//   2. AJUSTE: os votos da comunidade (👍 quente / 👎 frio)
//
// A base é calculada aqui (no cadastro). O ajuste pelos votos é
// aplicado no banco, via trigger (migration 007), com a fórmula:
//   temperatura = base + 20 * tanh(net / 5)   (net = quentes - frios)
// Por isso a base abaixo precisa espelhar a função SQL base_desconto().
// ============================================================

// BASE por desconto (0–100). Mantém em sincronia com base_desconto() no SQL.
// Sem referência de preço confiável → 50 (neutro).
export function baseDesconto(
  precoPromo: number,
  precoOriginal?: number | null
): number {
  if (!precoOriginal || precoOriginal <= 0 || precoOriginal <= precoPromo) {
    return 50;
  }
  const desconto = (precoOriginal - precoPromo) / precoOriginal;

  if (desconto >= 0.5)  return 95; // +50% abaixo → imperdível
  if (desconto >= 0.35) return 80; // 35–50% → muito boa
  if (desconto >= 0.2)  return 65; // 20–35% → boa
  if (desconto >= 0.1)  return 50; // 10–20% → ok
  if (desconto >= 0)    return 35; // 0–10% → fraca
  return 15;                        // acima da referência → fria
}

// Função do cadastro — define a temperatura INICIAL (só desconto, 0 votos).
// A partir daí, cada voto recalcula a nota no banco via trigger.
export async function calcularTemperatura(
  titulo: string,
  precoPromo: number,
  precoOriginal?: number | null
): Promise<number> {
  const base = baseDesconto(precoPromo, precoOriginal);
  console.log(`[Temperatura] "${titulo.slice(0, 40)}" → base desconto = ${base}pts`);
  return base;
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
