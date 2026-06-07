-- ============================================================
-- Verificação automática de promos (crons)
--
-- Colunas de controle pra:
--   - cron de limpeza (arquivar vencidas/velhas)
--   - cron de verificação de preço (revisita a loja)
-- ============================================================

ALTER TABLE promos
  ADD COLUMN IF NOT EXISTS ultima_verificacao  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verificacao_status  TEXT
    CHECK (verificacao_status IN ('ok', 'preco_mudou', 'fora_do_ar', 'erro')),
  ADD COLUMN IF NOT EXISTS falhas_verificacao  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arquivada_em        TIMESTAMPTZ;

-- O cron de verificação prioriza quem nunca foi verificado ou faz mais tempo.
CREATE INDEX IF NOT EXISTS promos_verificacao_idx
  ON promos (ultima_verificacao NULLS FIRST)
  WHERE ativo = TRUE;
