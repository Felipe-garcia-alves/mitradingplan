// Mi Trading Plan - importação de operações
//
// Dois formatos, detectados pelo conteúdo (lerArquivo):
//
// 1) B3 — relatório "Operações" em .csv (Profit e plataformas com o mesmo relatório):
//      Conta: 248031            ← cabeçalho opcional
//      Ativo;Abertura;Fechamento;...;Qtd Compra;Qtd Venda;Lado;Preço Compra;Preço Venda;...;Res. Operação;...
//    O resultado é o bruto da plataforma (sem corretagem/emolumentos).
//
// 2) Forex — "Relatório do Histórico" do MetaTrader 5 em .html (UTF-16), seção Posições:
//      Horário | Position | Ativo | Tipo | Volume | Preço | S/L | T/P | Horário | Preço | Comissão | Swap | Lucro
//    O resultado é o líquido (lucro + comissão + swap), igual ao que entra no saldo.
//    Os horários vêm no fuso do servidor e são convertidos para o fuso do usuário.
//
// Cada linha é UMA operação (não o total do dia).

// Vencimento dos futuros (WINZ26 → WIN). Ações e demais ativos ficam como vieram.
const RAIZ_FUTURO = /^(WIN|WDO|IND|DOL|BIT|WSP|ISP|BGI|CCM|ICF)[FGHJKMNQUVXZ]\d{2}$/;

export function ativoImportado(codigo) {
  const c = String(codigo || "").trim().toUpperCase();
  const m = c.match(RAIZ_FUTURO);
  return m ? m[1] : c;
}

// "209.060,00" → 209060 · "-54,00" → -54
function numeroBR(v) {
  const s = String(v || "").trim().replace(/\./g, "").replace(",", ".");
  if (s === "" || s === "-") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Relatório do MT5 vem em UTF-16 (com BOM); .csv do Windows em ANSI (cp1252); tenta UTF-8 no meio
export function decodificarArquivo(buffer) {
  const b = new Uint8Array(buffer.slice(0, 2));
  if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder("utf-16le").decode(buffer);
  if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder("utf-16be").decode(buffer);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1252").decode(buffer); }
}

// Nome de coluna sem acento/caixa: "Preço Compra" → "preco compra"
function chave(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.%() ]/gi, "").toLowerCase().trim();
}

