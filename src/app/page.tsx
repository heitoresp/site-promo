import { Suspense } from "react";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { CategoriaNav } from "@/components/CategoriaNav";
import { FiltrosFeed } from "@/components/FiltrosFeed";
import { PromoFeedRealtime } from "@/components/PromoFeedRealtime";
import { PromoCardSkeleton } from "@/components/PromoCard";
import { PromoImage } from "@/components/PromoImage";
import { Footer } from "@/components/Footer";
import type { Promo, Categoria } from "@/types/promo";
import { Flame, Zap, TrendingUp, Medal, Bell } from "lucide-react";
import { CAMPOS_CARD } from "@/lib/promo-campos";
import { formatarPreco, formatarDesconto } from "@/lib/utils";
import { labelTemperatura } from "@/lib/temperatura";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

interface SearchParams {
  categoria?: string;
  loja?: string;
  busca?: string;
  hot?: string;
  pagina?: string;
  ordem?: string;   // recentes | quentes | desconto | preco_asc | preco_desc
  pmin?: string;    // preço mínimo
  pmax?: string;    // preço máximo
}

// Aplica a ordenação escolhida na query (default: mais recentes)
function aplicarOrdem<T>(query: T, ordem?: string): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any;
  switch (ordem) {
    case "quentes":
      return q.order("temperatura", { ascending: false, nullsFirst: false });
    case "desconto":
      return q.order("desconto_pct", { ascending: false, nullsFirst: false });
    case "preco_asc":
      return q.order("preco_promo", { ascending: true });
    case "preco_desc":
      return q.order("preco_promo", { ascending: false });
    default: // recentes
      return q.order("criado_em", { ascending: false });
  }
}

async function getPromos(params: SearchParams): Promise<Promo[]> {
  const supabase = createServiceRoleClient();

  let query = supabase
    .from("promos")
    .select(CAMPOS_CARD)
    .eq("ativo", true)
    .or("expira_em.is.null,expira_em.gt." + new Date().toISOString());

  if (params.categoria) query = query.eq("categoria", params.categoria);
  if (params.loja)      query = query.eq("loja", params.loja);
  if (params.busca)     query = query.ilike("titulo", `%${params.busca}%`);
  if (params.hot === "true") query = query.gt("cliques", 20);

  // Faixa de preço
  const pmin = parseFloat(params.pmin ?? "");
  const pmax = parseFloat(params.pmax ?? "");
  if (Number.isFinite(pmin)) query = query.gte("preco_promo", pmin);
  if (Number.isFinite(pmax)) query = query.lte("preco_promo", pmax);

  // Ordenação (hot ainda prioriza cliques)
  query = params.hot === "true"
    ? query.order("cliques", { ascending: false })
    : aplicarOrdem(query, params.ordem);

  const { data } = await query.limit(40);
  return (data ?? []) as Promo[];
}

// Promo em destaque no hero: a mais quente do momento (temperatura + cliques)
async function getPromoDestaque(): Promise<Promo | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("promos")
    .select(CAMPOS_CARD)
    .eq("ativo", true)
    .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
    .not("temperatura", "is", null)
    .order("temperatura", { ascending: false })
    .order("cliques", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as Promo) ?? null;
}

async function getCategorias(): Promise<Categoria[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("categorias")
    .select("*")
    .order("ordem");
  return (data ?? []) as Categoria[];
}

