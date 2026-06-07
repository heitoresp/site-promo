// ============================================================
// Cores das lojas (espelha a tabela `lojas`.cor_primaria)
// Usado pra dar identidade visual ao pill da loja nos cards.
// A chave é normalizada (minúscula, sem acento/espaço) pra casar
// tanto com slug ("mercado-livre") quanto com nome ("Mercado Livre").
// ============================================================

const CORES: Record<string, string> = {
  amazon: "#FF9900",
  mercadolivre: "#FFE600",
  shopee: "#EE4D2D",
  magalu: "#0086FF",
  magazineluiza: "#0086FF",
  americanas: "#E30613",
  casasbahia: "#0099FF",
  aliexpress: "#FF4747",
  kabum: "#FF6C00",
  ponto: "#D81B60",
  pontofrio: "#D81B60",
  netshoes: "#F37021",
  carrefour: "#0653A1",
};

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Retorna a cor da loja, ou null se não conhecida (cai no estilo padrão)
export function corDaLoja(loja: string | null | undefined): string | null {
  if (!loja) return null;
  return CORES[normalizar(loja)] ?? null;
}
