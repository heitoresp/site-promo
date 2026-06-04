import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Promo } from "@/types/promo";

// GET /api/usuarios/me/salvos — promos salvas do usuário logado (ativas)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const service = createServiceRoleClient();

  const { data: favs } = await service
    .from("favoritos")
    .select("promo_id, criado_em")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(100);

  const ids = (favs ?? []).map((f) => f.promo_id);
  if (ids.length === 0) return NextResponse.json({ promos: [] });

  const { data: promosData } = await service
    .from("promos")
    .select("*")
    .in("id", ids)
    .eq("ativo", true)
    .eq("status", "ativo");

  // Mantém a ordem de "salvo mais recente primeiro"
  const ordem = new Map(ids.map((id, i) => [id, i]));
  const promos = ((promosData ?? []) as Promo[]).sort(
    (a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0)
  );

  return NextResponse.json({ promos });
}
