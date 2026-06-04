"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import { Bell, ArrowLeft, TrendingDown, Tag } from "lucide-react";

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

function iconeTipo(tipo: string) {
  if (tipo === "queda_preco") return <TrendingDown size={16} className="text-green-400" />;
  if (tipo === "keyword") return <Tag size={16} className="text-brand-400" />;
  return <Bell size={16} className="text-gray-400" />;
}

export default function NotificacoesPage() {
  const { user, loading: authLoading } = useAuth();
  const [notifs, setNotifs] = useState<Notificacao[] | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setNotifs([]); return; }
    fetch("/api/notificacoes")
      .then((r) => r.json())
      .then((d) => setNotifs(d.notificacoes ?? []))
      .catch(() => setNotifs([]));
    // marca como lidas ao abrir a página
    fetch("/api/notificacoes/ler", { method: "POST" }).catch(() => {});
  }, [user, authLoading]);

  return (
    <div className="min-h-screen">
      <Header />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> Voltar ao feed
        </Link>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-amber-500/20 border border-brand-500/20 flex items-center justify-center">
              <Bell size={20} className="text-brand-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Notificações</h1>
              <p className="text-sm text-gray-500">Quedas de preço e promos dos seus alertas</p>
            </div>
          </div>
          <Link href="/alertas" className="text-sm text-brand-400 hover:text-brand-300 shrink-0">
            Gerenciar alertas
          </Link>
        </div>

        {!authLoading && !user ? (
          <div className="glass-card p-10 text-center space-y-4">
            <Bell size={32} className="text-brand-400/50 mx-auto" />
            <p className="text-gray-300 font-medium">Entre para ver suas notificações</p>
            <button onClick={() => setShowLogin(true)} className="btn-promo w-auto px-6 mx-auto">Entrar</button>
          </div>
        ) : notifs === null ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 shimmer rounded-2xl" />)}
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p className="text-5xl mb-4">🔕</p>
            <p className="text-lg font-medium text-gray-400">Nenhuma notificação ainda</p>
            <p className="text-sm mt-1">Salve promos e crie alertas de palavra-chave pra ser avisado.</p>
            <Link href="/alertas" className="btn-promo w-auto px-6 mx-auto mt-6 inline-flex">Criar um alerta</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifs.map((n) => {
              const card = (
                <div className={`glass-card p-4 flex gap-3 items-start transition-colors ${n.promo_id ? "hover:bg-white/[0.06]" : ""}`}>
                  <div className="shrink-0 mt-0.5">{iconeTipo(n.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-200">{n.titulo}</p>
                    {n.corpo && <p className="text-sm text-gray-400 mt-0.5">{n.corpo}</p>}
                    <p className="text-xs text-gray-600 mt-1">{tempoRel(n.criado_em)}</p>
                  </div>
                </div>
              );
              return n.promo_id ? (
                <Link key={n.id} href={`/promo/${n.promo_id}`}>{card}</Link>
              ) : (
                <div key={n.id}>{card}</div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
