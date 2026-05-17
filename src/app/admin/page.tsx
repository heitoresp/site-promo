import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AdminDashboard } from "./AdminDashboard";
import type { Promo, Categoria, Loja } from "@/types/promo";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const service = createServiceRoleClient();

  const [promosData, categoriasData, lojasData, statsData] = await Promise.all([
    service
      .from("promos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50),
    service.from("categorias").select("*").order("ordem"),
    service.from("lojas").select("*").order("ordem"),
    service.from("promos").select("id, ativo, cliques, origem", { count: "exact" }),
  ]);

  const promos     = (promosData.data     ?? []) as Promo[];
  const categorias = (categoriasData.data ?? []) as Categoria[];
  const lojas      = (lojasData.data      ?? []) as Loja[];

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
      categorias={categorias}
      lojas={lojas}
      stats={stats}
    />
  );
}
