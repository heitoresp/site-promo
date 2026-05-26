import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import type { Promo } from "@/types/promo";
import {
  formatarPreco, formatarDesconto, tempoRelativo, isNova, urlWhatsApp
} from "@/lib/utils";
import { ArrowLeft, Flame, Sparkles, ShoppingBag, Clock } from "lucide-react";
import { PegarPromoButton, CupomButton, ShareButton } from "./PromoPageClient";
import { ReportButton } from "@/components/ReportButton";
import { ComentariosSection } from "@/components/ComentariosSection";
import { StonksBar } from "@/components/StonksBar";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPromo(id: string): Promise<Promo | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("promos")
    .select("*")
    .eq("id", id)
    .eq("ativo", true)
    .single();
  return data as Promo | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const promo = await getPromo(id);

  if (!promo) return { title: "Promo não encontrada" };

  return {
    title: `${promo.titulo} — ${formatarPreco(promo.preco_promo)}`,
    description:
      promo.descricao ||
      `${promo.titulo} por apenas ${formatarPreco(promo.preco_promo)}${
        promo.desconto_pct ? ` (${formatarDesconto(promo.desconto_pct)} off)` : ""
      }`,
    openGraph: {
      images: promo.imagem_url ? [{ url: promo.imagem_url }] : [],
      type: "website",
    },
  };
}

export default async function PromoPage({ params }: PageProps) {
  const { id } = await params;
  const promo = await getPromo(id);

  if (!promo) notFound();

  const nova = isNova(promo.criado_em);

  // Schema.org para SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: promo.titulo,
    description: promo.descricao,
    image: promo.imagem_url,
    offers: {
      "@type": "Offer",
      price: promo.preco_promo,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: promo.link_afiliado,
    },
  };

  return (
    <div className="min-h-screen">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        {/* Voltar */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Voltar às promos
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Imagem */}
          <div className="relative">
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/5 bg-black/30">
              {promo.imagem_url ? (
                <Image
                  src={promo.imagem_url}
                  alt={promo.titulo}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <ShoppingBag size={64} />
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {promo.cliques > 50 && (
                <span className="badge-hot"><Flame size={11} /> HOT</span>
              )}
              {nova && (
                <span className="badge-nova"><Sparkles size={11} /> NOVA</span>
              )}
            </div>
          </div>

          {/* Detalhes */}
          <div className="flex flex-col gap-5">
            {/* Loja e categoria */}
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                {promo.loja}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                {promo.categoria}
              </span>
            </div>

            {/* Título */}
            <h1 className="text-xl sm:text-2xl font-bold text-white leading-snug">
              {promo.titulo}
            </h1>

            {/* Preços */}
            <div className="flex items-center gap-3">
              <span className="preco-promo text-3xl">{formatarPreco(promo.preco_promo)}</span>
              {promo.preco_original && promo.preco_original > promo.preco_promo && (
                <>
                  <span className="preco-original text-base">
                    {formatarPreco(promo.preco_original)}
                  </span>
                  {promo.desconto_pct && (
                    <span className="badge-desconto">
                      {formatarDesconto(promo.desconto_pct)}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Cupom */}
            {promo.cupom && (
              <CupomButton cupom={promo.cupom} />
            )}

            {/* Descrição */}
            {promo.descricao && (
              <p className="text-sm text-gray-400 leading-relaxed">{promo.descricao}</p>
            )}

            {/* Expiração */}
            {promo.expira_em && (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Clock size={13} />
                Expira em {tempoRelativo(promo.expira_em)}
              </div>
            )}

            {/* Votação Stonks */}
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">O que você acha dessa promo?</p>
              <StonksBar promoId={promo.id} />
            </div>

            {/* Engajamento */}
            <div className="text-xs text-gray-600 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>Postada {tempoRelativo(promo.criado_em)}</span>
                {promo.cliques > 0 && (
                  <span className="flex items-center gap-1">
                    <Flame size={12} /> {promo.cliques} cliques
                  </span>
                )}
              </div>
              <ReportButton promoId={promo.id} />
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3 mt-auto">
              <PegarPromoButton promoId={promo.id} link={promo.link_afiliado} />

              <ShareButton
                href={urlWhatsApp(promo.titulo, `${process.env.NEXT_PUBLIC_APP_URL}/promo/${promo.id}`)}
              />
            </div>
          </div>
        </div>

        {/* Comentários */}
        <div className="mt-8 border-t border-white/5 pt-8">
          <ComentariosSection promoId={promo.id} />
        </div>
      </main>
    </div>
  );
}

