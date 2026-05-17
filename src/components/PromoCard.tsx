"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ExternalLink, Copy, Flame, Sparkles, Clock, Share2,
  ShoppingBag, Tag
} from "lucide-react";
import type { Promo } from "@/types/promo";
import {
  formatarPreco, formatarDesconto, tempoRelativo, isNova, isExpirando, urlWhatsApp
} from "@/lib/utils";

interface PromoCardProps {
  promo: Promo;
}

export function PromoCard({ promo }: PromoCardProps) {
  const [copiado, setCopiado]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const nova      = isNova(promo.criado_em);
  const expirando = isExpirando(promo.expira_em);
  const isHot     = promo.is_hot || promo.cliques > 50;

  async function handlePegarPromo(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/promos/${promo.id}/click`, { method: "PATCH" });
      const { link } = await res.json();
      window.open(link, "_blank", "noopener,noreferrer");
    } catch {
      window.open(promo.link_afiliado, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  async function copiarCupom() {
    if (!promo.cupom) return;
    await navigator.clipboard.writeText(promo.cupom);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const imagemFallback = `https://placehold.co/400x300/16161f/f97316?text=${encodeURIComponent(promo.loja)}`;

  return (
    <article className="promo-card group animate-fade-in">
      {/* Badges no topo da imagem */}
      <div className="relative">
        <Link href={`/promo/${promo.id}`} className="block aspect-[4/3] overflow-hidden bg-black/30">
          <Image
            src={promo.imagem_url ?? imagemFallback}
            alt={promo.titulo}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={(e) => {
              (e.target as HTMLImageElement).src = imagemFallback;
            }}
          />
          {/* Overlay sutil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </Link>

        {/* Badges sobrepostos */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          {isHot && (
            <span className="badge-hot animate-badge-pop">
              <Flame size={10} />
              HOT
            </span>
          )}
          {nova && !isHot && (
            <span className="badge-nova animate-badge-pop">
              <Sparkles size={10} />
              NOVA
            </span>
          )}
          {expirando && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock size={10} />
              Expirando!
            </span>
          )}
        </div>

        {/* Badge de desconto */}
        {promo.desconto_pct && promo.desconto_pct > 0 && (
          <div className="absolute top-2 right-2">
            <span className="badge-desconto">
              {formatarDesconto(promo.desconto_pct)}
            </span>
          </div>
        )}

        {/* Badge da loja */}
        <div className="absolute bottom-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/70 text-gray-300 backdrop-blur-sm border border-white/10">
            <ShoppingBag size={10} />
            {promo.loja}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 flex flex-col gap-3">
        {/* Título */}
        <Link href={`/promo/${promo.id}`}>
          <h3 className="text-sm font-semibold text-gray-100 leading-snug line-clamp-2 hover:text-brand-400 transition-colors">
            {promo.titulo}
          </h3>
        </Link>

        {/* Preços */}
        <div className="flex items-end gap-2">
          <span className="preco-promo">
            {formatarPreco(promo.preco_promo)}
          </span>
          {promo.preco_original && promo.preco_original > promo.preco_promo && (
            <span className="preco-original mb-0.5">
              {formatarPreco(promo.preco_original)}
            </span>
          )}
        </div>

        {/* Cupom */}
        {promo.cupom && (
          <button
            onClick={copiarCupom}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 transition-all group/cupom"
          >
            <div className="flex items-center gap-1.5">
              <Tag size={12} className="text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                {promo.cupom}
              </span>
            </div>
            <span className="text-xs text-amber-400/70 group-hover/cupom:text-amber-300 transition-colors">
              {copiado ? "✓ Copiado!" : <Copy size={12} />}
            </span>
          </button>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{tempoRelativo(promo.criado_em)}</span>
          <div className="flex items-center gap-3">
            {/* Compartilhar no WhatsApp */}
            <a
              href={urlWhatsApp(promo.titulo, `${process.env.NEXT_PUBLIC_APP_URL}/promo/${promo.id}`)}
              target="_blank"
              rel="noopener noreferrer"
              title="Compartilhar no WhatsApp"
              className="hover:text-green-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 size={13} />
            </a>
            {promo.cliques > 0 && (
              <span className="flex items-center gap-1">
                <Flame size={12} className={promo.cliques > 50 ? "text-red-400" : ""} />
                {promo.cliques}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handlePegarPromo}
          disabled={loading}
          className="btn-promo"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ExternalLink size={15} />
              Pegar Promo
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ============================================================
   SKELETON (loading placeholder)
   ============================================================ */
export function PromoCardSkeleton() {
  return (
    <div className="promo-card">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 shimmer rounded-md w-full" />
        <div className="h-4 shimmer rounded-md w-3/4" />
        <div className="h-7 shimmer rounded-md w-1/2" />
        <div className="h-10 shimmer rounded-xl w-full" />
      </div>
    </div>
  );
}
