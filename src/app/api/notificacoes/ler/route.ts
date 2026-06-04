import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

// POST /api/notificacoes/ler — marca todas as do usuário como lidas
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { error } = await createServiceRoleClient()
    .from("notificacoes")
    .update({ lida: true })
    .eq("user_id", user.id)
    .eq("lida", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
