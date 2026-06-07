import { Suspense } from "react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { CategoriaNav } from "@/components/CategoriaNav";
import { FiltrosFeed } from "@/components/FiltrosFeed";
import { PromoFeedRealtime } from "@/components/PromoFeedRealtime";
import { PromoCardSkeleton } from "@/components/PromoCard";
import { Footer } from "@/components/Footer";
import type { Promo, Categoria } from "@/types/promo";
import { Flame, Zap, TrendingUp } from "lucide-react";
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
    .select("*")
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
  const [promos, categorias, stats] = await Promise.all([
    getPromos(params),
    getCategorias(),
    getStats(),
  ]);

  const isHot = params.hot === "true";
  const temFiltro = params.categoria || params.loja || params.busca || isHot;

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

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-brand-400">{stats.totalPromos}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp size={11} /> Ativas
                  </p>
                </div>
                <div className="w-px bg-white/5" />
                <div className="text-center">
                  <p className="text-xl font-extrabold text-green-400">{stats.promasHoje}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Zap size={11} /> Hoje
                  </p>
                </div>
              </div>
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
          <PromoFeedRealtime promosIniciais={promos} categoria={params.categoria} />
        </Suspense>

      </main>

      <Footer />
    </div>
  );
}
