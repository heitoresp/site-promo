import Link from "next/link";
import Image from "next/image";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import type { Promo } from "@/types/promo";
import { formatarPreco, formatarDesconto, tempoRelativo } from "@/lib/utils";
import { labelTemperatura } from "@/lib/temperatura";
import { Flame, ExternalLink, ShoppingBag, TrendingUp, Medal } from "lucide-react";

async function getRanking(): Promise<Promo[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("promos")
    .select("*")
    .eq("ativo", true)
    .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
    .not("temperatura", "is", null)
    .order("temperatura", { ascending: false })
    .order("cliques", { ascending: false })
    .limit(50);

  return (data ?? []) as Promo[];
}

// Cores/estilos por posição
function getPosMeta(pos: number) {
  if (pos === 1) return {
    medal: "🥇",
    ringColor: "ring-yellow-400/60",
    numColor: "text-yellow-400",
    numBg: "bg-yellow-400/10 border-yellow-400/30",
    glow: "shadow-[0_0_24px_rgba(250,204,21,0.2)]",
  };
  if (pos === 2) return {
    medal: "🥈",
    ringColor: "ring-gray-300/50",
    numColor: "text-gray-300",
    numBg: "bg-gray-300/10 border-gray-300/30",
    glow: "shadow-[0_0_18px_rgba(209,213,219,0.15)]",
  };
  if (pos === 3) return {
    medal: "🥉",
    ringColor: "ring-amber-600/50",
    numColor: "text-amber-600",
    numBg: "bg-amber-700/10 border-amber-700/30",
    glow: "shadow-[0_0_18px_rgba(180,83,9,0.15)]",
  };
  return {
    medal: null,
    ringColor: "ring-white/5",
    numColor: "text-gray-500",
    numBg: "bg-white/5 border-white/5",
    glow: "",
  };
}

function BarraTemperatura({ temp }: { temp: number }) {
  const cor =
    temp >= 80 ? "from-red-500 to-orange-400" :
    temp >= 60 ? "from-orange-500 to-amber-400" :
    temp >= 40 ? "from-amber-500 to-yellow-400" :
    "from-gray-600 to-gray-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${cor} transition-all`}
          style={{ width: `${temp}%` }}
        />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color: "inherit" }}>
        {temp}
      </span>
    </div>
  );
}

