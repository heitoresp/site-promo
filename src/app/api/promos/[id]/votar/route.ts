import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type Tipo = "stonks" | "super_stonks" | "not_stonks";

async function getContagens(promoId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("votos")
    .select("tipo")
    .eq("promo_id", promoId);

  const contagens = { stonks: 0, super_stonks: 0, not_stonks: 0 };
  for (const v of data ?? []) {
    if (v.tipo in contagens) contagens[v.tipo as Tipo]++;
  }
  return contagens;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Valida body
  const body = await req.json().catch(() => ({}));
  const tipo: Tipo = body.tipo;
  if (!["stonks", "super_stonks", "not_stonks"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();

  // Verifica se já existe um voto desse usuário nessa promo
  const { data: existente } = await serviceClient
    .from("votos")
    .select("id, tipo")
    .eq("promo_id", promoId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    if (existente.tipo === tipo) {
      // Mesmo voto → remove (toggle off)
      await serviceClient.from("votos").delete().eq("id", existente.id);
      const contagens = await getContagens(promoId);
      return NextResponse.json({ voto: null, contagens });
    } else {
      // Voto diferente → atualiza
      await serviceClient
        .from("votos")
        .update({ tipo })
        .eq("id", existente.id);
      const contagens = await getContagens(promoId);
      return NextResponse.json({ voto: tipo, contagens });
    }
  }

  // Novo voto
  await serviceClient.from("votos").insert({
    promo_id: promoId,
    user_id:  user.id,
    tipo,
  });

  const contagens = await getContagens(promoId);
  return NextResponse.json({ voto: tipo, contagens });
}

// Retorna contagens + voto do usuário logado (se houver)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [contagens, meuVotoRes] = await Promise.all([
    getContagens(promoId),
    user
      ? createServiceRoleClient()
          .from("votos")
          .select("tipo")
          .eq("promo_id", promoId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    contagens,
    meuVoto: meuVotoRes.data?.tipo ?? null,
  });
}
