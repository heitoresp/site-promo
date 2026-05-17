# 🔥 PromoHot — Guia de Setup Completo

## Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com) (grátis)
- Conta na [Vercel](https://vercel.com) (grátis)
- Repositório no GitHub

---

## 1. Supabase — Criar o banco

### 1.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) → **New Project**
2. Escolha uma senha forte para o banco (guarde!)
3. Aguarde o projeto subir (~2 min)

### 1.2 Rodar o schema
1. No painel do Supabase, vá em **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique **Run**

### 1.3 Habilitar Realtime
No SQL Editor, rode:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE promos;
```

### 1.4 Pegar as chaves
Vá em **Settings → API** e copie:
- `URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha)

### 1.5 Configurar Auth (magic link)
- Vá em **Authentication → URL Configuration**
- Adicione `http://localhost:3000` em **Site URL**
- Em **Redirect URLs** adicione `http://localhost:3000/api/auth/callback`

---

## 2. Configurar o projeto localmente

```bash
# Clone o repo
git clone https://github.com/SEU_USUARIO/site-promos.git
cd site-promos

# Instale dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves do Supabase

# Gere um API_SECRET seguro
openssl rand -base64 32
# Cole o resultado em API_SECRET no .env.local

# Rode em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

---

## 3. Testar a API

### Criar uma promo de teste (Insomnia/cURL):
```bash
curl -X POST http://localhost:3000/api/promos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_API_SECRET" \
  -d '{
    "titulo": "Fone Sony WH-1000XM5",
    "preco_promo": 1299.90,
    "preco_original": 2499.00,
    "link_afiliado": "https://amzn.to/exemplo",
    "loja": "amazon",
    "categoria": "eletronicos",
    "imagem_url": "https://m.media-amazon.com/images/I/exemplo.jpg",
    "origem": "whatsapp_bot"
  }'
```

### Buscar promos:
```bash
curl "http://localhost:3000/api/promos?categoria=eletronicos&limite=10"
```

---

## 4. Deploy na Vercel

1. Push o projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com) → **Add New Project**
3. Importe o repositório do GitHub
4. Configure as **Environment Variables** (as mesmas do `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `API_SECRET`
   - `NEXT_PUBLIC_APP_URL` → URL da Vercel (ex: `https://seu-site.vercel.app`)
   - `NEXT_PUBLIC_APP_NAME` → Nome do site (ex: `PromoHot`)
5. Clique **Deploy**

### Após o deploy:
- Volte no Supabase → **Authentication → URL Configuration**
- Adicione a URL da Vercel em **Site URL** e **Redirect URLs**

---

## 5. Integrar o bot do WhatsApp

### Payload que o bot deve enviar:

```python
import requests

API_URL    = "https://seu-site.vercel.app/api/promos"
API_SECRET = "SEU_API_SECRET"

def postar_promo(titulo, preco_promo, link_afiliado, preco_original=None,
                 loja="outros", categoria="geral", imagem_url=None, cupom=None):
    payload = {
        "titulo":         titulo,
        "preco_promo":    preco_promo,
        "link_afiliado":  link_afiliado,
        "origem":         "whatsapp_bot",
    }
    if preco_original: payload["preco_original"] = preco_original
    if loja:           payload["loja"]           = loja
    if categoria:      payload["categoria"]      = categoria
    if imagem_url:     payload["imagem_url"]     = imagem_url
    if cupom:          payload["cupom"]          = cupom

    res = requests.post(
        API_URL,
        json=payload,
        headers={"Authorization": f"Bearer {API_SECRET}"},
        timeout=10
    )
    res.raise_for_status()
    return res.json()
```

### Lojas disponíveis (campo `loja`):
`amazon`, `mercado-livre`, `shopee`, `magalu`, `americanas`, `casas-bahia`, `aliexpress`, `kabum`, `ponto`, `outros`

### Categorias disponíveis (campo `categoria`):
`geral`, `eletronicos`, `informatica`, `games`, `casa`, `moda`, `beleza`, `esportes`, `alimentacao`, `viagens`, `livros`, `saude`, `bebes`, `pets`, `outros`

---

## 6. Painel Admin

- Acesse `https://seu-site.vercel.app/admin`
- Faça login com magic link (seu email)
- Use o botão **Nova Promo** para adicionar promos manuais
- A tabela mostra todas as promos, com botões para ativar/desativar/deletar

---

## 7. Domínio próprio (opcional)

1. Compre um domínio no [Registro.br](https://registro.br) ou [Cloudflare](https://cloudflare.com) (~R$40/ano)
2. Na Vercel → **Settings → Domains** → adicione seu domínio
3. Configure os registros DNS conforme instruído
4. Atualize `NEXT_PUBLIC_APP_URL` na Vercel

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── page.tsx                    # Feed principal
│   ├── layout.tsx                  # Layout raiz
│   ├── globals.css                 # Estilos globais + animações
│   ├── api/
│   │   ├── promos/
│   │   │   ├── route.ts            # GET + POST /api/promos
│   │   │   └── [id]/click/route.ts # PATCH — incrementa cliques
│   │   └── auth/callback/route.ts  # Callback do Supabase Auth
│   ├── promo/[id]/page.tsx         # Página individual da promo
│   ├── categoria/[slug]/page.tsx   # Feed por categoria
│   ├── loja/[slug]/page.tsx        # Feed por loja
│   └── admin/
│       ├── page.tsx                # Painel admin (server)
│       ├── layout.tsx
│       ├── AdminDashboard.tsx      # Dashboard (client)
│       └── login/page.tsx         # Login com magic link
├── components/
│   ├── Header.tsx                  # Header com busca
│   ├── PromoCard.tsx               # Card de promo + skeleton
│   ├── PromoFeedRealtime.tsx       # Feed com Supabase Realtime
│   └── CategoriaNav.tsx            # Pills de categoria
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser (anon)
│   │   └── server.ts               # Cliente server + service_role
│   └── utils.ts                    # Formatadores e helpers
├── middleware.ts                   # Proteção da rota /admin
└── types/promo.ts                  # Tipos TypeScript
```
