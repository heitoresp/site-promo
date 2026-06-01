import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { RankingUsuario } from "@/types/promo";

// ============================================================
// GET /api/ranking/usuarios — top caçadores por XP
// ============================================================
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data: perfis, error } = await supabase
    .from("perfis")
    .select("user_id, nome, avatar_url, xp_total")
    .gt("xp_total", 0)
    .order("xp_total", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Conta promos aprovadas de cada um (lote único)
  const ids = (perfis ?? []).map((p) => p.user_id);
  const contagem: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: promos } = await supabase
      .from("promos")
      .select("enviado_por")
      .in("enviado_por", ids)
      .eq("status", "ativo");

    for (const p of promos ?? []) {
      const k = p.enviado_por as string;
      contagem[k] = (contagem[k] ?? 0) + 1;
    }
  }

  const ranking: RankingUsuario[] = (perfis ?? []).map((p) => ({
    user_id: p.user_id,
    nome: p.nome,
    avatar_url: p.avatar_url,
    xp_total: p.xp_total,
    promos_aprovadas: contagem[p.user_id] ?? 0,
  }));

  return NextResponse.json({ ranking });
}
