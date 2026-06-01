// ============================================================
// Gamificação — níveis "Caçador de Ofertas"
//
// O XP é acumulado no banco (perfis.xp_total). Aqui mora só a
// lógica de apresentação: converter XP em nível, progresso, etc.
// ============================================================

export interface Nivel {
  min: number;      // XP mínimo para entrar neste nível
  nome: string;
  emoji: string;
  cor: string;      // classe tailwind de texto
}

// Curva de níveis (crescente). O nível atual é o maior `min` <= xp.
export const NIVEIS: Nivel[] = [
  { min: 0,    nome: "Novato",            emoji: "🥚", cor: "text-gray-400" },
  { min: 50,   nome: "Garimpeiro",        emoji: "🔍", cor: "text-sky-400" },
  { min: 150,  nome: "Caçador",           emoji: "🎯", cor: "text-violet-400" },
  { min: 350,  nome: "Expert",            emoji: "🔥", cor: "text-orange-400" },
  { min: 700,  nome: "Lenda das Promos",  emoji: "💎", cor: "text-amber-400" },
  { min: 1500, nome: "Mestre Caçador",    emoji: "👑", cor: "text-yellow-300" },
];

export interface NivelInfo {
  nivel: Nivel;
  indice: number;           // posição na lista (0-based)
  proximo: Nivel | null;    // próximo nível, ou null se já é o máximo
  xpNoNivel: number;        // XP acumulado dentro da faixa atual
  xpParaProximo: number;    // XP que falta pro próximo (0 se máximo)
  progresso: number;        // 0–100, progresso dentro da faixa atual
}

export function nivelDoXp(xp: number): NivelInfo {
  const x = Math.max(0, Math.floor(xp || 0));

  let indice = 0;
  for (let i = 0; i < NIVEIS.length; i++) {
    if (x >= NIVEIS[i].min) indice = i;
  }

  const nivel = NIVEIS[indice];
  const proximo = NIVEIS[indice + 1] ?? null;

  if (!proximo) {
    return {
      nivel, indice, proximo: null,
      xpNoNivel: x - nivel.min,
      xpParaProximo: 0,
      progresso: 100,
    };
  }

  const faixa = proximo.min - nivel.min;
  const dentro = x - nivel.min;
  return {
    nivel, indice, proximo,
    xpNoNivel: dentro,
    xpParaProximo: proximo.min - x,
    progresso: Math.round((dentro / faixa) * 100),
  };
}
