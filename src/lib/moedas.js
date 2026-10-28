// Mi Trading Plan - totais por moeda
//
// B3 opera em R$; Forex, Cripto e Americano em $. Os totais de dia/semana/mês
// nunca somam as duas moedas: mostram "R$ 120 · $ 15" quando há as duas.

export function moedaDoMercado(mercado) {
  return mercado === "B3" ? "R$" : "$";
}

// [{ moeda:"R$", valor }, { moeda:"$", valor }] — só as moedas que tiveram operação (R$ primeiro)
export function somaPorMoeda(trades) {
  const soma = {};
  for (const t of trades || []) {
    const m = moedaDoMercado(t.mercado);
    soma[m] = (soma[m] || 0) + (Number(t.resultado) || 0);
  }
  return ["R$", "$"].filter(m => m in soma).map(m => ({ moeda: m, valor: soma[m] }));
}

// "+R$ 1.234,50" · compacto: "+R$1,2k" / "+$45" / "-$0,99"
export function fmtMoeda(valor, moeda, { compacto = false } = {}) {
  const s = valor >= 0 ? "+" : "-";
  const a = Math.abs(valor);
  if (compacto) {
    // centavos só quando o valor é pequeno (contas de Forex com poucos dólares)
    const txt = a < 10 ? a.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : a < 1000 ? a.toFixed(0) : (a / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "k";
    return s + moeda + txt;
  }
  return s + moeda + " " + a.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Cor do conjunto: verde se só ganhou, vermelho se só perdeu, âmbar se uma moeda ganhou e a outra perdeu
export const corValor = v => v > 0 ? "var(--accent)" : v < 0 ? "var(--neg)" : "var(--text-mute)";
export function corDasPartes(partes) {
  const ganhou = partes.some(p => p.valor > 0), perdeu = partes.some(p => p.valor < 0);
  return ganhou && perdeu ? "var(--warn)" : ganhou ? "var(--accent)" : perdeu ? "var(--neg)" : "var(--text-mute)";
}
