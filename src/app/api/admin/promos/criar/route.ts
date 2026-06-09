import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { detectarCategoria } from "@/lib/categoria";
import { calcularTemperatura } from "@/lib/temperatura";
import { transformarLinkAfiliado } from "@/lib/afiliados";

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// POST /api/admin/promos/criar
// Criação de promo pelo admin — autenticada por SESSÃO (não por Bearer token).
// Substitui o antigo POST /api/promos com NEXT_PUBLIC_API_SECRET exposto no client.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });

  if (!body.titulo || !body.preco_promo || !body.link_afiliado) {
    return NextResponse.json(
      { erro: "Campos obrigatórios: titulo, preco_promo, link_afiliado." },
      { status: 422 }
    );
  }

  const temperatura = await calcularTemperatura(
    body.titulo, Number(body.preco_promo), body.preco_original ?? null
  );

  // Transforma o link em link de afiliado (igual ao fluxo de submissão)
  const linkAfiliado = await transformarLinkAfiliado(body.link_afiliado);

  const { data, error } = await createServiceRoleClient()
    .from("promos")
    .insert({
      titulo:         String(body.titulo).trim().slice(0, 200),
      descricao:      body.descricao?.trim().slice(0, 1000) ?? null,
      preco_original: body.preco_original ? Number(body.preco_original) : null,
      preco_promo:    Number(body.preco_promo),
      link_afiliado:  linkAfiliado,
      loja:           body.loja ?? "outros",
      categoria:      body.categoria ?? detectarCategoria(body.titulo, body.descricao),
      cupom:          body.cupom?.trim() || null,
      imagem_url:     body.imagem_url || null,
      origem:         "manual",
      expira_em:      body.expira_em || null,
      status:         "ativo",
      ativo:          true,
      temperatura,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/admin/promos/criar]", error);
    return NextResponse.json({ erro: "Erro ao criar promo." }, { status: 500 });
  }

  return NextResponse.json({ promo: data }, { status: 201 });
}
