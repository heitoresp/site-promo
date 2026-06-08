-- ============================================================
-- Corrige o aviso CRITICAL do advisor: "Security Definer View"
--
-- Views no Postgres rodam como SECURITY DEFINER por padrão — consultam
-- com as permissões do criador, ignorando o RLS de quem lê. Recriamos
-- promos_hot com security_invoker = on, pra respeitar o RLS de promos.
--
-- (A view nem é usada pelo app hoje, e só expõe promos ativas — que já
--  são públicas — mas corrigimos por boa prática.)
-- ============================================================

-- DROP + CREATE (não dá pra REPLACE: o SELECT * de promos ganhou colunas
-- novas desde a view original, mudando a ordem). A view não é usada pelo app.
DROP VIEW IF EXISTS promos_hot;

CREATE VIEW promos_hot
WITH (security_invoker = on) AS
  SELECT *,
    CASE WHEN criado_em > NOW() - INTERVAL '24 hours' THEN TRUE ELSE FALSE END AS is_nova,
    CASE WHEN cliques > 50 THEN TRUE ELSE FALSE END AS is_hot
  FROM promos
  WHERE ativo = TRUE
    AND (expira_em IS NULL OR expira_em > NOW())
  ORDER BY
    (cliques * 0.7 + EXTRACT(EPOCH FROM (NOW() - criado_em)) / -3600 * 0.3) DESC;
