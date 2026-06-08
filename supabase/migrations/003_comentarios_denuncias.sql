-- ============================================================
-- Comentários e Denúncias
--
-- NOTA: estas tabelas foram criadas no início do projeto mas a
-- migration original se perdeu (o repo começava em 004). Este
-- arquivo reconstrói fielmente o schema que está em produção,
-- pra que o banco possa ser recriado do zero. Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- COMENTÁRIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id    UUID NOT NULL REFERENCES promos(id)     ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_nome   TEXT NOT NULL,
  user_avatar TEXT,
  conteudo    TEXT NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 500),
  criado_em   TIMESTAMPTZ DEFAULT now(),
  ativo       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS comentarios_promo_idx ON comentarios (promo_id, criado_em DESC);

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qualquer um lê comentários ativos" ON comentarios;
CREATE POLICY "qualquer um lê comentários ativos"
  ON comentarios FOR SELECT USING (ativo = TRUE);

DROP POLICY IF EXISTS "users autenticados comentam" ON comentarios;
CREATE POLICY "users autenticados comentam"
  ON comentarios FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users deletam próprios comentários" ON comentarios;
CREATE POLICY "users deletam próprios comentários"
  ON comentarios FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- DENÚNCIAS (1 por usuário por promo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denuncias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id   UUID NOT NULL REFERENCES promos(id)     ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (promo_id, user_id)
);

ALTER TABLE denuncias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users podem denunciar" ON denuncias;
CREATE POLICY "users podem denunciar"
  ON denuncias FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users veem proprias denuncias" ON denuncias;
CREATE POLICY "users veem proprias denuncias"
  ON denuncias FOR SELECT USING (auth.uid() = user_id);
