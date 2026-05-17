import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CreatePromoPayload } from "@/types/promo";

// ============================================================
// Helpers
// ============================================================
function autenticar(request: NextRequest): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token === process.env.API_SECRET;
}

function erroJSON(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// ============================================================
// GET /api/promos — lista promos públicas com filtros
// ============================================================
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const categoria = searchParams.get("categoria");
  const loja      = searchParams.get("loja");
  const busca     = searchParams.get("busca");
  const hot       = searchParams.get("hot") === "true";
  const limite    = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const pagina    = Math.max(parseInt(searchParams.get("pagina") ?? "1"), 1);
  const offset    = (pagina - 1) * limite;

  let query = supabase
    .from("promos")
    .select("*", { count: "exact" })
    .eq("ativo", true)
    .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
    .order("criado_em", { ascending: false })
    .range(offset, offset + limite - 1);

  if (categoria) query = query.eq("categoria", categoria);
  if (loja)      query = query.eq("loja", loja);

  if (busca) {
    query = query.textSearch("titulo", busca, {
      type: "websearch",
      config: "portuguese",
    });
  }

  if (hot) {
    // Promos com mais de 20 cliques nas últimas 24h = "hot"
    query = query.gt("cliques", 20);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[GET /api/promos]", error);
    return erroJSON("Erro interno ao buscar promos.", 500);
  }

  const total = count ?? 0;

  return NextResponse.json({
    promos: data,
    total,
    pagina,
    limite,
    total_paginas: Math.ceil(total / limite),
  });
}

// ============================================================
// POST /api/promos — cria uma promo (requer Bearer token)
// ============================================================
export async function POST(request: NextRequest) {
  if (!autenticar(request)) {
    return erroJSON("Não autorizado.", 401);
  }

  let body: CreatePromoPayload;
  try {
    body = await request.json();
  } catch {
    return erroJSON("JSON inválido.", 400);
  }

  // Validação mínima
  if (!body.titulo || !body.preco_promo || !body.link_afiliado) {
    return erroJSON(
      "Campos obrigatórios: titulo, preco_promo, link_afiliado.",
      422
    );
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("promos")
    .insert({
      titulo:         body.titulo,
      descricao:      body.descricao ?? null,
      preco_original: body.preco_original ?? null,
      preco_promo:    body.preco_promo,
      link_afiliado:  body.link_afiliado,
      loja:           body.loja ?? "outros",
      categoria:      body.categoria ?? "geral",
      cupom:          body.cupom ?? null,
      imagem_url:     body.imagem_url ?? null,
      origem:         body.origem ?? "whatsapp_bot",
      expira_em:      body.expira_em ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/promos]", error);
    return erroJSON("Erro ao criar promo.", 500);
  }

  return NextResponse.json({ promo: data }, { status: 201 });
}
