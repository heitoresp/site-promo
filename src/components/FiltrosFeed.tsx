"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowUpDown, SlidersHorizontal, X } from "lucide-react";

const ORDENS: { valor: string; label: string }[] = [
  { valor: "recentes",   label: "Mais recentes" },
  { valor: "quentes",    label: "Mais quentes 🔥" },
  { valor: "desconto",   label: "Maior desconto" },
  { valor: "preco_asc",  label: "Menor preço" },
  { valor: "preco_desc", label: "Maior preço" },
];

export function FiltrosFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const ordemAtual = searchParams.get("ordem") ?? "recentes";
  const [pmin, setPmin] = useState(searchParams.get("pmin") ?? "");
  const [pmax, setPmax] = useState(searchParams.get("pmax") ?? "");
  const [abrirPreco, setAbrirPreco] = useState(false);

  // Sincroniza inputs quando a URL muda por fora
  useEffect(() => {
    setPmin(searchParams.get("pmin") ?? "");
    setPmax(searchParams.get("pmax") ?? "");
  }, [searchParams]);

  function atualizar(mudancas: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const temPreco = !!(searchParams.get("pmin") || searchParams.get("pmax"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Ordenação */}
      <div className="relative">
        <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <select
          value={ordemAtual}
          onChange={(e) => atualizar({ ordem: e.target.value === "recentes" ? null : e.target.value })}
          className="search-input pl-9 pr-8 py-2 text-sm w-auto cursor-pointer appearance-none"
          aria-label="Ordenar promoções"
        >
          {ORDENS.map((o) => (
            <option key={o.valor} value={o.valor}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Botão de faixa de preço */}
      <button
        onClick={() => setAbrirPreco((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
          temPreco
            ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
            : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
        }`}
      >
        <SlidersHorizontal size={14} />
        Preço
        {temPreco && (
          <span className="text-xs">
            ({pmin ? `R$${pmin}` : "0"}–{pmax ? `R$${pmax}` : "∞"})
          </span>
        )}
      </button>

      {/* Limpar faixa de preço (quando ativa) */}
      {temPreco && (
        <button
          onClick={() => atualizar({ pmin: null, pmax: null })}
          className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 transition-colors"
          title="Limpar faixa de preço"
        >
          <X size={13} /> Limpar
        </button>
      )}

      {/* Painel de faixa de preço */}
      {abrirPreco && (
        <form
          onSubmit={(e) => { e.preventDefault(); atualizar({ pmin: pmin || null, pmax: pmax || null }); setAbrirPreco(false); }}
          className="w-full mt-1 flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 animate-fade-in"
        >
          <span className="text-xs text-gray-500">R$</span>
          <input
            type="number" inputMode="decimal" min="0" placeholder="mín"
            value={pmin} onChange={(e) => setPmin(e.target.value)}
            className="search-input py-1.5 w-24 text-sm"
          />
          <span className="text-gray-600">—</span>
          <span className="text-xs text-gray-500">R$</span>
          <input
            type="number" inputMode="decimal" min="0" placeholder="máx"
            value={pmax} onChange={(e) => setPmax(e.target.value)}
            className="search-input py-1.5 w-24 text-sm"
          />
          <button type="submit" className="btn-promo w-auto px-4 py-1.5 text-sm">Aplicar</button>
        </form>
      )}
    </div>
  );
}
