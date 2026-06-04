-- ============================================================
-- Favoritos / Promos salvas
--
-- Cada usuário pode salvar promos pra ver depois. É também a
-- fundação para os futuros alertas de preço.
-- ============================================================

CREATE TABLE IF NOT EXISTS favoritos (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_id  UUID NOT NULL REFERENCES promos(id)     ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, promo_id)
);

-- Listagem rápida das promos salvas de um usuário (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS favoritos_user_idx ON favoritos (user_id, criado_em DESC);
-- Contagem por promo (quantas pessoas salvaram)
CREATE INDEX IF NOT EXISTS favoritos_promo_idx ON favoritos (promo_id);

-- ============================================================
-- RLS: cada usuário enxerga e gerencia apenas os próprios favoritos
-- ============================================================
ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favoritos_select_own" ON favoritos;
CREATE POLICY "favoritos_select_own"
  ON favoritos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favoritos_insert_own" ON favoritos;
CREATE POLICY "favoritos_insert_own"
  ON favoritos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favoritos_delete_own" ON favoritos;
CREATE POLICY "favoritos_delete_own"
  ON favoritos FOR DELETE
  USING (auth.uid() = user_id);