// Retorna { conta, operacoes: [{ data, horario, abertura, ativo, codigo, lado, contratos, pontos, resultado, tipo }], erro, repetidas }
export function lerOperacoes(texto) {
  const linhas = String(texto || "").trimStart().split(/\r?\n/);
  const conta = (linhas.find(l => /^\s*conta\s*:/i.test(l)) || "").split(":")[1]?.trim() || "";
  const iCab = linhas.findIndex(l => chave(l.split(";")[0]) === "ativo");
  if (iCab < 0) return { conta, operacoes: [], erro: "Não encontrei a tabela de operações neste arquivo (falta a linha de cabeçalho começando com \"Ativo\")." };

  const cab = linhas[iCab].split(";").map(chave);
  const col = (...nomes) => { for (const n of nomes) { const i = cab.indexOf(n); if (i >= 0) return i; } return -1; };
  const C = {
    ativo: col("ativo"), abertura: col("abertura"), fechamento: col("fechamento"),
    qtdC: col("qtd compra"), qtdV: col("qtd venda"), lado: col("lado"),
    pc: col("preco compra"), pv: col("preco venda"),
    res: col("res. operacao", "res. intervalo bruto", "resultado"),
  };
  if (C.ativo < 0 || C.abertura < 0 || C.res < 0)
    return { conta, operacoes: [], erro: "O arquivo não tem as colunas esperadas (Ativo, Abertura e Res. Operação)." };

  // O Profit às vezes repete a mesma operação em duas linhas (só muda "Médio", TET vem "-").
  // Mesma abertura e fechamento até o segundo, com mesmas quantidades, preços e resultado = cópia.
  const vistas = new Set();
  let repetidas = 0;
  const operacoes = [];
  for (const linha of linhas.slice(iCab + 1)) {
    const c = linha.split(";");
    if (!c[C.ativo]?.trim()) continue;
    const m = (c[C.abertura] || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    const resultado = numeroBR(c[C.res]);
    if (!m || resultado === null) continue;
    const id = [C.ativo, C.abertura, C.fechamento, C.qtdC, C.qtdV, C.lado, C.pc, C.pv, C.res]
      .map(i => (c[i] || "").trim().toUpperCase()).join(";");
    if (vistas.has(id)) { repetidas++; continue; }
    vistas.add(id);
    const [, dd, mm, aaaa, hh, mi, ss = "00"] = m;
    const pc = numeroBR(c[C.pc]), pv = numeroBR(c[C.pv]);
    const qtd = numeroBR(c[C.qtdC]) ?? numeroBR(c[C.qtdV]);
    const lado = (c[C.lado] || "").trim().toUpperCase();
    operacoes.push({
      mercado: "B3",
      data: aaaa + "-" + mm + "-" + dd,
      horario: hh + ":" + mi,
      abertura: hh + ":" + mi + ":" + ss,
      codigo: c[C.ativo].trim().toUpperCase(),
      ativo: ativoImportado(c[C.ativo]),
      lado: lado === "C" ? "Compra" : lado === "V" ? "Venda" : "",
      contratos: qtd ? Math.round(qtd) : null,
      // Preço de venda − preço de compra = pontos ganhos, seja a operação comprada ou vendida
      pontos: pc !== null && pv !== null ? Math.round((pv - pc) * 100) / 100 : null,
      resultado,
      tipo: resultado >= 0 ? "WIN" : "LOSS",
    });
  }
  if (!operacoes.length) return { conta, operacoes, erro: "Nenhuma operação encontrada no arquivo." };
  return { conta, operacoes, erro: "", plataforma: "B3", moeda: "R$", repetidas };
}

// ── MetaTrader 5 ────────────────────────────────────────────────

// Servidores MT5 de Forex (Pepperstone e a maioria) usam GMT+2, e GMT+3 no horário de verão dos EUA
// (2º domingo de março até o 1º domingo de novembro).
function offsetServidorMT5(ano, mes, dia) {
  const domingo = (m, n) => { const d = new Date(Date.UTC(ano, m, 1)); return 1 + ((7 - d.getUTCDay()) % 7) + (n - 1) * 7; };
  const ini = Date.UTC(ano, 2, domingo(2, 2)), fim = Date.UTC(ano, 10, domingo(10, 1));
  const t = Date.UTC(ano, mes - 1, dia);
  return t >= ini && t < fim ? 3 : 2;
}

// "2026.07.23 18:43:52" (horário do servidor) → data/hora no fuso de quem está usando o app
function horarioMT5(s) {
  const m = String(s || "").trim().match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [a, me, d, h, mi, ss = 0] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(a, me - 1, d, h, mi, ss) - offsetServidorMT5(a, me, d) * 3600e3);
  const p = n => String(n).padStart(2, "0");
  return {
    data: dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate()),
    horario: p(dt.getHours()) + ":" + p(dt.getMinutes()),
    abertura: p(dt.getHours()) + ":" + p(dt.getMinutes()) + ":" + p(dt.getSeconds()),
  };
}

// "1 234.56" → 1234.56
function numeroMT5(v) {
  const n = parseFloat(String(v || "").replace(/\s/g, "")); // \s também cobre o espaço inseparável
  return isNaN(n) ? null : n;
}

// Tamanho do pip: pares com JPY 0.01, demais pares 0.0001, ouro 0.1, prata 0.01; índices/outros em pontos (1)
function tamanhoPip(ativo) {
  if (/^XAU/.test(ativo)) return 0.1;
  if (/^XAG/.test(ativo)) return 0.01;
  if (/^[A-Z]{6}$/.test(ativo)) return /JPY/.test(ativo) ? 0.01 : 0.0001;
  return 1;
}

