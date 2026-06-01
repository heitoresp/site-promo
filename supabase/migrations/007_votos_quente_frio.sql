-- ============================================================
-- Novo sistema de votação: 👍 Quente / 👎 Frio
-- + pontuação dinâmica (desconto base + ajuste da comunidade)
--
-- Substitui o antigo Stonks/Super Stonks/Not Stonks.
-- A temperatura (0–100) deixa de ser estática:
--   temperatura = base_desconto + 20 * tanh(net / 5)
--   net = (votos quente) - (votos frio)
-- Recalculada por trigger a cada voto e a cada mudança de preço.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Migra os dados antigos e troca o CHECK de votos.tipo
-- ------------------------------------------------------------
ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_tipo_check;

-- stonks / super_stonks => quente ; not_stonks => frio
UPDATE votos SET tipo = 'quente' WHERE tipo IN ('stonks', 'super_stonks');
UPDATE votos SET tipo = 'frio'   WHERE tipo = 'not_stonks';

ALTER TABLE votos
  ADD CONSTRAINT votos_tipo_check CHECK (tipo IN ('quente', 'frio'));

-- ------------------------------------------------------------
-- 2. Base da pontuação pelo desconto (espelha lib/temperatura.ts)
--    Entrada: preço promo e preço original (pode ser NULL)
--    Saída: 0–100 (50 = neutro quando não há referência)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION base_desconto(p_promo NUMERIC, p_orig NUMERIC)
RETURNS INTEGER AS $$
DECLARE
  d NUMERIC;
BEGIN
  IF p_orig IS NULL OR p_orig <= 0 OR p_orig <= p_promo THEN
    RETURN 50; -- sem referência confiável → neutro
  END IF;

  d := (p_orig - p_promo) / p_orig;

  IF    d >= 0.50 THEN RETURN 95;
  ELSIF d >= 0.35 THEN RETURN 80;
  ELSIF d >= 0.20 THEN RETURN 65;
  ELSIF d >= 0.10 THEN RETURN 50;
  ELSIF d >= 0    THEN RETURN 35;
  ELSE                 RETURN 15;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ------------------------------------------------------------
-- 3. Recalcula a temperatura de UMA promo (desconto + votos)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalcular_temperatura(p_id UUID)
RETURNS void AS $$
DECLARE
  v_promo   NUMERIC;
  v_orig    NUMERIC;
  v_quente  INTEGER;
  v_frio    INTEGER;
  v_net     INTEGER;
  v_base    INTEGER;
  v_ajuste  NUMERIC;
  v_final   INTEGER;
BEGIN
  SELECT preco_promo, preco_original INTO v_promo, v_orig
  FROM promos WHERE id = p_id;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE tipo = 'quente'),
    COUNT(*) FILTER (WHERE tipo = 'frio')
  INTO v_quente, v_frio
  FROM votos WHERE promo_id = p_id;

  v_net    := COALESCE(v_quente, 0) - COALESCE(v_frio, 0);
  v_base   := base_desconto(v_promo, v_orig);
  -- Ajuste satura em ±20 pontos (tanh): poucos votos já contam,
  -- mas a nota nunca dispara só por volume.
  v_ajuste := 20 * tanh(v_net::NUMERIC / 5);
  v_final  := GREATEST(0, LEAST(100, ROUND(v_base + v_ajuste)));

  UPDATE promos SET temperatura = v_final WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 4. Triggers — recalculam quando votos ou preço mudam
-- ------------------------------------------------------------

-- 4a. Em votos: INSERT, UPDATE (troca de voto) e DELETE (toggle off)
CREATE OR REPLACE FUNCTION trg_votos_recalc()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM recalcular_temperatura(OLD.promo_id);
    RETURN OLD;
  ELSE
    PERFORM recalcular_temperatura(NEW.promo_id);
    -- Se o voto trocou de promo (raro), recalcula a antiga também
    IF (TG_OP = 'UPDATE' AND NEW.promo_id IS DISTINCT FROM OLD.promo_id) THEN
      PERFORM recalcular_temperatura(OLD.promo_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS votos_recalc_temperatura ON votos;
CREATE TRIGGER votos_recalc_temperatura
  AFTER INSERT OR UPDATE OR DELETE ON votos
  FOR EACH ROW EXECUTE FUNCTION trg_votos_recalc();

-- 4b. Em promos: quando o preço muda, a base do desconto muda
CREATE OR REPLACE FUNCTION trg_promos_recalc()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.preco_promo IS DISTINCT FROM OLD.preco_promo
      OR NEW.preco_original IS DISTINCT FROM OLD.preco_original) THEN
    PERFORM recalcular_temperatura(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promos_recalc_temperatura ON promos;
CREATE TRIGGER promos_recalc_temperatura
  AFTER UPDATE ON promos
  FOR EACH ROW EXECUTE FUNCTION trg_promos_recalc();

-- ------------------------------------------------------------
-- 5. Backfill — recalcula todas as promos existentes uma vez
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM promos LOOP
    PERFORM recalcular_temperatura(r.id);
  END LOOP;
END $$;
