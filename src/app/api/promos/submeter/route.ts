import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { transformarLinkAfiliado, nomeDaLoja } from "@/lib/afiliados";
import { calcularTemperatura } from "@/lib/temperatura";
import { detectarCategoria } from "@/lib/categoria";

export async function POST(req: NextRequest) {
  // Verifica autenticação
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Faça login para enviar uma promo" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const {
    link,
    titulo,
    preco_promo,
    preco_original,
    cupom,
    descricao,
    imagem_url,
    loja: lojaManual,
    categoria: categoriaManual,
  } = body;

  if (!link || !titulo || !preco_promo) {
    return NextResponse.json(
      { error: "Link, título e preço são obrigatórios" },
      { status: 400 }
    );
  }

  // Transforma o link em link de afiliado
  const linkAfiliado = await transformarLinkAfiliado(link);

  // Detecta loja e categoria automaticamente se não informados
  const loja      = lojaManual || nomeDaLoja(link);
  const categoria = categoriaManual || detectarCategoria(titulo);

  // Calcula temperatura inicial
  const temperatura = await calcularTemperatura(titulo, preco_promo, preco_original ?? null);

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("promos")
    .insert({
      titulo:        titulo.trim().slice(0, 200),
      descricao:     descricao?.trim().slice(0, 1000) ?? null,
      preco_promo:   Number(preco_promo),
      preco_original: preco_original ? Number(preco_original) : null,
      link_afiliado: linkAfiliado,
      loja,
      categoria,
      cupom:         cupom?.trim() || null,
      imagem_url:    imagem_url || null,
      origem:        "manual",
      temperatura,
      status:        "pendente",   // Aguarda aprovação do admin
      ativo:         false,        // Não aparece no feed ainda
      enviado_por:   user.id,
      cliques:       0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Submeter promo]", error);
    return NextResponse.json({ error: `DB: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, linkAfiliado }, { status: 201 });
}