const textoCelula = html => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

export function lerMT5(html) {
  const contaTxt = textoCelula((html.match(/(?:Conta|Account):\s*<\/th>\s*<th[^>]*>([\s\S]*?)<\/th>/i) || [])[1] || "");
  const conta = (contaTxt.match(/^\d+/) || [""])[0];
  const moeda = (contaTxt.match(/\(([A-Z]{3})/) || [])[1] || "USD";

  // Só a seção Posições (vai até o próximo título de seção, ex.: Ordens)
  const linhas = html.split(/<tr[\s>]/i).slice(1);
  const iSecao = linhas.findIndex(l => /<th[^>]*>[\s\S]*?(Posi[çc][õo]es|Positions)/i.test(l));
  if (iSecao < 0) return { conta, operacoes: [], erro: "Não encontrei a seção \"Posições\" no relatório. No MT5, gere o relatório com o Histórico em modo Posições." };

  const operacoes = [];
  for (const l of linhas.slice(iSecao + 1)) {
    if (/<th[\s>]/i.test(l)) break; // próxima seção
    const celulas = [...l.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)]
      .filter(([, attrs]) => !/class\s*=\s*"hidden"/i.test(attrs))
      .map(([, , conteudo]) => textoCelula(conteudo));
    if (celulas.length < 13 || !/^\d{4}\.\d{2}\.\d{2}/.test(celulas[0])) continue;
    const [abre, ticket, simbolo, tipo, volume, precoIn, sl, tp, fecha, precoOut, comissao, swap, lucro] = celulas;
    const ab = horarioMT5(abre), fe = horarioMT5(fecha);
    const bruto = numeroMT5(lucro);
    if (!ab || bruto === null) continue;
    const compra = /^(buy|compra)/i.test(tipo);
    const ativo = String(simbolo).toUpperCase().replace(/[.\-_#].*$/, ""); // tira sufixos de corretora (EURUSD.a)
    const pi = numeroMT5(precoIn), po = numeroMT5(precoOut);
    const resultado = Math.round((bruto + (numeroMT5(comissao) || 0) + (numeroMT5(swap) || 0)) * 100) / 100;
    operacoes.push({
      mercado: "Forex",
      ...ab,
      fechamento: fe ? fe.data + " " + fe.abertura : "",
      posicao: ticket,
      codigo: simbolo,
      ativo,
      lado: compra ? "Compra" : "Venda",
      contratos: numeroMT5(volume),
      // Pips ganhos (ou pontos, em índices): positivo quando o preço andou a favor
      pontos: pi !== null && po !== null ? Math.round((po - pi) * (compra ? 1 : -1) / tamanhoPip(ativo) * 10) / 10 : null,
      resultado,
      bruto,
      comissao: numeroMT5(comissao) || 0,
      swap: numeroMT5(swap) || 0,
      stop: numeroMT5(sl),
      alvo: numeroMT5(tp),
      tipo: resultado >= 0 ? "WIN" : "LOSS",
    });
  }
  if (!operacoes.length) return { conta, operacoes, erro: "Nenhuma posição fechada encontrada no relatório." };
  return { conta, operacoes, erro: "", plataforma: "MT5", moeda: moeda === "USD" ? "$" : moeda + " " };
}

// Detecta o formato pelo conteúdo
export function lerArquivo(texto) {
  return /<html|<table/i.test(texto) ? lerMT5(texto) : lerOperacoes(texto);
}

// Mesma operação já registrada? (importada antes, ou digitada à mão com mesmo horário/ativo/resultado)
export function jaRegistrada(op, tradesDoDia) {
  return (tradesDoDia || []).some(t =>
    (op.posicao && t.posicao === op.posicao) ||
    (t.abertura && t.abertura === op.abertura && t.ativo === op.ativo) ||
    (t.horario === op.horario && t.ativo === op.ativo && Number(t.resultado) === op.resultado)
  );
}