async function getStats() {
  const supabase = createServiceRoleClient();
  const { count: totalPromos } = await supabase
    .from("promos")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true);

  const { count: promasHoje } = await supabase
    .from("promos")
    .select("*", { count: "exact", head: true })
    .eq("ativo", true)
    .gte("criado_em", new Date(Date.now() - 86400000).toISOString());

  return { totalPromos: totalPromos ?? 0, promasHoje: promasHoje ?? 0 };
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <PromoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isHot = params.hot === "true";
  const temFiltro = params.categoria || params.loja || params.busca || isHot;
  // Home "limpa" (sem filtro/ordenação): mostra o hero com a promo destaque
  const home = !temFiltro && !params.ordem && !params.pmin && !params.pmax;

  const [promos, categorias, stats, destaque] = await Promise.all([
    getPromos(params),
    getCategorias(),
    getStats(),
    home ? getPromoDestaque() : Promise.resolve(null),
  ]);

  // O destaque já aparece grande no hero — tira do grid pra não duplicar
  const promosGrid = destaque ? promos.filter((p) => p.id !== destaque.id) : promos;
  const tempDestaque = destaque ? labelTemperatura(destaque.temperatura ?? null) : null;

  // JSON-LD: lista de ofertas (ajuda o Google a indexar o feed)
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apenaspromo.com.br";
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: promos.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${APP_URL}/promo/${p.id}`,
      name: p.titulo,
    })),
  };

  return (
    <div className="min-h-screen">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">

        {/* Hero — só aparece na página inicial sem filtros */}
        {!temFiltro && (
          <div className="relative overflow-hidden rounded-2xl border border-white/5 p-6 sm:p-8">
            {/* Fundo gradiente */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950/60 via-[#0a0a0f] to-purple-950/20 pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className={`relative grid grid-cols-1 gap-6 items-center ${destaque ? "lg:grid-cols-[1fr,340px]" : ""}`}>
              {/* Coluna texto + stats */}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                  🔥 Promos do{" "}
                  <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
                    Momento
                  </span>
                </h1>
                <p className="text-gray-400 mt-1 text-sm">
                  Atualizadas em tempo real • Sem frescura, só desconto
                </p>

                {/* Stats */}
                <div className="flex gap-4 mt-5">
                  <div>
                    <p className="text-xl font-extrabold text-brand-400">{stats.totalPromos}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp size={11} /> Ativas
                    </p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div>
                    <p className="text-xl font-extrabold text-green-400">{stats.promasHoje}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Zap size={11} /> Hoje
                    </p>
                  </div>
                </div>

                {/* Atalhos */}
                <div className="flex flex-wrap gap-2 mt-5">
                  <Link
                    href="/ranking"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 hover:bg-yellow-500/20 transition-all"
                  >
                    <Medal size={12} /> Ranking
                  </Link>
                  <Link
                    href="/alertas"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-500/10 border border-brand-500/25 text-brand-400 hover:bg-brand-500/20 transition-all"
                  >
                    <Bell size={12} /> Criar alerta
                  </Link>
                </div>
              </div>

              {/* Promo mais quente do momento */}
              {destaque && (
                <Link
                  href={`/promo/${destaque.id}`}
                  className="group relative block rounded-2xl overflow-hidden border border-brand-500/25 bg-black/30 hover:border-brand-500/60 hover:shadow-glow-orange transition-all"
                >
                  <div className="relative aspect-[16/9] lg:aspect-[4/3]">
                    <PromoImage
                      src={destaque.imagem_url}
                      alt={destaque.titulo}
                      loja={destaque.loja}
                      sizes="(max-width: 1024px) 100vw, 340px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                    {/* Selo destaque */}
                    <span className="absolute top-3 left-3 badge-hot animate-badge-pop">
                      <Flame size={10} /> MAIS QUENTE AGORA
                    </span>
                    {destaque.desconto_pct && destaque.desconto_pct > 0 && (
                      <span className="absolute top-3 right-3 badge-desconto">
                        {formatarDesconto(destaque.desconto_pct)}
                      </span>
                    )}

                    {/* Info no rodapé da imagem */}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-display text-sm font-bold text-white line-clamp-2 group-hover:text-brand-300 transition-colors">
                        {destaque.titulo}
                      </p>
                      <div className="flex items-end justify-between gap-2 mt-1.5">
                        <div className="flex items-end gap-2">
                          <span className="text-xl font-extrabold text-brand-400">
                            {formatarPreco(destaque.preco_promo)}
                          </span>
                          {destaque.preco_original && destaque.preco_original > destaque.preco_promo && (
                            <span className="text-xs text-gray-400 line-through mb-0.5">
                              {formatarPreco(destaque.preco_original)}
                            </span>
                          )}
                        </div>
                        {tempDestaque && (
                          <span className={`text-[11px] font-semibold ${tempDestaque.cor} whitespace-nowrap`}>
                            {tempDestaque.emoji} {tempDestaque.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Título quando há filtro ativo */}
        {isHot && (
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-red-400" />
            <h2 className="text-xl font-bold text-white">Promos em Alta</h2>
          </div>
        )}
        {params.busca && (
          <div>
            <h2 className="text-xl font-bold text-white">
              Resultados para{" "}
              <span className="text-brand-400">&quot;{params.busca}&quot;</span>
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {promos.length} resultado{promos.length !== 1 ? "s" : ""} encontrado{promos.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Navegação por categoria */}
        <Suspense fallback={<div className="h-9 shimmer rounded-xl" />}>
          <CategoriaNav categorias={categorias} />
        </Suspense>

        {/* Filtros: ordenação + faixa de preço */}
        <Suspense fallback={<div className="h-9 shimmer rounded-xl w-64" />}>
          <FiltrosFeed />
        </Suspense>

        {/* Grid de promos */}
        <Suspense fallback={<GridSkeleton />}>
          <PromoFeedRealtime promosIniciais={promosGrid} categoria={params.categoria} />
        </Suspense>

      </main>

      <Footer />
    </div>
  );
}
