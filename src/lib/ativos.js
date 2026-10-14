// Mi Trading Plan - ativos por mercado (o que foi operado em cada trade)
//
// Cada trade guarda t.ativo (ex.: "WIN", "WDO", "EURUSD", "BTC").
// Trades antigos, sem ativo, aparecem como "Não informado" — não chutamos.

export const ATIVOS_SUGERIDOS = {
  B3:        [ { v:"WIN", l:"Mini Índice" }, { v:"WDO", l:"Mini Dólar" }, { v:"IND", l:"Índice cheio" }, { v:"DOL", l:"Dólar cheio" }, { v:"BIT", l:"Bitcoin futuro" } ],
  Forex:     [ { v:"EURUSD" }, { v:"GBPUSD" }, { v:"USDJPY" }, { v:"XAUUSD", l:"Ouro" }, { v:"US30", l:"Dow Jones" }, { v:"NAS100", l:"Nasdaq" } ],
  Cripto:    [ { v:"BTC" }, { v:"ETH" }, { v:"SOL" }, { v:"XRP" } ],
  Americano: [ { v:"SPY" }, { v:"QQQ" }, { v:"AAPL" }, { v:"NVDA" }, { v:"TSLA" } ],
};

export const SEM_ATIVO = "Não informado";

export function ativoDoTrade(t) {
  return (t.ativo || "").trim() || SEM_ATIVO;
}

export function normalizarAtivo(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

// Ativos já usados no mercado, do mais frequente para o menos
export function ativosUsados(entries, mercado) {
  const cont = {};
  Object.values(entries || {}).forEach(e => (e.trades || []).forEach(t => {
    if (t.mercado === mercado && t.ativo) cont[t.ativo] = (cont[t.ativo] || 0) + 1;
  }));
  return Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([a]) => a);
}

// Chips para o mercado: sugeridos + usados (sem repetir), usados primeiro
export function opcoesDeAtivo(entries, mercado) {
  const usados = ativosUsados(entries, mercado);
  const sugeridos = (ATIVOS_SUGERIDOS[mercado] || []).map(a => a.v);
  return [...new Set([...usados, ...sugeridos])];
}

export function rotuloAtivo(mercado, ativo) {
  return (ATIVOS_SUGERIDOS[mercado] || []).find(a => a.v === ativo)?.l || "";
}
