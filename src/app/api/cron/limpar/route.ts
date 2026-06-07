import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { autorizarCron } from "@/lib/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Promos mais antigas que isto, com poucos cliques, são arquivadas.
const DIAS_VELHA = 45;
const CLIQUES_MIN = 5;

// GET /api/cron/limpar — arquiva promos vencidas e velhas sem engajamento
export async function GET(req: NextRequest) {
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const agora = new Date().toISOString();
  const limiteVelha = new Date(Date.now() - DIAS_VELHA * 86400000).toISOString();

  // 1. Vencidas por data (expira_em no passado)
  const { data: vencidas } = await supabase
    .from("promos")
    .update({ ativo: false, arquivada_em: agora })
    .eq("ativo", true)
    .not("expira_em", "is", null)
    .lt("expira_em", agora)
    .select("id");

  // 2. Velhas sem engajamento
  const { data: velhas } = await supabase
    .from("promos")
    .update({ ativo: false, arquivada_em: agora })
    .eq("ativo", true)
    .lt("criado_em", limiteVelha)
    .lte("cliques", CLIQUES_MIN)
    .select("id");

  const totalVencidas = vencidas?.length ?? 0;
  const totalVelhas = velhas?.length ?? 0;

  console.log(`[cron/limpar] vencidas=${totalVencidas} velhas=${totalVelhas}`);

  return NextResponse.json({
    ok: true,
    arquivadas: { vencidas: totalVencidas, velhas: totalVelhas },
  });
}
