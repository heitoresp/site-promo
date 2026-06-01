import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Badge, Promo } from "@/types/promo";

// ============================================================
// GET /api/usuarios/[id] — perfil público + badges + stats + promos
// ============================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  // Perfil
  const { data: perfil } = await supabase
    .from("perfis")
    .select("user_id, nome, avatar_url, xp_total, criado_em")
    .eq("user_id", id)
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Badges do usuário (join com o catálogo)
  const { data: ub } = await supabase
    .from("usuario_badges")
    .select("badge_slug, concedido_em, badges(slug, nome, descricao, emoji, cor, ordem)")
    .eq("user_id", id);

  const badges: Badge[] = (ub ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.badges && {
      ...row.badges,
      concedido_em: row.concedido_em,
    })
    .filter(Boolean)
    .sort((a: Badge, b: Badge) => a.ordem - b.ordem);

  // Promos aprovadas do usuário (mais recentes primeiro)
  const { data: promosData } = await supabase
    .from("promos")
    .select("*")
    .eq("enviado_por", id)
    .eq("status", "ativo")
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(30);

  const promos = (promosData ?? []) as Promo[];

  // Stats
  const promosAprovadas = promos.length;
  const cliquesTotais = promos.reduce((s, p) => s + (p.cliques ?? 0), 0);

  const { count: votosQuentes } = await supabase
    .from("votos")
    .select("id, promos!inner(enviado_por)", { count: "exact", head: true })
    .eq("tipo", "quente")
    .eq("promos.enviado_por", id);

  return NextResponse.json({
    ...perfil,
    badges,
    stats: {
      promos_aprovadas: promosAprovadas,
      votos_quentes: votosQuentes ?? 0,
      cliques_totais: cliquesTotais,
    },
    promos,
  });
}
