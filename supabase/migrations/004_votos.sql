-- ============================================================
-- Sistema de votação Stonks / Super Stonks / Not Stonks
-- ============================================================

CREATE TABLE IF NOT EXISTS votos (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id   UUID        NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT        NOT NULL CHECK (tipo IN ('stonks', 'super_stonks', 'not_stonks')),
  criado_em  TIMESTAMPTZ DEFAULT now(),

  -- Um único voto por usuário por promo (pode trocar, mas não acumular)
  UNIQUE (user_id, promo_id)
);

-- Índices para contagem rápida
CREATE INDEX IF NOT EXISTS votos_promo_id_idx ON votos(promo_id);
CREATE INDEX IF NOT EXISTS votos_tipo_idx ON votos(promo_id, tipo);

-- RLS
ALTER TABLE votos ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver os votos
CREATE POLICY "votos_select_public"
  ON votos FOR SELECT USING (true);

-- Só usuário autenticado pode inserir/atualizar o próprio voto
CREATE POLICY "votos_insert_auth"
  ON votos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votos_update_auth"
  ON votos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "votos_delete_auth"
  ON votos FOR DELETE
  USING (auth.uid() = user_id);
