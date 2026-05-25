import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

const LIMITE_DENUNCIAS = 5;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  // Verifica autenticação do usuário
  const supabaseUser = await createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Você precisa estar logado para denunciar." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Verifica se o usuário já denunciou esta promo
  const { data: jaExiste } = await supabase
    .from("denuncias")
    .select("id")
    .eq("promo_id", promoId)
    .eq("user_id", user.id)
    .single();

  if (jaExiste) {
    return NextResponse.json({ erro: "Você já denunciou esta promoção." }, { status: 409 });
  }

  // Insere a denúncia
  const { error: errInsert } = await supabase
    .from("denuncias")
    .insert({ promo_id: promoId, user_id: user.id });

  if (errInsert) {
    console.error("[POST /report]", errInsert);
    return NextResponse.json({ erro: "Erro ao registrar denúncia." }, { status: 500 });
  }

  // Conta total de denúncias
  const { count } = await supabase
    .from("denuncias")
    .select("*", { count: "exact", head: true })
    .eq("promo_id", promoId);

  const total = count ?? 0;

  // Atualiza contador e verifica limite
  const updates: Record<string, unknown> = { denuncias: total };
  if (total >= LIMITE_DENUNCIAS) {
    updates.ativo = false;
    console.log(`[Report] Promo ${promoId} expirada automaticamente após ${total} denúncias`);
  }

  await supabase.from("promos").update(updates).eq("id", promoId);

  return NextResponse.json({
    ok: true,
    denuncias: total,
    expirada: total >= LIMITE_DENUNCIAS,
  });
}
