-- ============================================================
-- Histórico de preços por promo (estilo Camelcamelcamel / Zoom)
--
-- Cada vez que o preço de uma promo muda (admin, bot ou manual),
-- um ponto é registrado automaticamente via trigger. Assim
-- conseguimos montar o gráfico de evolução do preço e calcular
-- "menor preço já registrado", "melhor momento", etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS historico_precos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id       UUID NOT NULL REFERENCES promos(id) ON DELETE CASCADE,
  preco_promo    NUMERIC(12, 2) NOT NULL,
  preco_original NUMERIC(12, 2),
  registrado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Busca rápida do histórico de uma promo em ordem cronológica
CREATE INDEX IF NOT EXISTS historico_precos_promo_idx
  ON historico_precos (promo_id, registrado_em);

-- ============================================================
-- RLS: preços não são sensíveis → leitura pública liberada
-- (escrita acontece só via trigger / service role)
-- ============================================================
ALTER TABLE historico_precos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historico_precos_select_public" ON historico_precos;
CREATE POLICY "historico_precos_select_public"
  ON historico_precos FOR SELECT USING (TRUE);

-- ============================================================
-- TRIGGER: registra um ponto sempre que o preço muda
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_historico_preco()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO historico_precos (promo_id, preco_promo, preco_original)
    VALUES (NEW.id, NEW.preco_promo, NEW.preco_original);

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Só grava se o preço (promo ou original) realmente mudou
    IF (NEW.preco_promo    IS DISTINCT FROM OLD.preco_promo
        OR NEW.preco_original IS DISTINCT FROM OLD.preco_original) THEN
      INSERT INTO historico_precos (promo_id, preco_promo, preco_original)
      VALUES (NEW.id, NEW.preco_promo, NEW.preco_original);
    END IF;
  END IF;

  RETURN NULL; -- trigger AFTER: valor de retorno é ignorado
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_historico_preco ON promos;
CREATE TRIGGER trigger_historico_preco
  AFTER INSERT OR UPDATE ON promos
  FOR EACH ROW EXECUTE FUNCTION registrar_historico_preco();

-- ============================================================
-- BACKFILL: cria o primeiro ponto para promos que já existem,
-- usando a data de criação como referência.
-- ============================================================
INSERT INTO historico_precos (promo_id, preco_promo, preco_original, registrado_em)
SELECT id, preco_promo, preco_original, criado_em
FROM promos
WHERE NOT EXISTS (
  SELECT 1 FROM historico_precos h WHERE h.promo_id = promos.id
);
