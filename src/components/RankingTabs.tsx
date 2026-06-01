"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, Trophy } from "lucide-react";
import { nivelDoXp } from "@/lib/gamificacao";
import type { RankingUsuario } from "@/types/promo";

function medalha(pos: number): string | null {
  return pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
}

export function CacadoresTab() {
  const [ranking, setRanking] = useState<RankingUsuario[] | null>(null);

  useEffect(() => {
    fetch("/api/ranking/usuarios")
      .then((r) => r.json())
      .then((d) => setRanking(d.ranking ?? []))
      .catch(() => setRanking([]));
  }, []);

  if (ranking === null) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg">Nenhum caçador pontuou ainda</p>
        <p className="text-sm mt-1">Poste promos e receba votos 🔥 pra subir no ranking!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {ranking.map((u, i) => {
        const pos = i + 1;
        const med = medalha(pos);
        const { nivel } = nivelDoXp(u.xp_total);
        const nome = u.nome ?? "Caçador";

        return (
          <Link
            key={u.user_id}
            href={`/usuario/${u.user_id}`}
            className={`group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all ${
              pos <= 3 ? "ring-1 ring-yellow-400/20" : ""
            }`}
          >
            {/* Posição */}
            <div className="shrink-0 w-9 text-center font-extrabold text-sm text-gray-500">
              {med ?? `#${pos}`}
            </div>

            {/* Avatar */}
            {u.avatar_url ? (
              <Image
                src={u.avatar_url}
                alt={nome}
                width={40}
                height={40}
                className="rounded-full w-10 h-10 object-cover ring-1 ring-white/10 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {nome.slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Nome + nível */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-100 truncate group-hover:text-brand-400 transition-colors">
                {nome}
              </p>
              <p className={`text-xs font-medium ${nivel.cor} flex items-center gap-1`}>
                <span>{nivel.emoji}</span> {nivel.nome}
                <span className="text-gray-600 font-normal flex items-center gap-1 ml-1">
                  <Package size={10} /> {u.promos_aprovadas}
                </span>
              </p>
            </div>

            {/* XP */}
            <div className="shrink-0 text-right">
              <p className="text-lg font-extrabold text-amber-400 tabular-nums">{u.xp_total}</p>
              <p className="text-[10px] text-gray-600 -mt-0.5">XP</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Alternador de abas: Promos | Caçadores. Recebe o conteúdo de promos via slot.
export function RankingTabs({ promosSlot }: { promosSlot: React.ReactNode }) {
  const [aba, setAba] = useState<"promos" | "cacadores">("promos");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
        <button
          onClick={() => setAba("promos")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            aba === "promos" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Package size={14} /> Promos
        </button>
        <button
          onClick={() => setAba("cacadores")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            aba === "cacadores" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"
          }`}
        >
          <Trophy size={14} /> Top Caçadores
        </button>
      </div>

      {aba === "promos" ? promosSlot : <CacadoresTab />}
    </div>
  );
}
