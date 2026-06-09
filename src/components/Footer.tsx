import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ApenasPromo";

const CATEGORIAS = [
  { slug: "eletronicos", nome: "Eletrônicos" },
  { slug: "moda",        nome: "Moda" },
  { slug: "games",       nome: "Games" },
  { slug: "casa",        nome: "Casa" },
  { slug: "alimentacao", nome: "Alimentação" },
];

const NAVEGAR = [
  { href: "/",          nome: "Início" },
  { href: "/ranking",   nome: "Em Alta" },
  { href: "/submeter",  nome: "Enviar Promo" },
  { href: "/alertas",   nome: "Criar Alerta" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Marca */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-display font-extrabold text-lg">
              <span className="text-white">{APP_NAME.slice(0, -5)}</span>
              <span className="text-brand-500">{APP_NAME.slice(-5)}</span>
            </span>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              As melhores promoções do dia, sem frescura. Só desconto de verdade. 🔥
            </p>
          </div>

          {/* Navegar */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Navegar</h3>
            <ul className="space-y-2">
              {NAVEGAR.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
                    {l.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categorias */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Categorias</h3>
            <ul className="space-y-2">
              {CATEGORIAS.map((c) => (
                <li key={c.slug}>
                  <Link href={`/categoria/${c.slug}`} className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
                    {c.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Comunidade */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Comunidade</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/ranking" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
                  Top Caçadores
                </Link>
              </li>
              <li>
                <Link href="/submeter" className="text-sm text-gray-500 hover:text-brand-400 transition-colors">
                  Contribuir
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="glow-line my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} {APP_NAME}. Feito com 🔥 no Brasil.</p>
          <p>Os preços podem mudar a qualquer momento. Confira sempre na loja.</p>
        </div>

        {/* Divulgação de afiliado — exigida pelos programas (Amazon Associates etc.) */}
        <p className="text-[11px] text-gray-700 mt-4 leading-relaxed text-center sm:text-left">
          {APP_NAME} participa de programas de afiliados (Amazon Associates e outros).
          Como afiliado, podemos ganhar comissão por compras qualificadas feitas pelos
          links do site — sem custo adicional para você.
        </p>
      </div>
    </footer>
  );
}
