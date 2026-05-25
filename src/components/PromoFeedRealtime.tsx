"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PromoCard } from "./PromoCard";
import type { Promo } from "@/types/promo";
import { Sparkles } from "lucide-react";

interface PromoFeedRealtimeProps {
  promosIniciais: Promo[];
  categoria?: string;
}

export function PromoFeedRealtime({ promosIniciais, categoria }: PromoFeedRealtimeProps) {
  const [promos, setPromos] = useState<Promo[]>(promosIniciais);
  const [novaPromo, setNovaPromo] = useState<Promo | null>(null);

  // Sincroniza quando o filtro de categoria muda (navegação client-side)
  useEffect(() => {
    setPromos(promosIniciais);
    setNovaPromo(null);
  }, [promosIniciais]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("promos-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "promos",
          filter: "ativo=eq.true",
        },
        (payload) => {
          const nova = payload.new as Promo;
          // Só adiciona se for da categoria atual (ou se não houver filtro)
          if (!categoria || nova.categoria === categoria) {
            setNovaPromo(nova);
            setPromos((prev) => [nova, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoria]);

  return (
    <div>
      {/* Toast de nova promo */}
      {novaPromo && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold shadow-glow-orange animate-slide-up cursor-pointer"
          onClick={() => {
            setNovaPromo(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Sparkles size={16} />
          Nova promo chegando! ↑
        </div>
      )}

      {/* Grid de promos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {promos.map((promo) => (
          <PromoCard key={promo.id} promo={promo} />
        ))}
      </div>

      {promos.length === 0 && (
        <div className="text-center py-24 text-gray-500">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium text-gray-400">Nenhuma promo encontrada</p>
          <p className="text-sm mt-1">Tente ajustar os filtros ou volte mais tarde</p>
        </div>
      )}
    </div>
  );
}
