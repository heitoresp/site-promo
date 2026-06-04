import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/notificacoes — lista as do usuário logado + contagem de não-lidas
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notificacoes: [], nao_lidas: 0 });

  const service = createServiceRoleClient();

  const { data } = await service
    .from("notificacoes")
    .select("id, tipo, titulo, corpo, promo_id, lida, criado_em")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(50);

  const { count } = await service
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("lida", false);

  return NextResponse.json({ notificacoes: data ?? [], nao_lidas: count ?? 0 });
}
