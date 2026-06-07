import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// POST /api/promos/engajamento  { ids: string[] }
// Retorna, em LOTE, o engajamento de várias promos de uma vez —
// elimina o N+1 do feed (antes cada card fazia 2 fetches no mount).
//   { [promoId]: { quente, frio, meuVoto, favoritado } }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 100) : [];
  if (ids.length === 0) return NextResponse.json({ engajamento: {} });

  const service = createServiceRoleClient();

  // Usuário logado (pra meuVoto/favoritado) — opcional
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Votos de todas as promos (1 query)
  const { data: votos } = await service
    .from("votos")
    .select("promo_id, tipo, user_id")
    .in("promo_id", ids);

  // Favoritos do usuário (1 query), só se logado
  const favs = new Set<string>();
  if (user) {
    const { data: favData } = await service
      .from("favoritos")
      .select("promo_id")
      .eq("user_id", user.id)
      .in("promo_id", ids);
    for (const f of favData ?? []) favs.add(f.promo_id);
  }

  // Monta o mapa
  const mapa: Record<string, { quente: number; frio: number; meuVoto: string | null; favoritado: boolean }> = {};
  for (const id of ids) mapa[id] = { quente: 0, frio: 0, meuVoto: null, favoritado: favs.has(id) };

  for (const v of votos ?? []) {
    const e = mapa[v.promo_id];
    if (!e) continue;
    if (v.tipo === "quente") e.quente++;
    else if (v.tipo === "frio") e.frio++;
    if (user && v.user_id === user.id) e.meuVoto = v.tipo;
  }

  return NextResponse.json({ engajamento: mapa });
}
