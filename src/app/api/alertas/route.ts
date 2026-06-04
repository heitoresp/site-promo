import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/alertas — palavras-chave do usuário
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ alertas: [] });

  const { data } = await createServiceRoleClient()
    .from("alertas_keyword")
    .select("id, termo, criado_em")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  return NextResponse.json({ alertas: data ?? [] });
}

// POST /api/alertas  { termo } — adiciona uma palavra-chave
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const termo = String(body?.termo ?? "").trim().slice(0, 60);
  if (termo.length < 2) {
    return NextResponse.json({ error: "Digite ao menos 2 letras" }, { status: 400 });
  }

  const { data, error } = await createServiceRoleClient()
    .from("alertas_keyword")
    .upsert({ user_id: user.id, termo }, { onConflict: "user_id,termo" })
    .select("id, termo, criado_em")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerta: data }, { status: 201 });
}

// DELETE /api/alertas?id=...
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { error } = await createServiceRoleClient()
    .from("alertas_keyword")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
