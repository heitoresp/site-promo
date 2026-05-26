-- ============================================================
-- Submissão de promos por usuários + sistema de aprovação
-- ============================================================

-- 1. Adiciona coluna status na tabela promos
ALTER TABLE promos
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'pendente', 'rejeitado'));

-- 2. Quem enviou a promo (null = admin / bot)
ALTER TABLE promos
  ADD COLUMN IF NOT EXISTS enviado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Garante que promos existentes ficam como 'ativo'
UPDATE promos SET status = 'ativo' WHERE status IS NULL;

-- 4. Índice para filtrar pendentes rapidamente
CREATE INDEX IF NOT EXISTS promos_status_idx ON promos(status);

-- 5. Atualiza RLS: usuários só veem promos ativas
--    (admin usa service role key, não é afetado)
DROP POLICY IF EXISTS "Promos visíveis publicamente" ON promos;

CREATE POLICY "promos_select_ativas"
  ON promos FOR SELECT
  USING (status = 'ativo' AND ativo = true);
