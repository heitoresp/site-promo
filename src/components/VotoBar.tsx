"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

type Tipo = "quente" | "frio";

interface Contagens {
  quente: number;
  frio: number;
}

interface VotoBarProps {
  promoId: string;
  compact?: boolean;       // versão enxuta pro PromoCard
  onTemperatura?: (t: number | null) => void; // notifica o pai quando a nota muda
}

export function VotoBar({ promoId, compact = false, onTemperatura }: VotoBarProps) {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const [contagens, setContagens] = useState<Contagens>({ quente: 0, frio: 0 });
  const [meuVoto, setMeuVoto]     = useState<Tipo | null>(null);
  const [carregando, setCarregando] = useState<Tipo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/promos/${promoId}/votar`)
      .then((r) => r.json())
      .then((data) => {
        setContagens(data.contagens ?? { quente: 0, frio: 0 });
        setMeuVoto(data.meuVoto ?? null);
        if (onTemperatura) onTemperatura(data.temperatura ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoId]);

  async function handleVoto(tipo: Tipo) {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (carregando) return;

    // Atualização otimista
    const votoAnterior = meuVoto;
    const contagensAnterior = { ...contagens };
    const novas = { ...contagens };

    if (votoAnterior) novas[votoAnterior]--;
    if (votoAnterior === tipo) {
      setMeuVoto(null);            // toggle off
    } else {
      novas[tipo]++;
      setMeuVoto(tipo);
    }
    setContagens(novas);
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
      if (onTemperatura) onTemperatura(data.temperatura ?? null);
    } catch {
      setContagens(contagensAnterior);
      setMeuVoto(votoAnterior);
    } finally {
      setCarregando(null);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`shimmer rounded-lg ${compact ? "h-7 w-16" : "h-9 w-24"}`} />
        <div className={`shimmer rounded-lg ${compact ? "h-7 w-16" : "h-9 w-24"}`} />
      </div>
    );
  }

  const tam = compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const icon = compact ? 13 : 15;

  return (
    <>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <div className="flex items-center gap-1.5">
        {/* 👍 Quente */}
        <button
          onClick={() => handleVoto("quente")}
          disabled={carregando !== null}
          title="Tô dentro — boa promo"
          className={`
            flex items-center gap-1.5 rounded-lg border font-bold transition-all duration-150 select-none ${tam}
            ${meuVoto === "quente"
              ? "bg-green-500/15 border-green-500/40 text-green-400 scale-105"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-green-400 hover:border-green-500/30"}
            ${carregando === "quente" ? "opacity-60 scale-95" : "hover:scale-105 active:scale-95"}
            disabled:cursor-default
          `}
        >
          <ThumbsUp size={icon} />
          <span className="tabular-nums">{contagens.quente}</span>
        </button>

        {/* 👎 Frio */}
        <button
          onClick={() => handleVoto("frio")}
          disabled={carregando !== null}
          title="Não vale a pena"
          className={`
            flex items-center gap-1.5 rounded-lg border font-bold transition-all duration-150 select-none ${tam}
            ${meuVoto === "frio"
              ? "bg-blue-500/15 border-blue-500/40 text-blue-400 scale-105"
              : "bg-white/5 border-white/10 text-gray-400 hover:text-blue-400 hover:border-blue-500/30"}
            ${carregando === "frio" ? "opacity-60 scale-95" : "hover:scale-105 active:scale-95"}
            disabled:cursor-default
          `}
        >
          <ThumbsDown size={icon} />
          <span className="tabular-nums">{contagens.frio}</span>
        </button>
      </div>
    </>
  );
}
