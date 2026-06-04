import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/promos/[id]/favoritar — o usuário logado salvou esta promo?
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ favoritado: false });

  const { data } = await createServiceRoleClient()
    .from("favoritos")
    .select("promo_id")
    .eq("promo_id", promoId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ favoritado: !!data });
}

// POST /api/promos/[id]/favoritar — alterna (salva / remove)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login para salvar promos" }, { status: 401 });
  }

  const service = createServiceRoleClient();

  const { data: existente } = await service
    .from("favoritos")
    .select("promo_id")
    .eq("promo_id", promoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    await service
      .from("favoritos")
      .delete()
      .eq("promo_id", promoId)
      .eq("user_id", user.id);
    return NextResponse.json({ favoritado: false });
  }

  const { error } = await service
    .from("favoritos")
    .insert({ promo_id: promoId, user_id: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ favoritado: true });
}