function RankingItem({ promo, posicao }: { promo: Promo; posicao: number }) {
  const meta = getPosMeta(posicao);
  const temp = labelTemperatura(promo.temperatura ?? null);
  const imagemFallback = `https://placehold.co/80x80/16161f/f97316?text=${encodeURIComponent(promo.loja)}`;

  return (
    <Link
      href={`/promo/${promo.id}`}
      className={`group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all ${meta.glow} ${posicao <= 3 ? `ring-1 ${meta.ringColor}` : ""}`}
    >
      {/* Posição */}
      <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center font-extrabold text-sm ${meta.numBg} ${meta.numColor}`}>
        {meta.medal ?? `#${posicao}`}
      </div>

      {/* Imagem */}
      <div className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-black/30 ring-1 ring-white/10">
        <Image
          src={promo.imagem_url ?? imagemFallback}
          alt={promo.titulo}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="56px"
          onError={(e) => { (e.target as HTMLImageElement).src = imagemFallback; }}
        />
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-gray-100 line-clamp-1 group-hover:text-brand-400 transition-colors">
          {promo.titulo}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShoppingBag size={10} />
            {promo.loja}
          </span>
          {promo.cliques > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Flame size={10} className={promo.cliques > 50 ? "text-red-400" : ""} />
                {promo.cliques} cliques
              </span>
            </>
          )}
          <span>·</span>
          <span>{tempoRelativo(promo.criado_em)}</span>
        </div>

        {/* Barra de temperatura */}
        <div className={`${temp.cor}`}>
          <BarraTemperatura temp={promo.temperatura ?? 50} />
        </div>
      </div>

      {/* Lado direito: preço + label */}
      <div className="shrink-0 text-right space-y-1.5">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-lg font-extrabold text-brand-400">
            {formatarPreco(promo.preco_promo)}
          </span>
          {promo.preco_original && promo.preco_original > promo.preco_promo && (
            <span className="text-xs text-gray-600 line-through">
              {formatarPreco(promo.preco_original)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          {promo.desconto_pct && promo.desconto_pct > 0 && (
            <span className="badge-desconto text-xs px-2 py-0.5">
              {formatarDesconto(promo.desconto_pct)}
            </span>
          )}
          <span className={`text-xs font-semibold ${temp.cor}`}>
            {temp.emoji} {temp.label}
          </span>
        </div>
      </div>

      {/* Ícone de navegação */}
      <ExternalLink size={14} className="shrink-0 text-gray-600 group-hover:text-brand-400 transition-colors" />
    </Link>
  );
}

// Top 3 em cards maiores
function PodiumCard({ promo, posicao }: { promo: Promo; posicao: number }) {
  const meta = getPosMeta(posicao);
  const temp = labelTemperatura(promo.temperatura ?? null);
  const imagemFallback = `https://placehold.co/400x300/16161f/f97316?text=${encodeURIComponent(promo.loja)}`;

  return (
    <Link
      href={`/promo/${promo.id}`}
      className={`group relative flex flex-col rounded-2xl border overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] transition-all ${meta.glow} ring-1 ${meta.ringColor} border-white/5`}
    >
      {/* Posição no topo */}
      <div className="absolute top-3 left-3 z-10">
        <span className={`flex items-center justify-center w-9 h-9 rounded-xl border text-xl ${meta.numBg}`}>
          {meta.medal}
        </span>
      </div>

      {/* Badge desconto */}
      {promo.desconto_pct && promo.desconto_pct > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <span className="badge-desconto">{formatarDesconto(promo.desconto_pct)}</span>
        </div>
      )}

      {/* Imagem */}
      <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
        <Image
          src={promo.imagem_url ?? imagemFallback}
          alt={promo.titulo}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, 33vw"
          onError={(e) => { (e.target as HTMLImageElement).src = imagemFallback; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/70 text-gray-300 backdrop-blur-sm border border-white/10">
            <ShoppingBag size={10} />
            {promo.loja}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 group-hover:text-brand-400 transition-colors">
          {promo.titulo}
        </h3>

        {/* Temperatura */}
        <div className={`${temp.cor} space-y-1`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span>{temp.emoji}</span>
            <span>{temp.label}</span>
          </div>
          <BarraTemperatura temp={promo.temperatura ?? 50} />
        </div>

        {/* Preço */}
        <div className="flex items-end gap-2">
          <span className="preco-promo">{formatarPreco(promo.preco_promo)}</span>
          {promo.preco_original && promo.preco_original > promo.preco_promo && (
            <span className="preco-original mb-0.5">{formatarPreco(promo.preco_original)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{tempoRelativo(promo.criado_em)}</span>
          {promo.cliques > 0 && (
            <span className="flex items-center gap-1">
              <Flame size={12} />
              {promo.cliques}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function RankingPage() {
  const promos = await getRanking();
  const top3 = promos.slice(0, 3);
  const resto = promos.slice(3);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/20 flex items-center justify-center">
            <Medal size={20} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              Ranking de Promos
              <TrendingUp size={18} className="text-brand-400" />
            </h1>
            <p className="text-sm text-gray-500">
              Ordenado por pontuação automática • Quanto maior, melhor o desconto
            </p>
          </div>
        </div>

        {promos.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">Nenhuma promo com pontuação ainda</p>
            <p className="text-sm mt-1">As pontuações são calculadas automaticamente ao cadastrar uma promo com preço original.</p>
          </div>
        ) : (
          <>
            {/* Pódio — Top 3 */}
            {top3.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  🏆 Pódio
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {top3.map((promo, i) => (
                    <PodiumCard key={promo.id} promo={promo} posicao={i + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Lista do restante */}
            {resto.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  📋 Ranking completo
                </h2>
                <div className="flex flex-col gap-2">
                  {resto.map((promo, i) => (
                    <RankingItem key={promo.id} promo={promo} posicao={i + 4} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/5 mt-16 py-8 text-center text-sm text-gray-600">
        <p>
          Feito com 🔥 •{" "}
          <a
            href="https://wa.me"
            className="hover:text-brand-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Receba promos no WhatsApp
          </a>
        </p>
      </footer>
    </div>
  );
}
