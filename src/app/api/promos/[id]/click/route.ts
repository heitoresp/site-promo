import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { transformarLinkAfiliado } from "@/lib/afiliados";

// ============================================================
// PATCH /api/promos/[id]/click
// Incrementa o contador de cliques e retorna o link de afiliado
// ============================================================
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ erro: "ID inválido." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Busca o link de afiliado antes de incrementar
  const { data: promo, error: fetchError } = await supabase
    .from("promos")
    .select("id, link_afiliado, ativo")
    .eq("id", id)
    .single();

  if (fetchError || !promo) {
    return NextResponse.json({ erro: "Promo não encontrada." }, { status: 404 });
  }

  if (!promo.ativo) {
    return NextResponse.json({ erro: "Promo inativa." }, { status: 410 });
  }

  // Incrementa cliques de forma atômica via RPC
  await supabase.rpc("incrementar_cliques", { promo_id: id });

  // Garante a tag de afiliado no momento do clique — cobre promos antigas
  // (salvas antes de configurar a tag), do bot ou importadas. Idempotente:
  // se o link já tem a tag, não duplica.
  const link = await transformarLinkAfiliado(promo.link_afiliado);

  return NextResponse.json({ link }, { status: 200 });
}
