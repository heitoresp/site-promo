import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { autorizarCron } from "@/lib/cron";
import { extrairPrecoDeUrl } from "@/lib/extrair-preco";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Quantas promos verificar por execução (limite p/ caber no timeout).
const LOTE = 15;
// Após N falhas seguidas de leitura, considera "fora do ar".
const FALHAS_PARA_FORA = 3;

interface PromoVerif {
  id: string;
  link_afiliado: string;
  preco_promo: number;
  falhas_verificacao: number;
}

// GET /api/cron/verificar-precos
// Revisita as promos ativas menos verificadas e atualiza o preço.
// Onde a loja entrega preço (KaBuM, schema.org), detecta queda/alta —
// e o UPDATE de preco_promo dispara os triggers de histórico + alerta.
// Amazon/ML/Shopee bloqueiam leitura: nesses casos não mexe (preco=null).
export async function GET(req: NextRequest) {
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Pega as ativas que faz mais tempo não verificamos (NULLS first = nunca)
  const { data: promos } = await supabase
    .from("promos")
    .select("id, link_afiliado, preco_promo, falhas_verificacao")
    .eq("ativo", true)
    .eq("status", "ativo")
    .order("ultima_verificacao", { ascending: true, nullsFirst: true })
    .limit(LOTE);

  const lista = (promos ?? []) as PromoVerif[];
  const agora = new Date().toISOString();

  let baixaram = 0, subiram = 0, semLeitura = 0, foraDoAr = 0;

  for (const p of lista) {
    const r = await extrairPrecoDeUrl(p.link_afiliado);

    // Não conseguiu ler preço (loja bloqueia/JS ou fora do ar)
    if (r.preco == null) {
      const falhas = (p.falhas_verificacao ?? 0) + (r.encontrouPagina ? 0 : 1);
      const status = !r.encontrouPagina && falhas >= FALHAS_PARA_FORA ? "fora_do_ar" : "erro";
      if (status === "fora_do_ar") foraDoAr++; else semLeitura++;
      await supabase.from("promos").update({
        ultima_verificacao: agora,
        verificacao_status: status,
        falhas_verificacao: falhas,
      }).eq("id", p.id);
      continue;
    }

    const precoAntigo = Number(p.preco_promo);
    const precoNovo = r.preco;
    const mudou = Math.abs(precoNovo - precoAntigo) >= 0.01;

    // Atualiza. Se o preço mudou, o UPDATE dispara os triggers:
    //   - registrar_historico_preco (gráfico)
    //   - alerta_queda_preco (notifica quem favoritou, se caiu)
    //   - recalcular_temperatura
    const update: Record<string, unknown> = {
      ultima_verificacao: agora,
      verificacao_status: mudou ? "preco_mudou" : "ok",
      falhas_verificacao: 0,
    };
    if (mudou) update.preco_promo = precoNovo;

    await supabase.from("promos").update(update).eq("id", p.id);

    if (mudou) {
      if (precoNovo < precoAntigo) baixaram++; else subiram++;
    }
  }

  console.log(`[cron/verificar-precos] verificadas=${lista.length} baixaram=${baixaram} subiram=${subiram} semLeitura=${semLeitura} foraDoAr=${foraDoAr}`);

  return NextResponse.json({
    ok: true,
    verificadas: lista.length,
    resultado: { baixaram, subiram, semLeitura, foraDoAr },
  });
}
