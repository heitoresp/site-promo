"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Categoria } from "@/types/promo";

interface CategoriaNavProps {
  categorias: Categoria[];
}

export function CategoriaNav({ categorias }: CategoriaNavProps) {
  const searchParams = useSearchParams();
  const categoriaAtiva = searchParams.get("categoria");

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      {/* Pill "Tudo" */}
      <Link
        href="/"
        className={`categoria-pill shrink-0 ${!categoriaAtiva ? "ativo" : ""}`}
      >
        🔥 Tudo
      </Link>

      {categorias.map((cat) => (
        <Link
          key={cat.slug}
          href={`/?categoria=${cat.slug}`}
          className={`categoria-pill shrink-0 ${
            categoriaAtiva === cat.slug ? "ativo" : ""
          }`}
        >
          {cat.icone && <span>{cat.icone}</span>}
          {cat.nome}
        </Link>
      ))}
    </div>
  );
}
