import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Callback do magic link / OAuth do Supabase Auth
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redireciona pra login com erro
  return NextResponse.redirect(`${origin}/admin/login?erro=auth`);
}
