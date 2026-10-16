// Mi Trading Plan - importação de operações (relatório "Operações" exportado em .csv)
//
// Formato esperado (Profit e plataformas que usam o mesmo relatório):
//   Conta: 248031            ← cabeçalho opcional
//   Ativo;Abertura;Fechamento;...;Qtd Compra;Qtd Venda;Lado;Preço Compra;Preço Venda;...;Res. Operação;...
//   WINZ26;16/10/2026 09:19:43;...
// Cada linha é UMA operação (não o total do dia). O resultado é o bruto da plataforma.

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

// Arquivos do Windows vêm em ANSI (cp1252); tenta UTF-8 primeiro
export function decodificarArquivo(buffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1252").decode(buffer); }
}

// Nome de coluna sem acento/caixa: "Preço Compra" → "preco compra"
function chave(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.%() ]/gi, "").toLowerCase().trim();
}

// Retorna { conta, operacoes: [{ data, horario, abertura, ativo, codigo, lado, contratos, pontos, resultado, tipo }], erro }
export function lerOperacoes(texto) {
  const linhas = String(texto || "").trimStart().split(/\r?\n/);
  const conta = (linhas.find(l => /^\s*conta\s*:/i.test(l)) || "").split(":")[1]?.trim() || "";
  const iCab = linhas.findIndex(l => chave(l.split(";")[0]) === "ativo");
  if (iCab < 0) return { conta, operacoes: [], erro: "Não encontrei a tabela de operações neste arquivo (falta a linha de cabeçalho começando com \"Ativo\")." };

  const cab = linhas[iCab].split(";").map(chave);
  const col = (...nomes) => { for (const n of nomes) { const i = cab.indexOf(n); if (i >= 0) return i; } return -1; };
  const C = {
    ativo: col("ativo"), abertura: col("abertura"), qtdC: col("qtd compra"), qtdV: col("qtd venda"), lado: col("lado"),
    pc: col("preco compra"), pv: col("preco venda"),
    res: col("res. operacao", "res. intervalo bruto", "resultado"),
  };
  if (C.ativo < 0 || C.abertura < 0 || C.res < 0)
    return { conta, operacoes: [], erro: "O arquivo não tem as colunas esperadas (Ativo, Abertura e Res. Operação)." };

  const operacoes = [];
  for (const linha of linhas.slice(iCab + 1)) {
    const c = linha.split(";");
    if (!c[C.ativo]?.trim()) continue;
    const m = (c[C.abertura] || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    const resultado = numeroBR(c[C.res]);
    if (!m || resultado === null) continue;
    const [, dd, mm, aaaa, hh, mi, ss = "00"] = m;
    const pc = numeroBR(c[C.pc]), pv = numeroBR(c[C.pv]);
    const qtd = numeroBR(c[C.qtdC]) ?? numeroBR(c[C.qtdV]);
    const lado = (c[C.lado] || "").trim().toUpperCase();
    operacoes.push({
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
  return { conta, operacoes, erro: "" };
}

// Mesma operação já registrada? (importada antes, ou digitada à mão com mesmo horário/ativo/resultado)
export function jaRegistrada(op, tradesDoDia) {
  return (tradesDoDia || []).some(t =>
    (t.abertura && t.abertura === op.abertura && t.ativo === op.ativo) ||
    (t.horario === op.horario && t.ativo === op.ativo && Number(t.resultado) === op.resultado)
  );
}
