export type Origem = "manual" | "whatsapp_bot";

export interface Promo {
  id: string;
  titulo: string;
  descricao: string | null;
  preco_original: number | null;
  preco_promo: number;
  desconto_pct: number | null;
  link_afiliado: string;
  loja: string;
  categoria: string;
  cupom: string | null;
  imagem_url: string | null;
  origem: Origem;
  expira_em: string | null;
  criado_em: string;
  atualizado_em: string;
  ativo: boolean;
  cliques: number;
  // Campos extras da view promos_hot
  is_nova?: boolean;
  is_hot?: boolean;
}

export interface Categoria {
  slug: string;
  nome: string;
  icone: string | null;
  ordem: number;
}

export interface Loja {
  slug: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string;
  ordem: number;
}

// Payload do POST /api/promos (usado pelo bot e pelo admin)
export interface CreatePromoPayload {
  titulo: string;
  descricao?: string;
  preco_original?: number;
  preco_promo: number;
  link_afiliado: string;
  loja?: string;
  categoria?: string;
  cupom?: string;
  imagem_url?: string;
  origem?: Origem;
  expira_em?: string; // ISO 8601
}

// Query params do GET /api/promos
export interface PromoFilters {
  categoria?: string;
  loja?: string;
  busca?: string;
  limite?: number;
  pagina?: number;
  origem?: Origem;
  hot?: boolean;
}

export interface PromoListResponse {
  promos: Promo[];
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}
