"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

interface FavoritarButtonProps {
  promoId: string;
  variant?: "overlay" | "inline"; // overlay = ícone no card; inline = botão na página
}

export function FavoritarButton({ promoId, variant = "overlay" }: FavoritarButtonProps) {
  const { user } = useAuth();
  const [favoritado, setFavoritado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!user) { setFavoritado(false); return; }
    fetch(`/api/promos/${promoId}/favoritar`)
      .then((r) => r.json())
      .then((d) => setFavoritado(!!d.favoritado))
      .catch(() => {});
  }, [promoId, user]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { setShowLogin(true); return; }
    if (loading) return;

    const anterior = favoritado;
    setFavoritado(!anterior); // otimista
    setLoading(true);
    try {
      const res = await fetch(`/api/promos/${promoId}/favoritar`, { method: "POST" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setFavoritado(!!d.favoritado);
    } catch {
      setFavoritado(anterior); // reverte
    } finally {
      setLoading(false);
    }
  }

  if (variant === "inline") {
    return (
      <>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm transition-all ${
            favoritado
              ? "border-red-500/40 bg-red-500/10 text-red-400"
              : "border-white/10 text-gray-300 hover:text-white hover:border-white/20"
          }`}
        >
          <Heart size={15} className={favoritado ? "fill-red-400" : ""} />
          {favoritado ? "Salva" : "Salvar"}
        </button>
      </>
    );
  }

  // overlay (card)
  return (
    <>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <button
        onClick={toggle}
        disabled={loading}
        title={favoritado ? "Remover dos salvos" : "Salvar promo"}
        aria-label={favoritado ? "Remover dos salvos" : "Salvar promo"}
        className={`w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm border transition-all ${
          favoritado
            ? "bg-red-500/20 border-red-500/40 text-red-400"
            : "bg-black/50 border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30"
        }`}
      >
        <Heart size={15} className={favoritado ? "fill-red-400" : ""} />
      </button>
    </>
  );
}
