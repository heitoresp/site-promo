"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface Engajamento {
  quente: number;
  frio: number;
  meuVoto: "quente" | "frio" | null;
  favoritado: boolean;
}

interface Ctx {
  get: (promoId: string) => Engajamento | undefined;
  registrar: (promoId: string) => void; // card pede pra incluir seu id no próximo lote
  pronto: boolean;
}

const EngajamentoContext = createContext<Ctx | null>(null);

// Provider do feed: junta os IDs dos cards visíveis e faz UM fetch em lote.
export function EngajamentoProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<Record<string, Engajamento>>({});
  const [pronto, setPronto] = useState(false);
  const pendentes = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async () => {
    const ids = [...pendentes.current];
    pendentes.current.clear();
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/promos/engajamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const d = await res.json();
      setDados((prev) => ({ ...prev, ...(d.engajamento ?? {}) }));
    } catch {
      // silencioso — os cards caem no fetch individual
    } finally {
      setPronto(true);
    }
  }, []);

  // Agrupa registros num curto debounce → 1 request por render do feed
  const registrar = useCallback((promoId: string) => {
    if (dados[promoId]) return;
    pendentes.current.add(promoId);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(buscar, 50);
  }, [buscar, dados]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const get = useCallback((promoId: string) => dados[promoId], [dados]);

  return (
    <EngajamentoContext.Provider value={{ get, registrar, pronto }}>
      {children}
    </EngajamentoContext.Provider>
  );
}

// Hook: distingue 3 casos pro componente saber o que fazer:
//   temProvider=false  → página isolada: o componente faz o próprio fetch
//   temProvider=true, data=null → no feed, ainda carregando: aguarda
//   temProvider=true, data=obj  → no feed, pronto: usa os dados do lote
export function useEngajamento(promoId: string): { temProvider: boolean; data: Engajamento | null } {
  const ctx = useContext(EngajamentoContext);
  useEffect(() => {
    if (ctx) ctx.registrar(promoId);
  }, [ctx, promoId]);
  return { temProvider: !!ctx, data: ctx?.get(promoId) ?? null };
}
