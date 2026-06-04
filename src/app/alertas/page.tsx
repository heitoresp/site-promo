"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { LoginModal } from "@/components/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import { Tag, ArrowLeft, Plus, X, Loader2 } from "lucide-react";

interface Alerta {
  id: string;
  termo: string;
  criado_em: string;
}

export default function AlertasPage() {
  const { user, loading: authLoading } = useAuth();
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [termo, setTermo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setAlertas([]); return; }
    fetch("/api/alertas")
      .then((r) => r.json())
      .then((d) => setAlertas(d.alertas ?? []))
      .catch(() => setAlertas([]));
  }, [user, authLoading]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }
    const t = termo.trim();
    if (t.length < 2) { setErro("Digite ao menos 2 letras"); return; }

    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/alertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termo: t }),
      });
      const d = await res.json();
      if (!res.ok) { setErro(d.error ?? "Erro ao adicionar"); return; }
      setAlertas((prev) => {
        const lista = prev ?? [];
        if (lista.some((a) => a.id === d.alerta.id)) return lista;
        return [d.alerta, ...lista];
      });
      setTermo("");
    } catch {
      setErro("Erro de conexão");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    setAlertas((prev) => (prev ?? []).filter((a) => a.id !== id)); // otimista
    try { await fetch(`/api/alertas?id=${id}`, { method: "DELETE" }); } catch {}
  }

  return (
    <div className="min-h-screen">
      <Header />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Link href="/notificacoes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> Notificações
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-amber-500/20 border border-brand-500/20 flex items-center justify-center">
            <Tag size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Meus alertas</h1>
            <p className="text-sm text-gray-500">Avisamos quando aparecer uma promo com esses termos</p>
          </div>
        </div>

        {!authLoading && !user ? (
          <div className="glass-card p-10 text-center space-y-4">
            <Tag size={32} className="text-brand-400/50 mx-auto" />
            <p className="text-gray-300 font-medium">Entre para criar alertas</p>
            <button onClick={() => setShowLogin(true)} className="btn-promo w-auto px-6 mx-auto">Entrar</button>
          </div>
        ) : (
          <>
            {/* Form de adicionar */}
            <form onSubmit={adicionar} className="glass-card p-4 space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Nova palavra-chave
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="Ex: PS5, iPhone, air fryer..."
                  maxLength={60}
                  className="search-input flex-1"
                />
                <button type="submit" disabled={enviando} className="btn-promo w-auto px-4 shrink-0">
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
              </div>
              {erro && <p className="text-xs text-red-400">{erro}</p>}
              <p className="text-xs text-gray-600">
                Buscamos no título e na descrição das promos novas (ignora maiúsculas e acentos).
              </p>
            </form>

            {/* Lista */}
            {alertas === null ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
              </div>
            ) : alertas.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8 glass-card">
                Nenhum alerta ainda. Adicione um termo acima 👆
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {alertas.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200"
                  >
                    <Tag size={12} className="text-brand-400" />
                    {a.termo}
                    <button
                      onClick={() => remover(a.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remover"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
