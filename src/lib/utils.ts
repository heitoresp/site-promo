import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarDesconto(pct: number): string {
  return `-${Math.round(pct)}%`;
}

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutos = Math.floor(diff / 60000);
  const horas   = Math.floor(diff / 3600000);
  const dias    = Math.floor(diff / 86400000);

  if (minutos < 1)  return "agora mesmo";
  if (minutos < 60) return `há ${minutos}min`;
  if (horas < 24)   return `há ${horas}h`;
  if (dias < 7)     return `há ${dias}d`;
  return formatarData(iso);
}

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite).trim() + "…";
}

// Verifica se a promo é "nova" (criada nas últimas 24h)
export function isNova(criadoEm: string): boolean {
  return Date.now() - new Date(criadoEm).getTime() < 24 * 60 * 60 * 1000;
}

// Verifica se a promo está prestes a expirar (menos de 2h)
export function isExpirando(expiraEm: string | null): boolean {
  if (!expiraEm) return false;
  const diff = new Date(expiraEm).getTime() - Date.now();
  return diff > 0 && diff < 2 * 60 * 60 * 1000;
}

// Gera a URL de compartilhamento para WhatsApp
export function urlWhatsApp(titulo: string, link: string): string {
  const texto = encodeURIComponent(`🔥 ${titulo}\n\n${link}`);
  return `https://wa.me/?text=${texto}`;
}
