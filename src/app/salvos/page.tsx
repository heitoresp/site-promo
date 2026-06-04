"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PromoCard, PromoCardSkeleton } from "@/components/PromoCard";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import type { Promo } from "@/types/promo";
import { Heart, ArrowLeft } from "lucide-react";

export default function SalvosPage() {
  const { user, loading: authLoading } = useAuth();
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setPromos([]); return; }

    fetch("/api/usuarios/me/salvos")
      .then((r) => r.json())
      .then((d) => setPromos(d.promos ?? []))
      .catch(() => setPromos([]));
  }, [user, authLoading]);

  return (
    <div className="min-h-screen">
      <Header />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> Voltar ao feed
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/20 flex items-center justify-center">
            <Heart size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Promos salvas</h1>
            <p className="text-sm text-gray-500">As ofertas que você guardou pra ver depois</p>
          </div>
        </div>

        {/* Não logado */}
        {!authLoading && !user ? (
          <div className="glass-card p-10 text-center space-y-4">
            <Heart size={32} className="text-red-400/50 mx-auto" />
            <div>
              <p className="text-gray-300 font-medium">Entre para ver suas promos salvas</p>
              <p className="text-sm text-gray-500 mt-1">Salve ofertas tocando no ❤️ e encontre todas aqui.</p>
            </div>
            <button onClick={() => setShowLogin(true)} className="btn-promo w-auto px-6 mx-auto">
              Entrar
            </button>
          </div>
        ) : promos === null ? (
          // Carregando
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <PromoCardSkeleton key={i} />)}
          </div>
        ) : promos.length === 0 ? (
          // Vazio
          <div className="text-center py-24 text-gray-500">
            <p className="text-5xl mb-4">💔</p>
            <p className="text-lg font-medium text-gray-400">Nenhuma promo salva ainda</p>
            <p className="text-sm mt-1">Toque no ❤️ de uma promo pra guardá-la aqui.</p>
            <Link href="/" className="btn-promo w-auto px-6 mx-auto mt-6 inline-flex">
              Explorar promos
            </Link>
          </div>
        ) : (
          // Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {promos.map((p) => <PromoCard key={p.id} promo={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
