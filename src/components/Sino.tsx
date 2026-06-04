"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  promo_id: string | null;
  lida: boolean;
  criado_em: string;
}

function tempoRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function Sino() {
  const { user, loading } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [notifs, setNotifs] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  const carregar = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch("/api/notificacoes");
      const d = await r.json();
      setNotifs(d.notificacoes ?? []);
      setNaoLidas(d.nao_lidas ?? 0);
    } catch {
      // silencioso
    }
  }, [user]);

  // Carrega ao logar + atualiza a cada 60s
  useEffect(() => {
    if (!user) { setNotifs([]); setNaoLidas(0); return; }
    carregar();
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [user, carregar]);

  async function abrir() {
    const vai = !aberto;
    setAberto(vai);
    // Ao abrir com não-lidas, marca tudo como lido
    if (vai && naoLidas > 0) {
      setNaoLidas(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
      try { await fetch("/api/notificacoes/ler", { method: "POST" }); } catch {}
    }
  }

  if (loading || !user) return null;

  return (
    <div className="relative shrink-0">
      <button
        onClick={abrir}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all"
        title="Notificações"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] glass-card shadow-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Notificações</span>
              <Link
                href="/notificacoes"
                onClick={() => setAberto(false)}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Ver todas
              </Link>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  <Bell size={24} className="mx-auto mb-2 text-gray-600" />
                  Nenhuma notificação ainda.
                  <p className="text-xs mt-1 text-gray-600">
                    Salve promos e crie alertas pra ser avisado!
                  </p>
                </div>
              ) : (
                notifs.slice(0, 12).map((n) => {
                  const conteudo = (
                    <div className="px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                      <p className="text-sm font-semibold text-gray-200">{n.titulo}</p>
                      {n.corpo && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.corpo}</p>}
                      <p className="text-[10px] text-gray-600 mt-1">{tempoRel(n.criado_em)}</p>
                    </div>
                  );
                  return n.promo_id ? (
                    <Link key={n.id} href={`/promo/${n.promo_id}`} onClick={() => setAberto(false)} className="block">
                      {conteudo}
                    </Link>
                  ) : (
                    <div key={n.id}>{conteudo}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
