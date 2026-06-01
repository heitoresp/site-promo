import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(email.toLowerCase());
}

// POST /api/admin/usuarios/[id]/badges   { badge_slug }  → concede
export async function POST(
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
  const slug = String(body?.badge_slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "badge_slug obrigatório" }, { status: 400 });

  const service = createServiceRoleClient();
  const { error } = await service
    .from("usuario_badges")
    .upsert({ user_id: id, badge_slug: slug }, { onConflict: "user_id,badge_slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/usuarios/[id]/badges?slug=...  → remove
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });

  const service = createServiceRoleClient();
  const { error } = await service
    .from("usuario_badges")
    .delete()
    .eq("user_id", id)
    .eq("badge_slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
