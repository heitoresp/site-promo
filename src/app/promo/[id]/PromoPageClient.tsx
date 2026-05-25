"use client";

import { useState } from "react";
import { ExternalLink, Copy, Tag, Share2 } from "lucide-react";

// ---- Botão "Pegar Promo" com contagem de cliques ----
export function PegarPromoButton({ promoId, link }: { promoId: string; link: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/promos/${promoId}/click`, { method: "PATCH" });
    } catch {
      // ignora erro silencioso
    } finally {
      setLoading(false);
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <button onClick={handleClick} disabled={loading} className="btn-promo">
      {loading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <ExternalLink size={16} />
          Pegar Promo Agora
        </>
      )}
    </button>
  );
}

// ---- Botão de copiar cupom ----
export function CupomButton({ cupom }: { cupom: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(cupom);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
      <div className="flex items-center gap-2">
        <Tag size={14} className="text-amber-400" />
        <span className="font-mono font-bold text-amber-300 tracking-widest text-sm">
          {cupom}
        </span>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
      >
        <Copy size={13} />
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

// ---- Botão de compartilhar no WhatsApp ----
export function ShareButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:border-white/20 transition-all"
    >
      <Share2 size={15} />
      Compartilhar no WhatsApp
    </a>
  );
}
