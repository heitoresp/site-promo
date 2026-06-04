import type { MetadataRoute } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://apenaspromo.com.br";

// Revalida o sitemap de tempos em tempos (promos mudam com frequência)
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceRoleClient();
  const agora = new Date().toISOString();

  // Páginas fixas
  const estaticas: MetadataRoute.Sitemap = [
    { url: APP_URL,              changeFrequency: "hourly",  priority: 1.0, lastModified: agora },
    { url: `${APP_URL}/ranking`, changeFrequency: "daily",   priority: 0.8, lastModified: agora },
    { url: `${APP_URL}/submeter`,changeFrequency: "monthly", priority: 0.3 },
  ];

  // Categorias e lojas (do banco)
  const [{ data: categorias }, { data: lojas }, { data: promos }] = await Promise.all([
    supabase.from("categorias").select("slug"),
    supabase.from("lojas").select("slug"),
    supabase
      .from("promos")
      .select("id, atualizado_em")
      .eq("ativo", true)
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .limit(5000),
  ]);

  const catUrls: MetadataRoute.Sitemap = (categorias ?? []).map((c) => ({
    url: `${APP_URL}/categoria/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
    lastModified: agora,
  }));

  const lojaUrls: MetadataRoute.Sitemap = (lojas ?? []).map((l) => ({
    url: `${APP_URL}/loja/${l.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
    lastModified: agora,
  }));

  const promoUrls: MetadataRoute.Sitemap = (promos ?? []).map((p) => ({
    url: `${APP_URL}/promo/${p.id}`,
    changeFrequency: "daily",
    priority: 0.7,
    lastModified: p.atualizado_em ?? agora,
  }));

  return [...estaticas, ...catUrls, ...lojaUrls, ...promoUrls];
}
