"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense } from "react";
import { Search, TrendingUp, PlusCircle, Menu, X } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./UserMenu";
import { Sino } from "./Sino";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ApenasPromo";

function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get("busca") ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      router.push(`/?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar promoções..."
        className="search-input pl-9"
        aria-label="Buscar promoções"
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      )}
    </form>
  );
}

const NAV_LINKS = [
  { href: "/ranking",  label: "Em Alta",     icon: TrendingUp, cor: "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10" },
  { href: "/submeter", label: "Enviar Promo", icon: PlusCircle, cor: "text-brand-400 hover:text-brand-300 hover:bg-brand-500/10" },
];

export function Header() {
  const [menuMobile, setMenuMobile] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl bg-black/40">
      <div className="glow-line" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group" aria-label={APP_NAME}>
          <div className="relative group-hover:scale-110 transition-transform">
            <Image
              src="/logo.svg"
              alt={APP_NAME}
              width={36}
              height={36}
              className="rounded-full shadow-glow-orange"
              priority
            />
            <div className="absolute inset-0 rounded-full bg-brand-500 opacity-0 group-hover:opacity-20 blur-md transition-opacity" />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight hidden sm:block">
            <span className="text-white">{APP_NAME.slice(0, -5)}</span>
            <span className="text-brand-500">{APP_NAME.slice(-5)}</span>
          </span>
        </Link>

        {/* Busca */}
        <Suspense fallback={<div className="flex-1 max-w-xl h-9 rounded-xl shimmer" />}>
          <SearchBar />
        </Suspense>

        {/* Navegação desktop */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${l.cor}`}
            >
              <l.icon size={14} />
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Notificações */}
        <Sino />

        {/* Usuário */}
        <UserMenu />

        {/* Hambúrguer (mobile) */}
        <button
          onClick={() => setMenuMobile((v) => !v)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-all shrink-0"
          aria-label="Menu"
        >
          {menuMobile ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Drawer mobile */}
      {menuMobile && (
        <>
          <div className="md:hidden fixed inset-0 top-[57px] z-40 bg-black/60" onClick={() => setMenuMobile(false)} />
          <nav className="md:hidden absolute left-0 right-0 z-40 border-b border-white/10 bg-[#0c0c12] shadow-xl animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuMobile(false)}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm font-medium transition-all ${l.cor}`}
                >
                  <l.icon size={16} />
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
