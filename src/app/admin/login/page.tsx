"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Flame, Mail, CheckCircle } from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ApenasPromo";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setErro(error.message);
    } else {
      setEnviado(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-orange mb-4 animate-float">
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {APP_NAME} <span className="text-brand-500">Admin</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8">
          {!enviado ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="search-input pl-9 w-full"
                  />
                </div>
              </div>

              {erro && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-promo"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Enviar Magic Link"
                )}
              </button>

              <p className="text-xs text-center text-gray-600">
                Você receberá um link de acesso no email
              </p>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <CheckCircle size={40} className="text-green-400 mx-auto" />
              <h2 className="font-bold text-white text-lg">Link enviado!</h2>
              <p className="text-sm text-gray-400">
                Verifique o email <strong className="text-gray-300">{email}</strong> e clique
                no link para acessar o painel.
              </p>
              <button
                onClick={() => setEnviado(false)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Usar outro email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
