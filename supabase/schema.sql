-- ============================================================
-- SCHEMA: Site de Promoções
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- busca fuzzy

-- ============================================================
-- TABELA: promos
-- ============================================================
CREATE TABLE IF NOT EXISTS promos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Conteúdo
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  preco_original  NUMERIC(12, 2),
  preco_promo     NUMERIC(12, 2) NOT NULL,
  desconto_pct    NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN preco_original IS NOT NULL AND preco_original > 0
      THEN ROUND(((preco_original - preco_promo) / preco_original) * 100, 2)
      ELSE NULL
    END
  ) STORED,

  -- Links e loja
  link_afiliado   TEXT NOT NULL,
  loja            TEXT NOT NULL DEFAULT 'outros',
  categoria       TEXT NOT NULL DEFAULT 'geral',
  cupom           TEXT,

  -- Mídia
  imagem_url      TEXT,

  -- Metadados
  origem          TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'whatsapp_bot')),
  expira_em       TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,

  -- Engajamento
  cliques         BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_promos_ativo       ON promos (ativo);
CREATE INDEX idx_promos_criado_em   ON promos (criado_em DESC);
CREATE INDEX idx_promos_categoria   ON promos (categoria);
CREATE INDEX idx_promos_loja        ON promos (loja);
CREATE INDEX idx_promos_cliques     ON promos (cliques DESC);
CREATE INDEX idx_promos_origem      ON promos (origem);
CREATE INDEX idx_promos_expira_em   ON promos (expira_em);

-- Índice para busca full-text (português)
CREATE INDEX idx_promos_fts ON promos USING gin(
  to_tsvector('portuguese', coalesce(titulo, '') || ' ' || coalesce(descricao, ''))
);

-- Índice fuzzy para autocomplete
CREATE INDEX idx_promos_titulo_trgm ON promos USING gin(titulo gin_trgm_ops);

-- ============================================================
-- TRIGGER: atualiza "atualizado_em" automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_promos_atualizado_em
  BEFORE UPDATE ON promos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ============================================================
-- TABELA: categorias (lookup table)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  slug  TEXT PRIMARY KEY,
  nome  TEXT NOT NULL,
  icone TEXT,            -- emoji ou nome do ícone
  ordem INTEGER DEFAULT 0
);

INSERT INTO categorias (slug, nome, icone, ordem) VALUES
  ('eletronicos',  'Eletrônicos',    '📱',  1),
  ('moda',         'Moda',           '👕',  2),
  ('games',        'Games',          '🎮',  3),
  ('casa',         'Casa',           '🏠',  4),
  ('alimentacao',  'Alimentação',    '🍔',  5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABELA: lojas (lookup table)
-- ============================================================
CREATE TABLE IF NOT EXISTS lojas (
  slug         TEXT PRIMARY KEY,
  nome         TEXT NOT NULL,
  logo_url     TEXT,
  cor_primaria TEXT DEFAULT '#FF6900',
  ordem        INTEGER DEFAULT 0
);

INSERT INTO lojas (slug, nome, cor_primaria, ordem) VALUES
  ('amazon',         'Amazon',          '#FF9900', 1),
  ('mercado-livre',  'Mercado Livre',   '#FFE600', 2),
  ('shopee',         'Shopee',          '#EE4D2D', 3),
  ('magalu',         'Magazine Luiza',  '#0086FF', 4),
  ('americanas',     'Americanas',      '#E30613', 5),
  ('casas-bahia',    'Casas Bahia',     '#0099FF', 6),
  ('aliexpress',     'AliExpress',      '#FF4747', 7),
  ('kabum',          'KaBuM!',          '#FF6C00', 8),
  ('ponto',          'Ponto',           '#D81B60', 9),
  ('outros',         'Outros',          '#6366F1', 99)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE promos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojas      ENABLE ROW LEVEL SECURITY;

-- Leitura pública: qualquer um pode ler promos ativas
CREATE POLICY "promos_leitura_publica"
  ON promos FOR SELECT
  USING (ativo = TRUE AND (expira_em IS NULL OR expira_em > NOW()));

-- Lookup tables: leitura pública irrestrita
CREATE POLICY "categorias_leitura_publica" ON categorias FOR SELECT USING (TRUE);
CREATE POLICY "lojas_leitura_publica"      ON lojas      FOR SELECT USING (TRUE);

-- Escrita via service_role apenas (API backend com chave secreta)
-- service_role bypassa RLS por padrão — sem política extra necessária.

-- ============================================================
-- FUNÇÃO: incrementar cliques atomicamente
-- ============================================================
CREATE OR REPLACE FUNCTION incrementar_cliques(promo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promos SET cliques = cliques + 1 WHERE id = promo_id AND ativo = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEW: promos_hot (promos em alta nas últimas 24h)
-- ============================================================
CREATE OR REPLACE VIEW promos_hot AS
  SELECT *,
    CASE WHEN criado_em > NOW() - INTERVAL '24 hours' THEN TRUE ELSE FALSE END AS is_nova,
    CASE WHEN cliques > 50 THEN TRUE ELSE FALSE END AS is_hot
  FROM promos
  WHERE ativo = TRUE
    AND (expira_em IS NULL OR expira_em > NOW())
  ORDER BY
    (cliques * 0.7 + EXTRACT(EPOCH FROM (NOW() - criado_em)) / -3600 * 0.3) DESC;

-- ============================================================
-- REALTIME: habilitar para a tabela promos
-- (execute no dashboard do Supabase: Database > Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE promos;
-- ============================================================
