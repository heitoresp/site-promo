import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { transformarLinkAfiliado } from "@/lib/afiliados";

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const {
    titulo, descricao, preco_promo, preco_original,
    cupom, imagem_url, loja, categoria, link_afiliado, expira_em,
    link_afiliado_manual,
  } = body;

  const update: Record<string, unknown> = {};
  if (titulo       !== undefined) update.titulo        = String(titulo).trim().slice(0, 200);
  if (descricao    !== undefined) update.descricao     = descricao ? String(descricao).trim().slice(0, 1000) : null;
  if (preco_promo  !== undefined) update.preco_promo   = Number(preco_promo);
  if (preco_original !== undefined) update.preco_original = preco_original ? Number(preco_original) : null;
  if (cupom        !== undefined) update.cupom         = cupom ? String(cupom).trim() : null;
  if (imagem_url   !== undefined) update.imagem_url    = imagem_url || null;
  if (loja         !== undefined) update.loja          = loja || null;
  if (categoria    !== undefined) update.categoria     = categoria || null;
  if (link_afiliado !== undefined) {
    // Re-transforma em link de afiliado ao editar (idempotente: se já tem a tag, mantém)
    update.link_afiliado = link_afiliado ? await transformarLinkAfiliado(link_afiliado) : null;
  }
  if (expira_em    !== undefined) update.expira_em     = expira_em || null;
  if (link_afiliado_manual !== undefined) update.link_afiliado_manual = link_afiliado_manual?.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const { error } = await createServiceRoleClient()
    .from("promos")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
