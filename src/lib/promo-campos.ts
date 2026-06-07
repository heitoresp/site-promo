// Campos que o PromoCard realmente usa. Evita select("*") nos feeds —
// menos payload no browser e não expõe link_afiliado, enviado_por,
// falhas_verificacao e outros dados internos.
// inclui link_afiliado pois o PromoCard usa como fallback no "Pegar Promo".
export const CAMPOS_CARD =
  "id, titulo, imagem_url, loja, categoria, preco_promo, preco_original, desconto_pct, cupom, criado_em, expira_em, cliques, temperatura, link_afiliado";
