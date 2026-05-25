"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail]       = useState("");
  const [enviado, setEnviado]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState("");
  const [mounted, setMounted]   = useState(false);

  // Monta o portal apenas no cliente (evita hydration mismatch)
  useEffect(() => { setMounted(true); }, []);

  async function handleGoogle() {
    setLoading(true);
    await signInWithGoogle();
    // Redireciona — modal fecha com o redirect
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setErro("");
    const { error } = await signInWithEmail(email);
    setLoading(false);
    if (error) {
      setErro("Erro ao enviar o link. Tente novamente.");
    } else {
      setEnviado(true);
    }
  }

  const modal = (
    // Overlay — renderizado via portal direto no <body>, fora do Header
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Fundo escuro */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm glass-card p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Cabeçalho */}
        <div className="text-center">
          <p className="text-2xl mb-1">⚡</p>
          <h2 className="text-lg font-bold text-white">Entrar no ApenasPromo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Comente e reporte promos expiradas
          </p>
        </div>

        {enviado ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">📬</p>
            <p className="text-sm font-semibold text-white">Link enviado!</p>
            <p className="text-xs text-gray-400 mt-1">
              Cheque seu email <span className="text-brand-400">{email}</span> e clique no link para entrar.
            </p>
          </div>
        ) : (
          <>
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Entrar com Google
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-gray-600">ou</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Magic link */}
            <form onSubmit={handleEmail} className="flex flex-col gap-3">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="search-input pl-9"
                />
              </div>
              {erro && <p className="text-xs text-red-400">{erro}</p>}
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-promo disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  "Enviar link de acesso"
                )}
              </button>
            </form>

            <p className="text-xs text-center text-gray-600">
              Sem senha — receba um link mágico no seu email.
            </p>
          </>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
