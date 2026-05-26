"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
// createClient ainda usado para logout
import type { User } from "@supabase/supabase-js";
import type { Promo, Categoria, Loja, CreatePromoPayload } from "@/types/promo";
import { formatarPreco, tempoRelativo } from "@/lib/utils";
import {
  Plus, LogOut, Flame, Zap, TrendingUp, Bot,
  Trash2, Eye, EyeOff, ExternalLink, X, Check, Flag,
  Clock, CheckCircle, XCircle, User,
} from "lucide-react";

interface Props {
  user: User;
  promos: Promo[];
  pendentes: Promo[];
  categorias: Categoria[];
  lojas: Loja[];
  stats: { total: number; ativas: number; bot: number; cliques: number };
}

const FORM_VAZIO: CreatePromoPayload = {
  titulo:         "",
  descricao:      "",
  preco_original: undefined,
  preco_promo:    0,
  link_afiliado:  "",
  loja:           "outros",
  categoria:      "geral",
  cupom:          "",
  imagem_url:     "",
  origem:         "manual",
};

export function AdminDashboard({ user, promos: promosIniciais, pendentes: pendentesIniciais, categorias, lojas, stats }: Props) {
  const router   = useRouter();
  const [promos, setPromos]       = useState(promosIniciais);
  const [pendentes, setPendentes] = useState(pendentesIniciais);
  const [aba, setAba]             = useState<"promos" | "pendentes">("promos");
  const [form, setForm]     = useState<CreatePromoPayload>(FORM_VAZIO);
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modal, setModal]     = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "preco_promo" || name === "preco_original"
        ? value === "" ? undefined : parseFloat(value)
        : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");
    setSucesso("");

    try {
      const res = await fetch("/api/promos", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_API_SECRET ?? ""}`,
        },
        body: JSON.stringify({ ...form, origem: "manual" }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErro(json.erro ?? "Erro ao criar promo.");
      } else {
        setSucesso("Promo criada com sucesso!");
        setPromos((prev) => [json.promo, ...prev]);
        setForm(FORM_VAZIO);
        setModal(false);
      }
    } catch {
      setErro("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(promo: Promo) {
    const res = await fetch(`/api/admin/promos/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !promo.ativo }),
    });

    if (res.ok) {
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, ativo: !p.ativo } : p))
      );
    }
  }

  async function aprovar(id: string) {
    const res = await fetch(`/api/admin/promos/${id}/aprovar`, { method: "POST" });
    if (res.ok) {
      const aprovada = pendentes.find(p => p.id === id);
      setPendentes(prev => prev.filter(p => p.id !== id));
      if (aprovada) setPromos(prev => [{ ...aprovada, status: "ativo", ativo: true }, ...prev]);
      setSucesso("Promo aprovada e publicada!");
    }
  }

  async function rejeitar(id: string) {
    const res = await fetch(`/api/admin/promos/${id}/rejeitar`, { method: "POST" });
    if (res.ok) {
      setPendentes(prev => prev.filter(p => p.id !== id));
      setSucesso("Promo rejeitada.");
    }
  }

  async function deletar(id: string) {
    if (!confirm("Deletar esta promo?")) return;

    const res = await fetch(`/api/admin/promos/${id}`, { method: "DELETE" });

    if (res.ok) {
      setPromos((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Erro ao deletar. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header Admin */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/40">
        <div className="glow-line" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Flame size={14} className="text-white" />
            </div>
            <span className="font-bold text-white">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",   value: stats.total,   icon: TrendingUp, color: "text-blue-400" },
            { label: "Ativas",  value: stats.ativas,  icon: Zap,        color: "text-green-400" },
            { label: "Via Bot", value: stats.bot,     icon: Bot,        color: "text-purple-400" },
            { label: "Cliques", value: stats.cliques, icon: Flame,      color: "text-brand-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <stat.icon size={14} className={stat.color} />
              </div>
              <p className={`text-2xl font-extrabold mt-1 ${stat.color}`}>
                {stat.value.toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 w-fit">
          <button
            onClick={() => setAba("promos")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              aba === "promos"
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Promos Ativas
          </button>
          <button
            onClick={() => setAba("pendentes")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              aba === "pendentes"
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Clock size={13} />
            Pendentes
            {pendentes.length > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-yellow-500 text-black text-xs font-extrabold flex items-center justify-center">
                {pendentes.length}
              </span>
            )}
          </button>
        </div>

        {sucesso && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm">
            <Check size={16} />
            {sucesso}
          </div>
        )}

        {/* ── ABA PENDENTES ── */}
        {aba === "pendentes" && (
          <div className="space-y-3">
            {pendentes.length === 0 ? (
              <div className="glass-card p-10 text-center text-gray-600">
                <CheckCircle size={32} className="text-green-500/40 mx-auto mb-3" />
                Nenhuma promo aguardando aprovação
              </div>
            ) : (
              pendentes.map(promo => (
                <div key={promo.id} className="glass-card p-5 flex gap-4 items-start">
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-gray-100 line-clamp-2">{promo.titulo}</p>
                      <span className="shrink-0 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} /> Pendente
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-bold text-brand-400 text-sm">{formatarPreco(promo.preco_promo)}</span>
                      <span>{promo.loja}</span>
                      <span>{promo.categoria}</span>
                      <span className="flex items-center gap-1"><User size={10} /> Usuário</span>
                      <span>{tempoRelativo(promo.criado_em)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 break-all">{promo.link_afiliado}</span>
                      <a href={promo.link_afiliado} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 text-brand-400 hover:text-brand-300">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  {/* Ações */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => aprovar(promo.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 text-sm font-bold transition-all"
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                    <button
                      onClick={() => rejeitar(promo.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-sm font-bold transition-all"
                    >
                      <XCircle size={14} /> Rejeitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ABA PROMOS ATIVAS ── */}
        {aba === "promos" && (
        <>
        {/* Botão Nova Promo */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-lg">Promoções Ativas</h2>
          <button
            onClick={() => { setModal(true); setErro(""); setSucesso(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold transition-all"
          >
            <Plus size={16} />
            Nova Promo
          </button>
        </div>

        {/* Tabela de promos */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3 hidden md:table-cell">Origem</th>
                  <th className="px-4 py-3 hidden md:table-cell">Cliques</th>
                  <th className="px-4 py-3 hidden md:table-cell">Denúncias</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Criado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {promos.map((promo) => (
                  <tr
                    key={promo.id}
                    className={`transition-colors hover:bg-white/2 ${
                      !promo.ativo ? "opacity-40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-200 line-clamp-1 max-w-xs">
                        {promo.titulo}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{promo.categoria}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-brand-400">
                      {formatarPreco(promo.preco_promo)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{promo.loja}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                          promo.origem === "whatsapp_bot"
                            ? "bg-purple-500/15 text-purple-400"
                            : "bg-blue-500/15 text-blue-400"
                        }`}
                      >
                        {promo.origem === "whatsapp_bot" ? <Bot size={10} /> : null}
                        {promo.origem === "whatsapp_bot" ? "Bot" : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400">
                      {promo.cliques}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {(promo.denuncias ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                          <Flag size={12} />
                          {promo.denuncias}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                      {tempoRelativo(promo.criado_em)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/promo/${promo.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                          title="Ver no site"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => toggleAtivo(promo)}
                          className={`p-1.5 rounded-lg transition-all ${
                            promo.ativo
                              ? "text-green-400 hover:bg-green-500/10"
                              : "text-gray-600 hover:bg-white/5"
                          }`}
                          title={promo.ativo ? "Desativar" : "Ativar"}
                        >
                          {promo.ativo ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={() => deletar(promo.id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {promos.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                Nenhuma promo ainda. Crie a primeira!
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </main>

      {/* Modal de criação */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-white">Nova Promoção</h3>
              <button
                onClick={() => setModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Título */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  Título *
                </label>
                <input
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Fone Sony WH-1000XM5 Bluetooth"
                  className="search-input w-full"
                />
              </div>

              {/* Preços */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Preço Promo (R$) *
                  </label>
                  <input
                    name="preco_promo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco_promo || ""}
                    onChange={handleChange}
                    required
                    placeholder="199.90"
                    className="search-input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Preço Original (R$)
                  </label>
                  <input
                    name="preco_original"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.preco_original ?? ""}
                    onChange={handleChange}
                    placeholder="399.90"
                    className="search-input w-full"
                  />
                </div>
              </div>

              {/* Link */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  Link de Afiliado *
                </label>
                <input
                  name="link_afiliado"
                  type="url"
                  value={form.link_afiliado}
                  onChange={handleChange}
                  required
                  placeholder="https://amzn.to/xxxxx"
                  className="search-input w-full"
                />
              </div>

              {/* Imagem */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  URL da Imagem
                </label>
                <input
                  name="imagem_url"
                  type="url"
                  value={form.imagem_url ?? ""}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="search-input w-full"
                />
              </div>

              {/* Loja e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">Loja</label>
                  <select
                    name="loja"
                    value={form.loja}
                    onChange={handleChange}
                    className="search-input w-full"
                  >
                    {lojas.map((l) => (
                      <option key={l.slug} value={l.slug}>{l.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Categoria
                  </label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="search-input w-full"
                  >
                    {categorias.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.icone} {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cupom */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  Cupom (opcional)
                </label>
                <input
                  name="cupom"
                  value={form.cupom ?? ""}
                  onChange={handleChange}
                  placeholder="PROMO10"
                  className="search-input w-full font-mono uppercase"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  name="descricao"
                  value={form.descricao ?? ""}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Detalhes da promoção..."
                  className="search-input w-full resize-none"
                />
              </div>

              {erro && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-promo"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Publicar Promo"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
