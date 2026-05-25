"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

interface Comentario {
  id: string;
  user_nome: string;
  user_avatar: string | null;
  conteudo: string;
  criado_em: string;
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

interface ComentariosSectionProps {
  promoId: string;
}

export function ComentariosSection({ promoId }: ComentariosSectionProps) {
  const { user }                        = useAuth();
  const [comentarios, setComentarios]   = useState<Comentario[]>([]);
  const [carregando, setCarregando]     = useState(true);
  const [texto, setTexto]               = useState("");
  const [enviando, setEnviando]         = useState(false);
  const [erro, setErro]                 = useState("");
  const [showLogin, setShowLogin]       = useState(false);

  useEffect(() => {
    fetch(`/api/promos/${promoId}/comentarios`)
      .then((r) => r.json())
      .then((d) => setComentarios(d.comentarios ?? []))
      .finally(() => setCarregando(false));
  }, [promoId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;

    if (!user) {
      setShowLogin(true);
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      const res  = await fetch(`/api/promos/${promoId}/comentarios`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conteudo: texto.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setComentarios((prev) => [data.comentario, ...prev]);
        setTexto("");
      } else {
        setErro(data.erro ?? "Erro ao enviar comentário.");
      }
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-10">
      {/* Título */}
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={18} className="text-gray-400" />
        <h2 className="text-base font-bold text-white">
          Comentários
          {comentarios.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({comentarios.length})
            </span>
          )}
        </h2>
      </div>

      {/* Formulário */}
      <form onSubmit={enviar} className="flex flex-col gap-2 mb-6">
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={() => { if (!user) setShowLogin(true); }}
            placeholder={user ? "Deixe seu comentário..." : "Entre para comentar"}
            maxLength={500}
            rows={2}
            className="search-input resize-none flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="btn-promo w-auto px-4 py-2 self-end disabled:opacity-40"
          >
            {enviando ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
        {texto.length > 400 && (
          <p className="text-xs text-gray-600 text-right">{texto.length}/500</p>
        )}
      </form>

      {/* Lista */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full shimmer shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 shimmer rounded w-24" />
                <div className="h-3 shimmer rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comentarios.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-8">
          Seja o primeiro a comentar!
        </p>
      ) : (
        <div className="space-y-4">
          {comentarios.map((c) => (
            <div key={c.id} className="flex gap-3">
              {/* Avatar */}
              {c.user_avatar ? (
                <Image
                  src={c.user_avatar}
                  alt={c.user_nome}
                  width={32}
                  height={32}
                  className="rounded-full shrink-0 w-8 h-8 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-600/50 flex items-center justify-center text-xs font-bold text-brand-200 shrink-0">
                  {c.user_nome.slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Conteúdo */}
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-300">{c.user_nome}</span>
                  <span className="text-xs text-gray-600">{tempoRelativo(c.criado_em)}</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">{c.conteudo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </section>
  );
}
