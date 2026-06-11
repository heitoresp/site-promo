// Campos que o PromoCard realmente usa. Evita select("*") nos feeds —
// menos payload no browser e não expõe enviado_por, falhas_verificacao
// e outros dados internos.
// inclui link_afiliado pois o PromoCard usa como fallback no "Pegar Promo".
export const CAMPOS_CARD =
  "id, titulo, imagem_url, loja, categoria, preco_promo, preco_original, desconto_pct, cupom, criado_em, expira_em, cliques, temperatura, link_afiliado";

// Campos seguros pra API PÚBLICA (GET /api/promos, sem auth).
// NÃO inclui link_afiliado / link_afiliado_manual — senão qualquer um
// raspa o catálogo com seus links de afiliado e clona o site / rouba a
// comissão. O link só é revelado no clique (PATCH /api/promos/[id]/click).
export const CAMPOS_PUBLICOS =
  "id, titulo, imagem_url, loja, categoria, preco_promo, preco_original, desconto_pct, cupom, criado_em, expira_em, cliques, temperatura";
