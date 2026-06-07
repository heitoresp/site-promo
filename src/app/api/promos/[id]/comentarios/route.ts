import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, idDoCliente } from "@/lib/rate-limit";

// GET /api/promos/[id]/comentarios — lista comentários ativos
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("comentarios")
    .select("id, user_id, user_nome, user_avatar, conteudo, criado_em")
    .eq("promo_id", promoId)
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ erro: "Erro ao buscar comentários." }, { status: 500 });

  // Anexa o XP do autor (para o selo de nível), em lote
  const ids = [...new Set((data ?? []).map((c) => c.user_id).filter(Boolean))];
  const xpPorUser: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: perfis } = await supabase
      .from("perfis")
      .select("user_id, xp_total")
      .in("user_id", ids);
    for (const p of perfis ?? []) xpPorUser[p.user_id] = p.xp_total;
  }

  const comentarios = (data ?? []).map((c) => ({
    ...c,
    xp: xpPorUser[c.user_id] ?? 0,
  }));

  return NextResponse.json({ comentarios });
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

  // Rate limit: máx 5 comentários por minuto por usuário
  const limite = rateLimit(`comentar:${idDoCliente(req, user.id)}`, 5, 60_000);
  if (limite) return limite;

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
    .select("id, user_id, user_nome, user_avatar, conteudo, criado_em")
    .single();

  if (error) {
    console.error("[POST /comentarios]", error);
    return NextResponse.json({ erro: "Erro ao salvar comentário." }, { status: 500 });
  }

  // XP atual do autor (para o selo de nível no comentário recém-criado)
  const { data: perfil } = await supabase
    .from("perfis")
    .select("xp_total")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(
    { comentario: { ...data, xp: perfil?.xp_total ?? 0 } },
    { status: 201 }
  );
}
