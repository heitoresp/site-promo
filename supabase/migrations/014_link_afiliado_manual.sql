-- ============================================================
-- Link de afiliado manual (ex: meli.la do Mercado Livre)
--
-- Algumas redes (Mercado Livre Afiliados) não permitem transformar
-- a URL do produto em link de afiliado por fórmula — só geram um link
-- de rastreio encurtado (meli.la/XXXX) no painel. Esse link é colado
-- aqui. Quando preenchido, é ele que o botão "Pegar Promo" usa.
--
-- link_afiliado       = URL do produto (preview, exibição, SEO)
-- link_afiliado_manual= link de rastreio pronto (destino do clique)
-- ============================================================

ALTER TABLE promos
  ADD COLUMN IF NOT EXISTS link_afiliado_manual TEXT;
