"use client";

import { useState } from "react";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [showLogin, setShowLogin]   = useState(false);
  const [showMenu, setShowMenu]     = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          <User size={14} />
          Entrar
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  const avatar    = user.user_metadata?.avatar_url as string | undefined;
  const nome      = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Usuário";
  const iniciais  = nome.slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="flex items-center rounded-full hover:ring-2 hover:ring-brand-500/50 transition-all overflow-hidden"
        title={nome}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={nome}
            width={34}
            height={34}
            className="rounded-full w-[34px] h-[34px] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
            {iniciais}
          </div>
        )}
      </button>

      {showMenu && (
        <>
          {/* Overlay para fechar */}
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-40 w-48 glass-card py-2 shadow-xl">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-semibold text-white truncate">{nome}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { signOut(); setShowMenu(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
            >
              <LogOut size={13} />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
