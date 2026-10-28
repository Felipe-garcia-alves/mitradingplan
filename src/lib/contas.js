// Mi Trading Plan - contas de trading (ex.: conta real, simulador, mesa proprietária)
//
// Ficam em config.contas: [{ id, nome, tipo, padrao, mercado?, bancaInicial?, limites? }].
// A "Conta Principal" (id "principal") é a conta original do app: as bancas por
// mercado (config.bancaB3, bancaForex...) e os trades antigos, sem conta, são dela.
// Contas extras têm um mercado, banca inicial e limites de risco próprios.
// "padrao" só decide qual conta vem selecionada ao registrar no Diário.

export const ID_PRINCIPAL = "principal";

export const TIPOS_CONTA = {
  real:      { label:"Conta real",        cor:"var(--accent)" },
  simulador: { label:"Simulador",         cor:"var(--info)" },
  mesa:      { label:"Mesa proprietária", cor:"var(--warn)" },
};

export const LIMITES_PADRAO = { risco:1, meta:2, stop:3 }; // % da banca

const PRINCIPAL = { id:ID_PRINCIPAL, nome:"Conta Principal", tipo:"real", padrao:true };

export function listaContas(config) {
  const cs = config?.contas;
  if (!cs || cs.length === 0) return [PRINCIPAL];
  const comPrincipal = cs.some(c => c.id === ID_PRINCIPAL) ? cs : [PRINCIPAL, ...cs];
  return comPrincipal.some(c => c.padrao) ? comPrincipal : comPrincipal.map(c => ({ ...c, padrao: c.id === ID_PRINCIPAL }));
}

export function contaPadrao(config) {
  return listaContas(config).find(c => c.padrao);
}

// Trade sem conta = trade antigo = Conta Principal
export function contaDoTrade(t) {
  return t.conta || ID_PRINCIPAL;
}

export function limitesDaConta(config, contaId) {
  if (contaId === ID_PRINCIPAL) return { ...LIMITES_PADRAO, ...(config?.limites || {}) };
  const c = listaContas(config).find(x => x.id === contaId);
  return { ...LIMITES_PADRAO, ...(c?.limites || {}) };
}

// Grava a lista de contas garantindo que a Principal exista e só uma seja padrão
export function salvarContas(config, contas) {
  let lista = contas.some(c => c.id === ID_PRINCIPAL) ? contas : [PRINCIPAL, ...contas];
  if (!lista.some(c => c.padrao)) lista = lista.map(c => ({ ...c, padrao: c.id === ID_PRINCIPAL }));
  return { ...config, contas: lista };
}

// Recalcula os totais do dia a partir de um subconjunto dos trades
// (os totais do diário são sempre a soma dos trades daquele dia).
export function entradaFiltrada(e, filtro) {
  const trades = (e.trades || []).filter(filtro);
  const soma = m => trades.filter(t => t.mercado === m).reduce((s, t) => s + (t.resultado || 0), 0);
  const wins = trades.filter(t => t.tipo === "WIN").length;
  return {
    ...e,
    trades,
    numTrades: trades.length,
    totalPts: trades.reduce((s, t) => s + (t.pontos || 0), 0),
    totalB3: soma("B3"), totalForex: soma("Forex"), totalCripto: soma("Cripto"), totalAmericano: soma("Americano"),
    winRate: trades.length ? Math.round(wins / trades.length * 100) : undefined,
  };
}
