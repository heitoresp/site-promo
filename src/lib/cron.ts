import { NextRequest } from "next/server";

// Valida que a requisição veio do Vercel Cron (ou de quem tem o segredo).
// O Vercel Cron envia: Authorization: Bearer <CRON_SECRET>
export function autorizarCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem segredo configurado, nega por segurança
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}
