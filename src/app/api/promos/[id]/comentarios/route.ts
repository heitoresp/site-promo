import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/promos/[id]/comentarios — lista comentários ativos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("comentarios")
    .select("id, user_nome, user_avatar, conteudo, criado_em")
    .eq("promo_id", promoId)
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ erro: "Erro ao buscar comentários." }, { status: 500 });

  return NextResponse.json({ comentarios: data });
}

// POST /api/promos/[id]/comentarios — adiciona comentário
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  // Verifica autenticação
  const supabaseUser = await createClient();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Você precisa estar logado para comentar." }, { status: 401 });
  }

  const { conteudo } = await req.json();

  if (!conteudo || typeof conteudo !== "string" || conteudo.trim().length === 0) {
    return NextResponse.json({ erro: "Comentário vazio." }, { status: 400 });
  }

  if (conteudo.trim().length > 500) {
    return NextResponse.json({ erro: "Comentário muito longo (máx 500 chars)." }, { status: 400 });
  }

  const nomeUsuario =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Usuário";

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("comentarios")
    .insert({
      promo_id:    promoId,
      user_id:     user.id,
      user_nome:   nomeUsuario,
      user_avatar: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      conteudo:    conteudo.trim(),
    })
    .select("id, user_nome, user_avatar, conteudo, criado_em")
    .single();

  if (error) {
    console.error("[POST /comentarios]", error);
    return NextResponse.json({ erro: "Erro ao salvar comentário." }, { status: 500 });
  }

  return NextResponse.json({ comentario: data }, { status: 201 });
}
