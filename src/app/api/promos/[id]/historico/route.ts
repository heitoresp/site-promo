import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { HistoricoPreco, HistoricoPrecoStats } from "@/types/promo";

// ============================================================
// GET /api/promos/[id]/historico
// Retorna a série de preços da promo + estatísticas para o gráfico.
// ============================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("historico_precos")
    .select("preco_promo, preco_original, registrado_em")
    .eq("promo_id", id)
    .order("registrado_em", { ascending: true })
    .limit(365);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const historico: HistoricoPreco[] = (data ?? []).map((h) => ({
    preco_promo: Number(h.preco_promo),
    preco_original: h.preco_original != null ? Number(h.preco_original) : null,
    registrado_em: h.registrado_em as string,
  }));

  let stats: HistoricoPrecoStats | null = null;
  if (historico.length > 0) {
    const precos = historico.map((h) => h.preco_promo);
    const menor = Math.min(...precos);
    const maior = Math.max(...precos);
    const atual = historico[historico.length - 1].preco_promo;
    // Primeiro ponto que atingiu o menor preço
    const pontoMenor = historico.find((h) => h.preco_promo === menor)!;

    stats = {
      menor,
      maior,
      atual,
      menor_em: pontoMenor.registrado_em,
      eh_menor_preco: atual <= menor,
      economia_vs_maior:
        maior > 0 ? Math.round(((maior - atual) / maior) * 100) : 0,
    };
  }

  return NextResponse.json({ historico, stats });
}
