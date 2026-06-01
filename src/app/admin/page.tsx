import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AdminDashboard } from "./AdminDashboard";
import type { Promo, Categoria, Loja, Badge } from "@/types/promo";

// Perfil com badges para o painel admin
export interface PerfilAdmin {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  xp: number;
  xp_bonus: number;
  xp_total: number;
  badges: string[]; // slugs concedidos
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const service = createServiceRoleClient();

  const [promosData, pendentesData, categoriasData, lojasData, statsData, perfisData, badgesData, ubData] = await Promise.all([
    service
      .from("promos")
      .select("*")
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .limit(50),
    service
      .from("promos")
      .select("*")
      .eq("status", "pendente")
      .order("criado_em", { ascending: false }),
    service.from("categorias").select("*").order("ordem"),
    service.from("lojas").select("*").order("ordem"),
    service.from("promos").select("id, ativo, cliques, origem", { count: "exact" }),
    service.from("perfis").select("user_id, nome, avatar_url, xp, xp_bonus, xp_total").order("xp_total", { ascending: false }),
    service.from("badges").select("*").order("ordem"),
    service.from("usuario_badges").select("user_id, badge_slug"),
  ]);

  const promos     = (promosData.data     ?? []) as Promo[];
  const pendentes  = (pendentesData.data  ?? []) as Promo[];
  const categorias = (categoriasData.data ?? []) as Categoria[];
  const lojas      = (lojasData.data      ?? []) as Loja[];
  const catalogoBadges = (badgesData.data ?? []) as Badge[];

  // Monta perfis com a lista de badges de cada um
  const badgesPorUser: Record<string, string[]> = {};
  for (const ub of ubData.data ?? []) {
    (badgesPorUser[ub.user_id] ??= []).push(ub.badge_slug);
  }
  const perfis: PerfilAdmin[] = (perfisData.data ?? []).map((p) => ({
    user_id: p.user_id,
    nome: p.nome,
    avatar_url: p.avatar_url,
    xp: p.xp,
    xp_bonus: p.xp_bonus,
    xp_total: p.xp_total,
    badges: badgesPorUser[p.user_id] ?? [],
  }));

  const stats = {
    total:    statsData.count ?? 0,
    ativas:   (statsData.data ?? []).filter((p) => p.ativo).length,
    bot:      (statsData.data ?? []).filter((p) => p.origem === "whatsapp_bot").length,
    cliques:  (statsData.data ?? []).reduce((sum, p) => sum + (p.cliques ?? 0), 0),
  };

  return (
    <AdminDashboard
      user={user}
      promos={promos}
      pendentes={pendentes}
      categorias={categorias}
      lojas={lojas}
      stats={stats}
      perfis={perfis}
      catalogoBadges={catalogoBadges}
    />
  );
}
