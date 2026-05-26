// ============================================================
// Detecção automática de categoria por palavras-chave
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

export function detectarCategoria(titulo: string, descricao?: string): string {
  const texto = `${titulo} ${descricao ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const pontuacao: Record<string, number> = {};

  for (const [cat, keywords] of Object.entries(CATEGORIAS_KEYWORDS)) {
    pontuacao[cat] = 0;
    for (const kw of keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (texto.includes(kwNorm)) {
        pontuacao[cat] += kwNorm.length > 6 ? 2 : 1;
      }
    }
  }

  const melhor = Object.entries(pontuacao).sort((a, b) => b[1] - a[1])[0];
  return melhor[1] > 0 ? melhor[0] : "eletronicos";
}
