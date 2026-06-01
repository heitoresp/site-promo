import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { PromoCard } from "@/components/PromoCard";
import { XpBar } from "@/components/NivelBadge";
import { nivelDoXp } from "@/lib/gamificacao";
import type { Badge, Promo } from "@/types/promo";
import { ArrowLeft, Package, Flame, ThumbsUp, Trophy } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface PerfilData {
  user_id: string;
  nome: string | null;
  avatar_url: string | null;
  xp_total: number;
  badges: Badge[];
  stats: { promos_aprovadas: number; votos_quentes: number; cliques_totais: number };
  promos: Promo[];
}

async function getPerfil(id: string): Promise<PerfilData | null> {
  const supabase = createServiceRoleClient();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("user_id, nome, avatar_url, xp_total")
    .eq("user_id", id)
    .maybeSingle();

  if (!perfil) return null;

  const { data: ub } = await supabase
    .from("usuario_badges")
    .select("concedido_em, badges(slug, nome, descricao, emoji, cor, ordem)")
    .eq("user_id", id);

  const badges: Badge[] = (ub ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => row.badges && { ...row.badges, concedido_em: row.concedido_em })
    .filter(Boolean)
    .sort((a: Badge, b: Badge) => a.ordem - b.ordem);

  const { data: promosData } = await supabase
    .from("promos")
    .select("*")
    .eq("enviado_por", id)
    .eq("status", "ativo")
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(30);

  const promos = (promosData ?? []) as Promo[];

  const { count: votosQuentes } = await supabase
    .from("votos")
    .select("id, promos!inner(enviado_por)", { count: "exact", head: true })
    .eq("tipo", "quente")
    .eq("promos.enviado_por", id);

  return {
    ...perfil,
    badges,
    stats: {
      promos_aprovadas: promos.length,
      votos_quentes: votosQuentes ?? 0,
      cliques_totais: promos.reduce((s, p) => s + (p.cliques ?? 0), 0),
    },
    promos,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const perfil = await getPerfil(id);
  if (!perfil) return { title: "Usuário não encontrado" };
  const { nivel } = nivelDoXp(perfil.xp_total);
  return {
    title: `${perfil.nome ?? "Caçador"} — ${nivel.nome}`,
    description: `${perfil.nome ?? "Caçador"} já postou ${perfil.stats.promos_aprovadas} promos no ApenasPromo.`,
  };
}

export default async function PerfilPage({ params }: PageProps) {
  const { id } = await params;
  const perfil = await getPerfil(id);
  if (!perfil) notFound();

  const nome = perfil.nome ?? "Caçador";
  const iniciais = nome.slice(0, 2).toUpperCase();

  const stats = [
    { label: "Promos", valor: perfil.stats.promos_aprovadas, icon: Package, cor: "text-sky-400" },
    { label: "Votos 🔥", valor: perfil.stats.votos_quentes, icon: ThumbsUp, cor: "text-green-400" },
    { label: "Cliques", valor: perfil.stats.cliques_totais, icon: Flame, cor: "text-brand-400" },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <Link href="/ranking" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> Ranking de caçadores
        </Link>

        {/* Cabeçalho do perfil */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          {perfil.avatar_url ? (
            <Image
              src={perfil.avatar_url}
              alt={nome}
              width={88}
              height={88}
              className="rounded-2xl w-22 h-22 object-cover ring-2 ring-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-[88px] h-[88px] rounded-2xl bg-brand-600 flex items-center justify-center text-2xl font-extrabold text-white ring-2 ring-white/10">
              {iniciais}
            </div>
          )}

          {/* Nome + XP */}
          <div className="flex-1 w-full space-y-3 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-white">{nome}</h1>
            <div className="max-w-sm mx-auto sm:mx-0">
              <XpBar xp={perfil.xp_total} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <s.icon size={16} className={`${s.cor} mx-auto mb-1`} />
              <p className={`text-xl font-extrabold ${s.cor}`}>{s.valor.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Conquistas */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <Trophy size={13} /> Conquistas
          </h2>
          {perfil.badges.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center glass-card">
              Nenhuma conquista ainda. Poste promos boas pra desbloquear! 🏅
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {perfil.badges.map((b) => (
                <div key={b.slug} className="glass-card p-4 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{b.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate" style={{ color: b.cor }}>{b.nome}</p>
                    <p className="text-xs text-gray-500 leading-tight">{b.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promos do usuário */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
            <Package size={13} /> Promos de {nome}
          </h2>
          {perfil.promos.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center glass-card">
              Ainda não publicou nenhuma promo.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {perfil.promos.map((p) => (
                <PromoCard key={p.id} promo={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
