import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Rate limiting simples (in-memory, janela fixa).
//
// LIMITAÇÃO HONESTA: o estado vive na memória da instância serverless,
// então reseta em cold start e não é compartilhado entre instâncias.
// Não substitui um Redis/Upstash, mas freia abuso trivial (scripts de
// spam, cliques repetidos) sem dependência externa.
// ============================================================

interface Registro { count: number; reset: number; }
const baldes = new Map<string, Registro>();

// Limpa entradas expiradas de vez em quando (evita vazar memória)
function limpar(agora: number) {
  if (baldes.size < 5000) return;
  for (const [k, v] of baldes) if (v.reset < agora) baldes.delete(k);
}

/**
 * Aplica rate limit. Retorna NextResponse 429 se excedeu, ou null se OK.
 * @param chave identificador (ex: `votar:${userId}`)
 * @param limite máximo de requests na janela
 * @param janelaMs tamanho da janela em ms
 */
export function rateLimit(chave: string, limite: number, janelaMs: number): NextResponse | null {
  const agora = Date.now();
  limpar(agora);

  const reg = baldes.get(chave);
  if (!reg || reg.reset < agora) {
    baldes.set(chave, { count: 1, reset: agora + janelaMs });
    return null;
  }

  if (reg.count >= limite) {
    const retryEm = Math.ceil((reg.reset - agora) / 1000);
    return NextResponse.json(
      { erro: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(retryEm) } }
    );
  }

  reg.count++;
  return null;
}

// Identifica o cliente: prefere user.id; cai pro IP do header.
export function idDoCliente(req: NextRequest, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "anon";
  return `ip:${ip}`;
}
