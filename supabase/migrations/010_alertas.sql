-- ============================================================
-- Alertas & Notificações (in-app)
--
-- Dois gatilhos:
--   1. Queda de preço numa promo que o usuário SALVOU (favoritos)
--   2. Promo nova aprovada que bate uma PALAVRA-CHAVE do usuário
--
-- As notificações ficam numa caixa de entrada (notificacoes),
-- lidas pelo sino no header.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CAIXA DE NOTIFICAÇÕES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL DEFAULT 'geral'
             CHECK (tipo IN ('queda_preco', 'keyword', 'geral')),
  titulo     TEXT NOT NULL,
  corpo      TEXT,
  promo_id   UUID REFERENCES promos(id) ON DELETE CASCADE,
  lida       BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notificacoes_user_idx
  ON notificacoes (user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS notificacoes_nao_lidas_idx
  ON notificacoes (user_id) WHERE lida = FALSE;

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificacoes_select_own" ON notificacoes;
CREATE POLICY "notificacoes_select_own"
  ON notificacoes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notificacoes_update_own" ON notificacoes;
CREATE POLICY "notificacoes_update_own"
  ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
-- inserção só via trigger (SECURITY DEFINER) / service role

-- ------------------------------------------------------------
-- 2. ALERTAS POR PALAVRA-CHAVE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertas_keyword (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  termo      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, termo)
);

CREATE INDEX IF NOT EXISTS alertas_keyword_user_idx ON alertas_keyword (user_id);

ALTER TABLE alertas_keyword ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alertas_select_own" ON alertas_keyword;
CREATE POLICY "alertas_select_own"
  ON alertas_keyword FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "alertas_insert_own" ON alertas_keyword;
CREATE POLICY "alertas_insert_own"
  ON alertas_keyword FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "alertas_delete_own" ON alertas_keyword;
CREATE POLICY "alertas_delete_own"
  ON alertas_keyword FOR DELETE USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. Normalização de texto (acento + caixa) para o match
--    Usa unaccent se a extensão existir; senão, só lower().
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION normalizar_txt(p TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(unaccent(coalesce(p, '')));
EXCEPTION WHEN undefined_function THEN
  RETURN lower(coalesce(p, ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper de inserção de notificação
CREATE OR REPLACE FUNCTION criar_notificacao(
  p_user UUID, p_tipo TEXT, p_titulo TEXT, p_corpo TEXT, p_promo UUID
)
RETURNS void AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  INSERT INTO notificacoes (user_id, tipo, titulo, corpo, promo_id)
  VALUES (p_user, p_tipo, p_titulo, p_corpo, p_promo);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 4. TRIGGER: queda de preço em promo favoritada
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_alerta_queda_preco()
RETURNS TRIGGER AS $$
DECLARE
  v_pct INTEGER;
  f RECORD;
BEGIN
  -- Só quando o preço REALMENTE caiu
  IF NEW.preco_promo >= OLD.preco_promo THEN
    RETURN NEW;
  END IF;

  v_pct := ROUND((OLD.preco_promo - NEW.preco_promo) / OLD.preco_promo * 100);

  -- Notifica todos que salvaram esta promo (menos quem postou)
  FOR f IN
    SELECT user_id FROM favoritos
    WHERE promo_id = NEW.id AND user_id IS DISTINCT FROM NEW.enviado_por
  LOOP
    PERFORM criar_notificacao(
      f.user_id,
      'queda_preco',
      '📉 Baixou de preço!',
      NEW.titulo || ' caiu ' || v_pct || '% — agora R$ ' || to_char(NEW.preco_promo, 'FM999G999G990D00'),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS alerta_queda_preco ON promos;
CREATE TRIGGER alerta_queda_preco
  AFTER UPDATE ON promos
  FOR EACH ROW
  WHEN (NEW.preco_promo IS DISTINCT FROM OLD.preco_promo)
  EXECUTE FUNCTION trg_alerta_queda_preco();

-- ------------------------------------------------------------
-- 5. TRIGGER: promo nova aprovada bate palavra-chave
--    Dispara quando a promo passa a ficar 'ativo'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_alerta_keyword()
RETURNS TRIGGER AS $$
DECLARE
  v_texto TEXT;
  a RECORD;
BEGIN
  -- Só no momento em que vira ativo (publicação)
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'ativo')
    OR (TG_OP = 'UPDATE' AND NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo')
  ) THEN
    RETURN NEW;
  END IF;

  v_texto := normalizar_txt(NEW.titulo || ' ' || coalesce(NEW.descricao, ''));

  FOR a IN
    SELECT DISTINCT user_id, termo
    FROM alertas_keyword
    WHERE v_texto LIKE '%' || normalizar_txt(termo) || '%'
      AND user_id IS DISTINCT FROM NEW.enviado_por  -- não avisa o próprio autor
  LOOP
    PERFORM criar_notificacao(
      a.user_id,
      'keyword',
      '🔔 Promo de "' || a.termo || '"',
      NEW.titulo || ' — R$ ' || to_char(NEW.preco_promo, 'FM999G999G990D00'),
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS alerta_keyword ON promos;
CREATE TRIGGER alerta_keyword
  AFTER INSERT OR UPDATE ON promos
  FOR EACH ROW EXECUTE FUNCTION trg_alerta_keyword();
