import { nivelDoXp } from "@/lib/gamificacao";

interface NivelBadgeProps {
  xp: number;
  size?: "sm" | "md";
  showXp?: boolean;
}

// Selo compacto de nível — usado em comentários, autor da promo, etc.
export function NivelBadge({ xp, size = "sm", showXp = false }: NivelBadgeProps) {
  const { nivel } = nivelDoXp(xp);
  const compact = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 font-semibold ${nivel.cor} ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
      title={`${nivel.nome} · ${xp} XP`}
    >
      <span>{nivel.emoji}</span>
      <span>{nivel.nome}</span>
      {showXp && <span className="text-gray-500 font-normal">· {xp} XP</span>}
    </span>
  );
}

// Barra de progresso de XP para o próximo nível
export function XpBar({ xp }: { xp: number }) {
  const info = nivelDoXp(xp);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-bold ${info.nivel.cor}`}>
          {info.nivel.emoji} {info.nivel.nome}
        </span>
        <span className="text-gray-500 tabular-nums">{xp} XP</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all"
          style={{ width: `${info.progresso}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-600">
        {info.proximo
          ? `Faltam ${info.xpParaProximo} XP para ${info.proximo.emoji} ${info.proximo.nome}`
          : "Nível máximo alcançado! 👑"}
      </p>
    </div>
  );
}
