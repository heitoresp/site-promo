"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

type Tipo = "stonks" | "super_stonks" | "not_stonks";

interface Contagens {
  stonks: number;
  super_stonks: number;
  not_stonks: number;
}

interface StonksBarProps {
  promoId: string;
  compact?: boolean; // versão compacta pro PromoCard
}

const BOTOES: {
  tipo: Tipo;
  emoji: string;
  label: string;
  labelCompact: string;
  cor: string;
  corAtivo: string;
  bgAtivo: string;
  borderAtivo: string;
}[] = [
  {
    tipo: "stonks",
    emoji: "📈",
    label: "STONKS",
    labelCompact: "STONKS",
    cor: "text-gray-400 hover:text-green-400",
    corAtivo: "text-green-400",
    bgAtivo: "bg-green-500/15",
    borderAtivo: "border-green-500/40",
  },
  {
    tipo: "super_stonks",
    emoji: "🚀",
    label: "SUPER STONKS",
    labelCompact: "SUPER",
    cor: "text-gray-400 hover:text-yellow-400",
    corAtivo: "text-yellow-400",
    bgAtivo: "bg-yellow-500/15",
    borderAtivo: "border-yellow-500/40",
  },
  {
    tipo: "not_stonks",
    emoji: "📉",
    label: "NOT STONKS",
    labelCompact: "NOT",
    cor: "text-gray-400 hover:text-red-400",
    corAtivo: "text-red-400",
    bgAtivo: "bg-red-500/15",
    borderAtivo: "border-red-500/40",
  },
];

export function StonksBar({ promoId, compact = false }: StonksBarProps) {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [contagens, setContagens] = useState<Contagens>({
    stonks: 0,
    super_stonks: 0,
    not_stonks: 0,
  });
  const [meuVoto, setMeuVoto] = useState<Tipo | null>(null);
  const [carregando, setCarregando] = useState<Tipo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/promos/${promoId}/votar`)
      .then((r) => r.json())
      .then((data) => {
        setContagens(data.contagens);
        setMeuVoto(data.meuVoto);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [promoId]);

  async function handleVoto(tipo: Tipo) {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (carregando) return;

    // Otimista
    const votoAnterior = meuVoto;
    const contagensAnterior = { ...contagens };

    const novasContagens = { ...contagens };
    if (votoAnterior) novasContagens[votoAnterior]--;
    if (votoAnterior === tipo) {
      setMeuVoto(null);
    } else {
      novasContagens[tipo]++;
      setMeuVoto(tipo);
    }
    setContagens(novasContagens);
    setCarregando(tipo);

    try {
      const res = await fetch(`/api/promos/${promoId}/votar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setContagens(data.contagens);
      setMeuVoto(data.voto);
    } catch {
      // Reverte em caso de erro
      setContagens(contagensAnterior);
      setMeuVoto(votoAnterior);
    } finally {
      setCarregando(null);
    }
  }

  if (!loaded) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "py-1"}`}>
        {BOTOES.map((b) => (
          <div key={b.tipo} className="h-7 w-16 shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
    {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    <div className={`flex items-center gap-1.5 ${compact ? "" : "py-1"}`}>
      {BOTOES.map((btn) => {
        const ativo = meuVoto === btn.tipo;
        const count = contagens[btn.tipo];

        return (
          <button
            key={btn.tipo}
            onClick={() => handleVoto(btn.tipo)}
            disabled={carregando !== null}
            title={btn.label}
            className={`
              flex items-center gap-1 rounded-lg border transition-all duration-150 font-bold select-none
              ${compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs"}
              ${ativo
                ? `${btn.bgAtivo} ${btn.borderAtivo} ${btn.corAtivo} scale-105`
                : `bg-white/5 border-white/10 ${btn.cor}`
              }
              ${carregando === btn.tipo ? "opacity-60 scale-95" : "hover:scale-105 active:scale-95"}
              disabled:cursor-default
            `}
          >
            <span className={compact ? "text-sm" : "text-base"}>
              {btn.emoji}
            </span>
            <span className="tabular-nums">
              {compact ? btn.labelCompact : btn.label}
            </span>
            {count > 0 && (
              <span
                className={`
                  ml-0.5 min-w-[16px] text-center rounded-full px-1
                  ${ativo ? "font-extrabold" : "font-medium opacity-70"}
                `}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
    </>
  );
}
