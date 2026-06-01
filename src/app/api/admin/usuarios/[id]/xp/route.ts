import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// PATCH /api/admin/usuarios/[id]/xp  { xp_bonus: number }
// Ajusta o bônus de XP manual do admin (xp_total = xp + xp_bonus).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const bonus = Number(body?.xp_bonus);
  if (!Number.isFinite(bonus)) {
    return NextResponse.json({ error: "xp_bonus inválido" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("perfis")
    .update({ xp_bonus: Math.round(bonus) })
    .eq("user_id", id)
    .select("user_id, xp, xp_bonus, xp_total")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, perfil: data });
}
