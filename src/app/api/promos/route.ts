import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { CreatePromoPayload } from "@/types/promo";
import { calcularTemperatura } from "@/lib/temperatura";

// ============================================================
// Helpers
// ============================================================
function autenticar(request: NextRequest): boolean {
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return token === process.env.API_SECRET;
}

function erroJSON(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

// ============================================================
// Detecção automática de categoria por palavras-chave
// Retorna a categoria mais provável com base no título + descrição
// ============================================================
const CATEGORIAS_KEYWORDS: Record<string, string[]> = {
  eletronicos: [
    "iphone", "samsung", "xiaomi", "motorola", "celular", "smartphone",
    "tv", "televisão", "televisao", "smart tv", "monitor", "notebook",
    "laptop", "tablet", "ipad", "airpods", "fone", "headphone", "earbuds",
    "headset", "câmera", "camera", "impressora", "projetor", "drone", "smartwatch",
    "alexa", "echo", "kindle", "playstation", "xbox", "nintendo switch",
    "ssd", "hd", "pendrive", "carregador", "cabo usb", "roteador", "wifi",
    "mouse", "teclado", "webcam", "microfone", "caixa de som", "speaker",
    "ar condicionado", "ventilador", "purificador", "aspirador robô",
  ],
  moda: [
    "nike", "adidas", "puma", "mizuno", "vans", "converse", "fila",
    "tênis", "tenis", "sapato", "sandália", "sandalia", "bota", "chinelo",
    "camiseta", "camisa", "calça", "calca", "bermuda", "shorts", "vestido",
    "blusa", "moletom", "jaqueta", "casaco", "agasalho", "meias", "cueca",
    "sutiã", "sutia", "roupa", "moda", "roupas", "polo", "regata",
    "legging", "conjunto", "pijama", "mochila", "bolsa", "carteira",
    "relógio", "relogio", "óculos", "oculos", "perfume", "cinto",
  ],
  games: [
    "playstation", "ps4", "ps5", "xbox", "nintendo", "switch", "game",
    "jogo", "jogos", "gaming", "gamer", "headset gamer", "controle",
    "gamepad", "steam", "epic games", "minecraft", "fifa", "call of duty",
    "gta", "fortnite", "valorant", "league of legends", "cadeira gamer",
    "monitor gamer", "teclado gamer", "mouse gamer", "placa de vídeo",
    "rtx", "gtx", "processador", "ryzen", "intel", "memória ram",
  ],
  casa: [
    "geladeira", "fogão", "fogao", "forno", "microondas", "liquidificador",
    "batedeira", "cafeteira", "air fryer", "airfryer", "fritadeira",
    "panela", "frigideira", "escorredor", "coador", "sofá", "sofa",
    "cama", "colchão", "colchao", "travesseiro", "edredom", "lençol",
    "lencol", "toalha", "tapete", "cortina", "luminária", "luminaria",
    "abajur", "espelho", "estante", "guarda-roupa", "armário", "armario",
    "mesa", "cadeira", "bancada", "churrasqueira", "ferro de passar",
    "máquina de lavar", "maquina lavar", "secadora", "louça", "limpeza",
    "vassoura", "rodo", "balde", "detergente", "sabão", "sabao",
  ],
  alimentacao: [
    "pizza", "hamburguer", "hambúrguer", "lanche", "sushi", "frango",
    "carne", "peixe", "açaí", "acai", "sorvete", "chocolate", "biscoito",
    "bolacha", "salgadinho", "pipoca", "café", "cafe", "leite", "iogurte",
    "queijo", "presunto", "whey", "proteína", "proteina", "suplemento",
    "vitamina", "energético", "energetico", "refrigerante", "cerveja",
    "vinho", "whisky", "ifood", "rappi", "delivery", "restaurante",
    "lanchonete", "mercado", "supermercado", "hortifruti", "verdura",
    "fruta", "legume", "arroz", "feijão", "feijao", "macarrão", "macarrao",
    "azeite", "molho", "tempero", "snack",
  ],
};

function detectarCategoria(titulo: string, descricao?: string): string {
  const texto = `${titulo} ${descricao ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const pontuacao: Record<string, number> = {};

  for (const [cat, keywords] of Object.entries(CATEGORIAS_KEYWORDS)) {
    pontuacao[cat] = 0;
    for (const kw of keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (texto.includes(kwNorm)) {
        // Palavras mais longas valem mais (mais específicas)
        pontuacao[cat] += kwNorm.length > 6 ? 2 : 1;
      }
    }
  }

  const melhor = Object.entries(pontuacao).sort((a, b) => b[1] - a[1])[0];

  // Só classifica se tiver pelo menos 1 match
  return melhor[1] > 0 ? melhor[0] : "eletronicos";
}

// ============================================================
// GET /api/promos — lista promos públicas com filtros
// ============================================================
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const categoria = searchParams.get("categoria");
  const loja      = searchParams.get("loja");
  const busca     = searchParams.get("busca");
  const hot       = searchParams.get("hot") === "true";
  const limite    = Math.min(parseInt(searchParams.get("limite") ?? "20"), 100);
  const pagina    = Math.max(parseInt(searchParams.get("pagina") ?? "1"), 1);
  const offset    = (pagina - 1) * limite;

  let query = supabase
    .from("promos")
    .select("*", { count: "exact" })
    .eq("ativo", true)
    .or("expira_em.is.null,expira_em.gt." + new Date().toISOString())
    .order("criado_em", { ascending: false })
    .range(offset, offset + limite - 1);

  if (categoria) query = query.eq("categoria", categoria);
  if (loja)      query = query.eq("loja", loja);

  if (busca) {
    query = query.textSearch("titulo", busca, {
      type: "websearch",
      config: "portuguese",
    });
  }

  if (hot) {
    // Promos com mais de 20 cliques nas últimas 24h = "hot"
    query = query.gt("cliques", 20);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[GET /api/promos]", error);
    return erroJSON("Erro interno ao buscar promos.", 500);
  }

  const total = count ?? 0;

  return NextResponse.json({
    promos: data,
    total,
    pagina,
    limite,
    total_paginas: Math.ceil(total / limite),
  });
}

// ============================================================
// POST /api/promos — cria uma promo (requer Bearer token)
// ============================================================
export async function POST(request: NextRequest) {
  if (!autenticar(request)) {
    return erroJSON("Não autorizado.", 401);
  }

  let body: CreatePromoPayload;
  try {
    body = await request.json();
  } catch {
    return erroJSON("JSON inválido.", 400);
  }

  // Validação mínima
  if (!body.titulo || !body.preco_promo || !body.link_afiliado) {
    return erroJSON(
      "Campos obrigatórios: titulo, preco_promo, link_afiliado.",
      422
    );
  }

  const supabase = createServiceRoleClient();

  // Calcula temperatura em paralelo com a inserção
  const temperatura = await calcularTemperatura(body.titulo, body.preco_promo);

  const { data, error } = await supabase
    .from("promos")
    .insert({
      titulo:         body.titulo,
      descricao:      body.descricao ?? null,
      preco_original: body.preco_original ?? null,
      preco_promo:    body.preco_promo,
      link_afiliado:  body.link_afiliado,
      loja:           body.loja ?? "outros",
      categoria:      body.categoria ?? detectarCategoria(body.titulo, body.descricao),
      cupom:          body.cupom ?? null,
      imagem_url:     body.imagem_url ?? null,
      origem:         body.origem ?? "whatsapp_bot",
      expira_em:      body.expira_em ?? null,
      temperatura,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/promos]", error);
    return erroJSON("Erro ao criar promo.", 500);
  }

  return NextResponse.json({ promo: data }, { status: 201 });
}
