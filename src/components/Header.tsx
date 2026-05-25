"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense } from "react";
import { Search, Zap, TrendingUp } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./UserMenu";

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

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 backdrop-blur-xl bg-black/40">
      {/* Linha decorativa no topo */}
      <div className="glow-line" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 group"
          aria-label={APP_NAME}
        >
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
          <span className="font-extrabold text-xl tracking-tight hidden sm:block">
            <span className="text-white">{APP_NAME.slice(0, -5)}</span>
            <span className="text-brand-500">{APP_NAME.slice(-5)}</span>
          </span>
        </Link>

        {/* Busca */}
        <Suspense
          fallback={
            <div className="flex-1 max-w-xl h-9 rounded-xl shimmer" />
          }
        >
          <SearchBar />
        </Suspense>

        {/* Links de navegação */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          <Link
            href="/ranking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-all"
          >
            <TrendingUp size={14} />
            Em Alta
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
          >
            Admin
          </Link>
        </nav>

        {/* Usuário */}
        <UserMenu />
      </div>
    </header>
  );
}
