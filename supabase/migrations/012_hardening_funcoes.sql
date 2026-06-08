-- ============================================================
-- Hardening de segurança (apontado pelo Supabase advisor)
--
-- 1. Revoga EXECUTE das funções SECURITY DEFINER dos roles anon/
--    authenticated. Sem isso, um usuário poderia chamar
--    /rest/v1/rpc/conceder_xp e inflar o próprio XP/badges.
--    Essas funções só rodam internamente (triggers / service_role,
--    que ignora esses GRANTs).
-- 2. Fixa search_path nas funções (evita sequestro de search_path).
-- ============================================================

-- 1. REVOKE EXECUTE dos roles públicos -------------------------
-- IMPORTANTE: funções ganham EXECUTE do pseudo-role PUBLIC por padrão.
-- Revogar de anon/authenticated não basta — é preciso revogar de PUBLIC.
-- service_role tem BYPASSRLS e é superuser-like, então segue funcionando
-- nos triggers e nas API routes server-side.
REVOKE EXECUTE ON FUNCTION public.conceder_xp(uuid, integer)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.conceder_badge(uuid, text)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.garantir_perfil(uuid)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.criar_notificacao(uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.incrementar_cliques(uuid)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalcular_temperatura(uuid)            FROM PUBLIC, anon, authenticated;

-- 2. search_path fixo nas funções (defensivo) -----------------
ALTER FUNCTION public.conceder_xp(uuid, integer)                SET search_path = public;
ALTER FUNCTION public.conceder_badge(uuid, text)               SET search_path = public;
ALTER FUNCTION public.garantir_perfil(uuid)                    SET search_path = public;
ALTER FUNCTION public.criar_notificacao(uuid, text, text, text, uuid) SET search_path = public;
ALTER FUNCTION public.incrementar_cliques(uuid)               SET search_path = public;
ALTER FUNCTION public.recalcular_temperatura(uuid)            SET search_path = public;
ALTER FUNCTION public.base_desconto(numeric, numeric)         SET search_path = public;
ALTER FUNCTION public.normalizar_txt(text)                    SET search_path = public;
ALTER FUNCTION public.xp_do_voto(text)                        SET search_path = public;
ALTER FUNCTION public.dono_da_promo(uuid)                     SET search_path = public;
ALTER FUNCTION public.set_atualizado_em()                     SET search_path = public;
ALTER FUNCTION public.registrar_historico_preco()            SET search_path = public;
ALTER FUNCTION public.trg_votos_recalc()                     SET search_path = public;
ALTER FUNCTION public.trg_promos_recalc()                    SET search_path = public;
ALTER FUNCTION public.trg_novo_usuario()                     SET search_path = public;
ALTER FUNCTION public.trg_promo_xp()                         SET search_path = public;
ALTER FUNCTION public.trg_voto_xp()                          SET search_path = public;
ALTER FUNCTION public.trg_alerta_queda_preco()              SET search_path = public;
ALTER FUNCTION public.trg_alerta_keyword()                  SET search_path = public;
