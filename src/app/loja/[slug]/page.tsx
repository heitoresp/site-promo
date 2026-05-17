import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { PromoFeedRealtime } from "@/components/PromoFeedRealtime";
import type { Loja, Promo } from "@/types/promo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getLoja(slug: string): Promise<Loja | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("lojas")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Loja | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const loja = await getLoja(slug);
  if (!loja) return { title: "Loja não encontrada" };

  return {
    title: `Promos ${loja.nome} — Melhores Ofertas`,
    description: `Melhores promoções e descontos da ${loja.nome}. Atualizadas diariamente.`,
  };
}

export default async function LojaPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const [lojaData, promosData] = await Promise.all([
    getLoja(slug),
    supabase
      .from("promos")
      .select("*")
      .eq("ativo", true)
      .eq("loja", slug)
      .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(40),
  ]);

  if (!lojaData) notFound();

  const promos = (promosData.data ?? []) as Promo[];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border border-white/10"
            style={{ backgroundColor: `${lojaData.cor_primaria}20` }}
          >
            🛒
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{lojaData.nome}</h1>
            <p className="text-sm text-gray-500">
              {promos.length} promoção{promos.length !== 1 ? "ões" : ""} ativa{promos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <PromoFeedRealtime promosIniciais={promos} />
      </main>
    </div>
  );
}
