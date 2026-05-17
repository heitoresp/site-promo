import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { PromoFeedRealtime } from "@/components/PromoFeedRealtime";
import { CategoriaNav } from "@/components/CategoriaNav";
import { Suspense } from "react";
import type { Categoria, Promo } from "@/types/promo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCategoria(slug: string): Promise<Categoria | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("categorias")
    .select("*")
    .eq("slug", slug)
    .single();
  return data as Categoria | null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoria = await getCategoria(slug);
  if (!categoria) return { title: "Categoria não encontrada" };

  return {
    title: `${categoria.icone ?? ""} ${categoria.nome} — Melhores Promos`,
    description: `As melhores promoções de ${categoria.nome}. Atualizadas em tempo real.`,
  };
}

export default async function CategoriaPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const [categoriaData, promosData, categoriasData] = await Promise.all([
    getCategoria(slug),
    supabase
      .from("promos")
      .select("*")
      .eq("ativo", true)
      .eq("categoria", slug)
      .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
      .order("criado_em", { ascending: false })
      .limit(40),
    supabase.from("categorias").select("*").order("ordem"),
  ]);

  if (!categoriaData) notFound();

  const promos = (promosData.data ?? []) as Promo[];
  const categorias = (categoriasData.data ?? []) as Categoria[];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            {categoriaData.icone} {categoriaData.nome}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {promos.length} promoção{promos.length !== 1 ? "ões" : ""} ativa{promos.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Suspense fallback={null}>
          <CategoriaNav categorias={categorias} />
        </Suspense>

        <PromoFeedRealtime promosIniciais={promos} />
      </main>
    </div>
  );
}
