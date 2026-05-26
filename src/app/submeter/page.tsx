"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { LoginModal } from "@/components/LoginModal";
import { Header } from "@/components/Header";
import {
  Link2, Loader2, CheckCircle, ArrowLeft, Sparkles,
  Tag, DollarSign, ImageIcon, AlignLeft, Store, ChevronDown,
} from "lucide-react";

const CATEGORIAS = [
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "moda",        label: "Moda" },
  { value: "games",       label: "Games" },
  { value: "casa",        label: "Casa & Cozinha" },
  { value: "alimentacao", label: "Alimentação" },
];

export default function SubmeterPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);

  // Campos do formulário
  const [link,         setLink]         = useState("");
  const [titulo,       setTitulo]       = useState("");
  const [precoPromo,   setPrecoPromo]   = useState("");
  const [precoOriginal, setPrecoOriginal] = useState("");
  const [cupom,        setCupom]        = useState("");
  const [descricao,    setDescricao]    = useState("");
  const [imagemUrl,    setImagemUrl]    = useState("");
  const [loja,         setLoja]         = useState("");
  const [categoria,    setCategoria]    = useState("eletronicos");

  // Estado
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [sucesso,      setSucesso]      = useState(false);
  const [erro,         setErro]         = useState("");
  const [linkAfiliado, setLinkAfiliado] = useState<string | null>(null);

  const linkInputRef = useRef<HTMLInputElement>(null);
  const fetchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fetch ao colar/digitar URL
  useEffect(() => {
    if (!link || !link.startsWith("http")) return;

    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(async () => {
      setFetchingMeta(true);
      try {
        const res  = await fetch(`/api/promos/preview-url?url=${encodeURIComponent(link)}`);
        const data = await res.json();
        if (data.titulo && !titulo) setTitulo(data.titulo);
        if (data.imagem && !imagemUrl) setImagemUrl(data.imagem);
        if (data.descricao && !descricao) setDescricao(data.descricao);
        if (data.loja && !loja) setLoja(data.loja);
      } catch {
        // silencioso
      } finally {
        setFetchingMeta(false);
      }
    }, 800);

    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setShowLogin(true); return; }

    setSubmitting(true);
    setErro("");

    try {
      const res = await fetch("/api/promos/submeter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link,
          titulo,
          preco_promo:    parseFloat(precoPromo.replace(",", ".")),
          preco_original: precoOriginal ? parseFloat(precoOriginal.replace(",", ".")) : undefined,
          cupom:          cupom || undefined,
          descricao:      descricao || undefined,
          imagem_url:     imagemUrl || undefined,
          loja:           loja || undefined,
          categoria,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao enviar"); return; }

      setLinkAfiliado(data.linkAfiliado);
      setSucesso(true);
    } catch {
      setErro("Erro de conexão, tente novamente");
    } finally {
      setSubmitting(false);
    }
  }

  const desconto =
    precoOriginal && precoPromo
      ? Math.round((1 - parseFloat(precoPromo) / parseFloat(precoOriginal)) * 100)
      : null;

  if (sucesso) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Promo enviada!</h1>
            <p className="text-gray-400 mt-2 text-sm">
              Sua promo está em análise. Assim que for aprovada, aparecerá no site para todo mundo ver 🔥
            </p>
          </div>
          {linkAfiliado && linkAfiliado !== link && (
            <div className="glass-card p-4 text-left space-y-1">
              <p className="text-xs text-gray-500 font-medium">Link transformado em afiliado:</p>
              <p className="text-xs text-brand-400 break-all">{linkAfiliado}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setSucesso(false); setLink(""); setTitulo(""); setPrecoPromo(""); setPrecoOriginal(""); setCupom(""); setDescricao(""); setImagemUrl(""); setLoja(""); }}
              className="btn-promo"
            >
              Enviar outra promo
            </button>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Voltar ao feed
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Voltar */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 border border-brand-500/20 flex items-center justify-center">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Enviar Promo</h1>
            <p className="text-sm text-gray-500">Cole o link do produto e a gente faz o resto</p>
          </div>
        </div>

        {/* Aviso login */}
        {!authLoading && !user && (
          <div className="glass-card p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400">Você precisa estar logado para enviar promos</p>
            <button onClick={() => setShowLogin(true)} className="btn-promo py-1.5 px-4 text-sm shrink-0">
              Entrar
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Link da promo */}
          <div className="glass-card p-5 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Link2 size={13} /> Link do produto *
            </label>
            <div className="relative">
              <input
                ref={linkInputRef}
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://www.amazon.com.br/produto..."
                required
                className="search-input w-full pr-10"
              />
              {fetchingMeta && (
                <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 animate-spin" />
              )}
            </div>
            {fetchingMeta && (
              <p className="text-xs text-brand-400 flex items-center gap-1">
                <Sparkles size={11} /> Buscando informações do produto...
              </p>
            )}
            <p className="text-xs text-gray-600">
              Amazon, Shopee, Mercado Livre, Magalu, AliExpress, Netshoes e mais
            </p>
          </div>

          {/* Preview da imagem + título */}
          {(imagemUrl || titulo) && (
            <div className="glass-card p-4 flex gap-4 items-start animate-fade-in">
              {imagemUrl && (
                <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-black/30 border border-white/10">
                  <Image src={imagemUrl} alt={titulo} fill className="object-cover" sizes="64px"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {titulo && <p className="text-sm text-gray-300 line-clamp-2 font-medium">{titulo}</p>}
                {loja && <p className="text-xs text-gray-500 mt-1">{loja}</p>}
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle size={11} /> Dados preenchidos automaticamente
                </p>
              </div>
            </div>
          )}

          {/* Título */}
          <div className="glass-card p-5 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <AlignLeft size={13} /> Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Fone Samsung Galaxy Buds2 Pro"
              required
              maxLength={200}
              className="search-input w-full"
            />
          </div>

          {/* Preços */}
          <div className="glass-card p-5 space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={13} /> Preços *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Preço com desconto *</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={precoPromo}
                    onChange={e => setPrecoPromo(e.target.value)}
                    placeholder="199,90"
                    required
                    step="0.01"
                    min="0"
                    className="search-input w-full pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Preço original</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={precoOriginal}
                    onChange={e => setPrecoOriginal(e.target.value)}
                    placeholder="349,90"
                    step="0.01"
                    min="0"
                    className="search-input w-full pl-9"
                  />
                </div>
              </div>
            </div>
            {desconto !== null && desconto > 0 && (
              <p className="text-sm text-green-400 font-bold animate-fade-in">
                🔥 {desconto}% de desconto!
              </p>
            )}
          </div>

          {/* Cupom */}
          <div className="glass-card p-5 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Tag size={13} /> Cupom <span className="text-gray-600 font-normal normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={cupom}
              onChange={e => setCupom(e.target.value.toUpperCase())}
              placeholder="PROMO10"
              maxLength={50}
              className="search-input w-full font-mono tracking-widest"
            />
          </div>

          {/* Loja + Categoria */}
          <div className="glass-card p-5 space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Store size={13} /> Loja & Categoria
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={loja}
                onChange={e => setLoja(e.target.value)}
                placeholder="Amazon, Shopee..."
                maxLength={50}
                className="search-input w-full"
              />
              <div className="relative">
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="search-input w-full appearance-none pr-8"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="glass-card p-5 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <AlignLeft size={13} /> Descrição <span className="text-gray-600 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes extras sobre a promo..."
              rows={3}
              maxLength={500}
              className="search-input w-full resize-none"
            />
          </div>

          {/* URL da imagem */}
          <div className="glass-card p-5 space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={13} /> URL da imagem <span className="text-gray-600 font-normal normal-case">(auto-preenchido)</span>
            </label>
            <input
              type="url"
              value={imagemUrl}
              onChange={e => setImagemUrl(e.target.value)}
              placeholder="https://..."
              className="search-input w-full text-xs"
            />
          </div>

          {/* Erro */}
          {erro && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {erro}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !link || !titulo || !precoPromo}
            className="btn-promo w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando...</>
            ) : (
              <><Sparkles size={16} /> Enviar Promo</>
            )}
          </button>

          <p className="text-xs text-center text-gray-600">
            Sua promo será revisada antes de aparecer no site.
            Links são convertidos para afiliado automaticamente.
          </p>
        </form>
      </main>
    </div>
  );
}
