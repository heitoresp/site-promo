import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin | ApenasPromo",
  robots: { index: false, follow: false },
};

// Emails autorizados a acessar o admin (separados por vírgula no .env)
function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!isAdmin(user?.email)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {children}
    </div>
  );
}
