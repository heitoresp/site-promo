"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "./LoginModal";

interface ReportButtonProps {
  promoId: string;
  onExpirada?: () => void;
}

export function ReportButton({ promoId, onExpirada }: ReportButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading]       = useState(false);
  const [status, setStatus]         = useState<"idle" | "ok" | "jaFez" | "erro">("idle");
  const [showLogin, setShowLogin]   = useState(false);

  async function handleReport() {
    if (!user) {
      setShowLogin(true);
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(`/api/promos/${promoId}/report`, { method: "POST" });
      const data = await res.json();

      if (res.status === 409) {
        setStatus("jaFez");
      } else if (res.ok) {
        setStatus("ok");
        if (data.expirada) onExpirada?.();
      } else {
        setStatus("erro");
      }
    } catch {
      setStatus("erro");
    } finally {
      setLoading(false);
    }
  }

  const labels = {
    idle:  "Promoção expirada?",
    ok:    "Denúncia registrada ✓",
    jaFez: "Você já denunciou",
    erro:  "Tente novamente",
  };

  return (
    <>
      <button
        onClick={handleReport}
        disabled={loading || status === "ok" || status === "jaFez"}
        className={`flex items-center gap-1.5 text-xs transition-colors disabled:cursor-not-allowed
          ${status === "ok"    ? "text-green-500" :
            status === "jaFez" ? "text-gray-600"  :
            status === "erro"  ? "text-red-400 hover:text-red-300" :
            "text-gray-600 hover:text-red-400"}`}
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Flag size={12} />
        )}
        {labels[status]}
      </button>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
