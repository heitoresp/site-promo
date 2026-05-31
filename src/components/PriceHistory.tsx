"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Trophy, Search, ExternalLink, Info,
} from "lucide-react";
import { formatarPreco } from "@/lib/utils";
import type { HistoricoPreco, HistoricoPrecoStats } from "@/types/promo";

interface PriceHistoryProps {
  promoId: string;
  titulo: string;
  precoAtual: number;
}

// Data curta no padrão "31 mai"
function dataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function PriceHistory({ promoId, titulo, precoAtual }: PriceHistoryProps) {
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [stats, setStats] = useState<HistoricoPrecoStats | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/promos/${promoId}/historico`);
      if (res.ok) {
        const data = await res.json();
        setHistorico(data.historico ?? []);
        setStats(data.stats ?? null);
      }
    } catch {
      // falha silenciosa — mantém só a comparação externa
    } finally {
      setLoading(false);
    }
  }, [promoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Links de comparação externos ("baseado no Google" + Buscapé)
  const q = encodeURIComponent(titulo);
  const googleShoppingUrl = `https://www.google.com/search?tbm=shop&hl=pt-BR&gl=BR&q=${q}`;
  const buscapeUrl = `https://www.buscape.com.br/search?q=${q}`;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
        <LineChart size={20} className="text-brand-400" />
        Histórico de preço
      </h2>

      {loading ? (
        <div className="h-56 shimmer rounded-2xl" />
      ) : (
        <>
          {/* Banner: menor preço já registrado */}
          {stats?.eh_menor_preco && historico.length >= 2 && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-semibold">
              <Trophy size={16} />
              Menor preço já registrado — boa hora pra comprar!
            </div>
          )}

          {/* Cards de estatística */}
          {stats && (
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <StatCard
                label="Menor preço"
                valor={formatarPreco(stats.menor)}
                sub={`em ${dataCurta(stats.menor_em)}`}
                destaque="verde"
              />
              <StatCard
                label="Preço atual"
                valor={formatarPreco(stats.atual)}
                sub={
                  stats.economia_vs_maior > 0
                    ? `${stats.economia_vs_maior}% abaixo do pico`
                    : "preço de pico"
                }
                destaque="laranja"
              />
              <StatCard
                label="Maior preço"
                valor={formatarPreco(stats.maior)}
                sub="já registrado"
              />
            </div>
          )}

          {/* Gráfico (precisa de pelo menos 2 pontos) */}
          {historico.length >= 2 ? (
            <PriceChart historico={historico} menor={stats?.menor} />
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-gray-400">
              <Info size={16} className="text-brand-400 mt-0.5 shrink-0" />
              <p>
                Começamos a acompanhar o preço deste produto agora
                {historico.length === 1
                  ? ` (${formatarPreco(historico[0].preco_promo)}).`
                  : ` (${formatarPreco(precoAtual)}).`}{" "}
                O gráfico de evolução aparece assim que o preço mudar pela
                primeira vez. Enquanto isso, compare com outras lojas abaixo.
              </p>
            </div>
          )}

          {/* Comparação externa de preços */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">
              Compare o preço em outras lojas:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={googleShoppingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-brand-500/50 hover:bg-white/5 transition-all"
              >
                <Search size={15} />
                Comparar no Google Shopping
                <ExternalLink size={13} className="opacity-60" />
              </a>
              <a
                href={buscapeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-brand-500/50 hover:bg-white/5 transition-all"
              >
                <Search size={15} />
                Comparar no Buscapé
                <ExternalLink size={13} className="opacity-60" />
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Card de estatística
   ============================================================ */
function StatCard({
  label,
  valor,
  sub,
  destaque,
}: {
  label: string;
  valor: string;
  sub?: string;
  destaque?: "verde" | "laranja";
}) {
  const corValor =
    destaque === "verde"
      ? "text-green-400"
      : destaque === "laranja"
      ? "text-brand-400"
      : "text-gray-200";

  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-center">
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      <p className={`text-sm sm:text-base font-extrabold mt-1 ${corValor}`}>{valor}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{sub}</p>}
    </div>
  );
}

/* ============================================================
   Gráfico SVG do histórico de preços (sem dependências)
   ============================================================ */
function PriceChart({
  historico,
  menor,
}: {
  historico: HistoricoPreco[];
  menor?: number;
}) {
  const W = 640;
  const H = 200;
  const padT = 16;
  const padR = 14;
  const padB = 28;
  const padL = 14;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const baseY = padT + innerH;

  const precos = historico.map((h) => h.preco_promo);
  const pMin = Math.min(...precos);
  const pMax = Math.max(...precos);
  const span = pMax - pMin || pMax || 1; // evita linha achatada / divisão por zero

  const n = historico.length;
  const xFor = (i: number) =>
    padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yFor = (p: number) => padT + innerH * (1 - (p - pMin) / span);

  const pts = historico.map((h, i) => ({
    x: xFor(i),
    y: yFor(h.preco_promo),
    h,
    ehMenor: menor != null && h.preco_promo === menor,
    ehUltimo: i === n - 1,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${pts[n - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`;

  // Com muitos pontos, evita poluir: só desenha bolinhas-chave
  const showDots = n <= 40;
  const dotsRelevantes = pts.filter((p) => p.ehMenor || p.ehUltimo);

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Gráfico de evolução do preço ao longo do tempo"
      >
        <defs>
          <linearGradient id="precoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Linha de referência do menor preço */}
        {menor != null && (
          <line
            x1={padL}
            x2={W - padR}
            y1={yFor(menor)}
            y2={yFor(menor)}
            stroke="#22c55e"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.45"
          />
        )}

        {/* Área + linha */}
        <path d={areaPath} fill="url(#precoFill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#fb923c"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos */}
        {(showDots ? pts : dotsRelevantes).map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.ehMenor || p.ehUltimo ? 4 : 2.5}
            fill={p.ehMenor ? "#22c55e" : "#fb923c"}
            stroke="#0a0a0f"
            strokeWidth="1.5"
          >
            <title>
              {`${formatarPreco(p.h.preco_promo)} — ${dataCurta(p.h.registrado_em)}`}
            </title>
          </circle>
        ))}
      </svg>

      {/* Eixo X: primeira e última data */}
      <div className="flex justify-between text-[11px] text-gray-600 px-1 mt-1">
        <span>{dataCurta(historico[0].registrado_em)}</span>
        <span>Hoje</span>
      </div>
    </div>
  );
}
