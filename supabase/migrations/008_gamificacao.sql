-- ============================================================
-- GAMIFICAÇÃO — "Caçador de Ofertas"
--
-- - perfis: 1 por usuário (auth.users), guarda XP ganho + bônus do admin
-- - badges: catálogo de conquistas (editável)
-- - usuario_badges: conquistas de cada usuário (auto via trigger ou manual)
--
-- XP:
--   xp        = pontos ganhos automaticamente (triggers) — não negativo
--   xp_bonus  = ajuste manual do admin (pode ser + ou -)
--   xp_total  = GREATEST(0, xp + xp_bonus)   (coluna gerada)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFIS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfis (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT,
  avatar_url  TEXT,
  xp          INTEGER NOT NULL DEFAULT 0,         -- ganho via triggers
  xp_bonus    INTEGER NOT NULL DEFAULT 0,         -- ajuste manual do admin
  xp_total    INTEGER GENERATED ALWAYS AS (GREATEST(0, xp + xp_bonus)) STORED,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS perfis_xp_total_idx ON perfis (xp_total DESC);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfis_select_public" ON perfis;
CREATE POLICY "perfis_select_public" ON perfis FOR SELECT USING (TRUE);
-- escrita só via service role (triggers SECURITY DEFINER e APIs admin)

-- ------------------------------------------------------------
-- 2. CATÁLOGO DE BADGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS badges (
  slug        TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🏅',
  cor         TEXT NOT NULL DEFAULT '#f97316',
  ordem       INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_select_public" ON badges;
CREATE POLICY "badges_select_public" ON badges FOR SELECT USING (TRUE);

INSERT INTO badges (slug, nome, descricao, emoji, cor, ordem) VALUES
  ('primeira_promo',  'Primeira Caça',    'Postou a primeira promo aprovada',        '🐣', '#22c55e', 1),
  ('cinco_aprovadas', 'Garimpeiro',       '5 promos aprovadas',                       '🔍', '#38bdf8', 2),
  ('dez_aprovadas',   'Caçador Nato',     '10 promos aprovadas',                      '🎯', '#a78bfa', 3),
  ('promo_imperdivel','Achado de Ouro',   'Postou uma promo Imperdível (nota ≥ 80)',  '💎', '#f59e0b', 4),
  ('promo_bombou',    'Viralizou',        'Uma promo sua passou de 100 cliques',      '🚀', '#ef4444', 5),
  ('querido',         'Queridinho',       'Recebeu 50 votos quentes no total',        '🔥', '#fb923c', 6)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. BADGES DOS USUÁRIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario_badges (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_slug  TEXT NOT NULL REFERENCES badges(slug)   ON DELETE CASCADE,
  concedido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_slug)
);

ALTER TABLE usuario_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuario_badges_select_public" ON usuario_badges;
CREATE POLICY "usuario_badges_select_public" ON usuario_badges FOR SELECT USING (TRUE);

-- ------------------------------------------------------------
-- 4. HELPERS
-- ------------------------------------------------------------

-- Garante que existe um perfil pra um usuário (idempotente)
CREATE OR REPLACE FUNCTION garantir_perfil(p_user UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO perfis (user_id, nome, avatar_url)
  SELECT u.id,
         COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
         u.raw_user_meta_data->>'avatar_url'
  FROM auth.users u
  WHERE u.id = p_user
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soma XP a um usuário (cria o perfil se faltar). Aceita valor negativo.
CREATE OR REPLACE FUNCTION conceder_xp(p_user UUID, p_delta INTEGER)
RETURNS void AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  PERFORM garantir_perfil(p_user);
  UPDATE perfis SET xp = GREATEST(0, xp + p_delta) WHERE user_id = p_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concede um badge (idempotente)
CREATE OR REPLACE FUNCTION conceder_badge(p_user UUID, p_badge TEXT)
RETURNS void AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  PERFORM garantir_perfil(p_user);
  INSERT INTO usuario_badges (user_id, badge_slug)
  VALUES (p_user, p_badge)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 5. TRIGGER: novo usuário no auth → cria perfil
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_novo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (user_id, nome, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_novo_usuario();

-- ------------------------------------------------------------
-- 6. TRIGGER: promos → XP de aprovação + badges
--    "Aprovada" = status passa para 'ativo' E tem autor (enviado_por).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_promo_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_aprovadas INTEGER;
BEGIN
  -- Só interessa quando vira 'ativo' agora (e não era antes), com autor definido
  IF NEW.enviado_por IS NULL THEN RETURN NEW; END IF;

  IF (TG_OP = 'INSERT' AND NEW.status = 'ativo')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'ativo' AND OLD.status IS DISTINCT FROM 'ativo') THEN

    -- +20 pela promo aprovada
    PERFORM conceder_xp(NEW.enviado_por, 20);

    -- +30 bônus se já nasce "Imperdível"
    IF COALESCE(NEW.temperatura, 0) >= 80 THEN
      PERFORM conceder_xp(NEW.enviado_por, 30);
      PERFORM conceder_badge(NEW.enviado_por, 'promo_imperdivel');
    END IF;

    -- Badges por quantidade de promos aprovadas
    SELECT COUNT(*) INTO v_aprovadas
    FROM promos WHERE enviado_por = NEW.enviado_por AND status = 'ativo';

    IF v_aprovadas >= 1  THEN PERFORM conceder_badge(NEW.enviado_por, 'primeira_promo');  END IF;
    IF v_aprovadas >= 5  THEN PERFORM conceder_badge(NEW.enviado_por, 'cinco_aprovadas'); END IF;
    IF v_aprovadas >= 10 THEN PERFORM conceder_badge(NEW.enviado_por, 'dez_aprovadas');   END IF;
  END IF;

  -- Badge "Viralizou": promo cruzou 100 cliques (cliques sobem via RPC = UPDATE)
  IF (TG_OP = 'UPDATE'
      AND NEW.cliques >= 100 AND COALESCE(OLD.cliques, 0) < 100) THEN
    PERFORM conceder_badge(NEW.enviado_por, 'promo_bombou');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS promos_xp ON promos;
CREATE TRIGGER promos_xp
  AFTER INSERT OR UPDATE ON promos
  FOR EACH ROW EXECUTE FUNCTION trg_promo_xp();

-- ------------------------------------------------------------
-- 7. TRIGGER: votos → XP pro DONO da promo (não pro votante)
--    quente = +2 / frio = -1. Reverte em DELETE e em troca de voto.
--    Badge 'querido' aos 50 votos quentes recebidos no total.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION xp_do_voto(p_tipo TEXT)
RETURNS INTEGER AS $$
BEGIN
  IF p_tipo = 'quente' THEN RETURN 2; END IF;
  IF p_tipo = 'frio'   THEN RETURN -1; END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION dono_da_promo(p_promo UUID)
RETURNS UUID AS $$
  SELECT enviado_por FROM promos WHERE id = p_promo;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION trg_voto_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_dono_new UUID;
  v_dono_old UUID;
  v_quentes  INTEGER;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_dono_new := dono_da_promo(NEW.promo_id);
    -- ignora auto-voto (votar na própria promo não dá XP)
    IF v_dono_new IS NOT NULL AND v_dono_new <> NEW.user_id THEN
      PERFORM conceder_xp(v_dono_new, xp_do_voto(NEW.tipo));
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    v_dono_old := dono_da_promo(OLD.promo_id);
    IF v_dono_old IS NOT NULL AND v_dono_old <> OLD.user_id THEN
      PERFORM conceder_xp(v_dono_old, -xp_do_voto(OLD.tipo));
    END IF;
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- troca de voto: reverte o antigo, aplica o novo
    v_dono_new := dono_da_promo(NEW.promo_id);
    IF v_dono_new IS NOT NULL AND v_dono_new <> NEW.user_id THEN
      PERFORM conceder_xp(v_dono_new, xp_do_voto(NEW.tipo) - xp_do_voto(OLD.tipo));
    END IF;
  END IF;

  -- Badge 'querido' (50 votos quentes recebidos no total)
  IF v_dono_new IS NOT NULL THEN
    SELECT COUNT(*) INTO v_quentes
    FROM votos v JOIN promos p ON p.id = v.promo_id
    WHERE p.enviado_por = v_dono_new AND v.tipo = 'quente';
    IF v_quentes >= 50 THEN PERFORM conceder_badge(v_dono_new, 'querido'); END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS votos_xp ON votos;
CREATE TRIGGER votos_xp
  AFTER INSERT OR UPDATE OR DELETE ON votos
  FOR EACH ROW EXECUTE FUNCTION trg_voto_xp();

-- ------------------------------------------------------------
-- 8. Perfis para usuários que JÁ existem (sem dar XP retroativo)
-- ------------------------------------------------------------
INSERT INTO perfis (user_id, nome, avatar_url)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;
