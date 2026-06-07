import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, idDoCliente } from "@/lib/rate-limit";

type Tipo = "quente" | "frio";
const TIPOS_VALIDOS: Tipo[] = ["quente", "frio"];

async function getContagens(promoId: string) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("votos")
    .select("tipo")
    .eq("promo_id", promoId);

  const contagens = { quente: 0, frio: 0 };
  for (const v of data ?? []) {
    if (v.tipo in contagens) contagens[v.tipo as Tipo]++;
  }
  return contagens;
}

// Lê a temperatura recalculada pelo trigger (desconto + votos)
async function getTemperatura(promoId: string): Promise<number | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("promos")
    .select("temperatura")
    .eq("id", promoId)
    .maybeSingle();
  return data?.temperatura ?? null;
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

  // Rate limit: máx 20 votos por minuto por usuário
  const limite = rateLimit(`votar:${idDoCliente(req, user.id)}`, 20, 60_000);
  if (limite) return limite;

  // Valida body
  const body = await req.json().catch(() => ({}));
  const tipo: Tipo = body.tipo;
  if (!TIPOS_VALIDOS.includes(tipo)) {
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

  let voto: Tipo | null = tipo;

  if (existente) {
    if (existente.tipo === tipo) {
      // Mesmo voto → remove (toggle off)
      await serviceClient.from("votos").delete().eq("id", existente.id);
      voto = null;
    } else {
      // Voto diferente → atualiza
      await serviceClient.from("votos").update({ tipo }).eq("id", existente.id);
    }
  } else {
    // Novo voto
    await serviceClient.from("votos").insert({
      promo_id: promoId,
      user_id:  user.id,
      tipo,
    });
  }

  // O trigger no banco já recalculou a temperatura
  const [contagens, temperatura] = await Promise.all([
    getContagens(promoId),
    getTemperatura(promoId),
  ]);

  return NextResponse.json({ voto, contagens, temperatura });
}

// Retorna contagens + voto do usuário logado (se houver) + temperatura atual
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promoId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [contagens, temperatura, meuVotoRes] = await Promise.all([
    getContagens(promoId),
    getTemperatura(promoId),
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
    temperatura,
    meuVoto: meuVotoRes.data?.tipo ?? null,
  });
}
