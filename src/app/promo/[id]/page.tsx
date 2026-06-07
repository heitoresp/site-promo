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
import { VotoBar } from "@/components/VotoBar";
import { PriceHistory } from "@/components/PriceHistory";
import { NivelBadge } from "@/components/NivelBadge";
import { FavoritarButton } from "@/components/FavoritarButton";

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

interface Autor { user_id: string; nome: string | null; avatar_url: string | null; xp_total: number; }

async function getAutor(userId: string | null): Promise<Autor | null> {
  if (!userId) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("perfis")
    .select("user_id, nome, avatar_url, xp_total")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Autor) ?? null;
}

// Votos da promo — usados no aggregateRating do JSON-LD (só se houver votos)
async function getVotos(promoId: string): Promise<{ quente: number; frio: number }> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("votos").select("tipo").eq("promo_id", promoId);
  const c = { quente: 0, frio: 0 };
  for (const v of data ?? []) {
    if (v.tipo === "quente") c.quente++;
    else if (v.tipo === "frio") c.frio++;
  }
  return c;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apenaspromo.com.br";

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
    alternates: { canonical: `/promo/${id}` },
    openGraph: {
      title: `${promo.titulo} — ${formatarPreco(promo.preco_promo)}`,
      type: "website",
      // imagem OG gerada por opengraph-image.tsx (card rico com preço/desconto)
    },
  };
}

export default async function PromoPage({ params }: PageProps) {
  const { id } = await params;
  const promo = await getPromo(id);

  if (!promo) notFound();

  const [autor, votos] = await Promise.all([
    getAutor(promo.enviado_por ?? null),
    getVotos(promo.id),
  ]);
  const nova = isNova(promo.criado_em);

  // Validade da oferta = expiração, ou +30 dias por padrão
  const priceValidUntil = (
    promo.expira_em ? new Date(promo.expira_em) : new Date(Date.now() + 30 * 86400000)
  ).toISOString().split("T")[0];

  const totalVotos = votos.quente + votos.frio;

  // Schema.org Product — rico, para o rich result do Google
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: promo.titulo,
    description:
      promo.descricao ??
      `${promo.titulo} por ${formatarPreco(promo.preco_promo)} na ${promo.loja}.`,
    image: promo.imagem_url ? [promo.imagem_url] : undefined,
    brand: { "@type": "Brand", name: promo.loja },
    sku: promo.id,
    offers: {
      "@type": "Offer",
      price: promo.preco_promo,
      priceCurrency: "BRL",
      priceValidUntil,
      availability: "https://schema.org/InStock",
      url: `${APP_URL}/promo/${promo.id}`,
      seller: { "@type": "Organization", name: promo.loja },
    },
  };

  // aggregateRating só quando há votos reais (evita penalização do Google)
  if (totalVotos > 0) {
    const ratingValue = Math.round((votos.quente / totalVotos) * 4 + 1); // 1–5
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      bestRating: 5,
      worstRating: 1,
      ratingCount: totalVotos,
    };
  }

  // Breadcrumb: Início › Categoria › Promo
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: APP_URL },
      { "@type": "ListItem", position: 2, name: promo.categoria, item: `${APP_URL}/categoria/${promo.categoria}` },
      { "@type": "ListItem", position: 3, name: promo.titulo, item: `${APP_URL}/promo/${promo.id}` },
    ],
  };

  return (
    <div className="min-h-screen">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
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
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
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

            {/* Autor da promo */}
            {autor && (
              <Link
                href={`/usuario/${autor.user_id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
              >
                {autor.avatar_url ? (
                  <Image
                    src={autor.avatar_url}
                    alt={autor.nome ?? "Caçador"}
                    width={36}
                    height={36}
                    className="rounded-full w-9 h-9 object-cover ring-1 ring-white/10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
                    {(autor.nome ?? "CA").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Postada por</p>
                  <p className="text-sm font-semibold text-gray-200 group-hover:text-brand-400 transition-colors truncate">
                    {autor.nome ?? "Caçador"}
                  </p>
                </div>
                <NivelBadge xp={autor.xp_total} />
              </Link>
            )}

            {/* Votação da comunidade */}
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Essa promo vale a pena?</p>
              <VotoBar promoId={promo.id} />
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

              <div className="grid grid-cols-2 gap-3">
                <FavoritarButton promoId={promo.id} variant="inline" />
                <ShareButton
                  href={urlWhatsApp(promo.titulo, `${process.env.NEXT_PUBLIC_APP_URL}/promo/${promo.id}`)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de preço + comparação */}
        <div className="mt-8 border-t border-white/5 pt-8">
          <PriceHistory
            promoId={promo.id}
            titulo={promo.titulo}
            precoAtual={promo.preco_promo}
          />
        </div>

        {/* Comentários */}
        <div className="mt-8 border-t border-white/5 pt-8">
          <ComentariosSection promoId={promo.id} />
        </div>
      </main>
    </div>
  );
}

