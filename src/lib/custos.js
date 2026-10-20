// Mi Trading Plan - custos operacionais (taxas da B3, corretagem, IRRF, zeragem)
//
// Configuração por conta: config.custos (Conta Principal) ou conta.custos (contas extras):
//   { automatico, porAtivo:{ WIN:0.5, ... }, corretagem, impostos, irrf, zeragem }
//   • porAtivo   — taxas da bolsa por contrato, ida e volta (registro + emolumentos)
//   • corretagem — por contrato, ida e volta; recebe os impostos (ISS + PIS/COFINS) por cima
//   • irrf       — 1% sobre o lucro líquido do dia ("dedo-duro"), só na B3
//   • zeragem    — taxa da zeragem compulsória da corretora, também com impostos
//
// Trade com desconto: { descontaCustos:true, bruto, custoContrato, irrf, custos, resultado }
//   resultado = bruto - custos. Assim banca, totais e gráficos usam o líquido sem mudar nada.
//   custoContrato é guardado no trade: mudar a taxa depois não altera operações antigas.
//
// Custos do dia ficam no registro do dia: entry.custosDia = { [carteira]: { zeragem, liquidoNota } }
//   • zeragem     — valor da taxa (com impostos) cobrada naquele dia
//   • liquidoNota — "Total líquido da nota" (+ crédito, − débito). Com ele, os custos do dia
//                   passam a ser exatamente bruto − líquido, e a banca bate com a corretora.
// Custos do dia são divididos entre as operações na proporção dos contratos.
import { ID_PRINCIPAL, listaContas } from "./contas";
import { listaCarteiras, tradeNaCarteira } from "./banca";

export const CUSTOS_PADRAO = { automatico:false, porAtivo:{ WIN:0.5 }, corretagem:0, impostos:9.65, irrf:false, zeragem:0 };

export const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

export function custosDaConta(config, contaId) {
  const proprio = contaId === ID_PRINCIPAL ? config?.custos : listaContas(config).find(c => c.id === contaId)?.custos;
  return { ...CUSTOS_PADRAO, ...(proprio || {}), porAtivo: { ...(proprio?.porAtivo || CUSTOS_PADRAO.porAtivo) } };
}

// Custo de um contrato, ida e volta
export function custoPorContrato(cfg, ativo) {
  const bolsa = Number(cfg.porAtivo?.[ativo]) || 0;
  const corretagem = (Number(cfg.corretagem) || 0) * (1 + (Number(cfg.impostos) || 0) / 100);
  return bolsa + corretagem;
}

export function valorZeragem(cfg) {
  return r2((Number(cfg.zeragem) || 0) * (1 + (Number(cfg.impostos) || 0) / 100));
}

// Ativo sem taxa configurada (e sem corretagem): o desconto ficaria zerado
export function semTaxa(cfg, ativo) {
  return !(Number(cfg.porAtivo?.[ativo]) > 0) && !(Number(cfg.corretagem) > 0);
}

// Marca um trade novo para ter os custos descontados (o valor final sai de recalcularCustos)
export function comDesconto(t, cfg) {
  const custoContrato = r2(custoPorContrato(cfg, t.ativo));
  const custos = r2((t.contratos || 1) * custoContrato);
  return { ...t, descontaCustos:true, bruto:t.resultado, custoContrato, irrf:!!cfg.irrf, custos, resultado:r2(t.resultado - custos) };
}

// Tira o desconto: o resultado volta a ser o bruto
export function semDesconto(t) {
  if (!t.descontaCustos) return t;
  const { descontaCustos, bruto, custoContrato, irrf, custos, ...resto } = t; // eslint-disable-line no-unused-vars
  return { ...resto, resultado: bruto };
}

// Divide `total` entre os trades na proporção dos contratos; o arredondamento fica no maior
function ratear(total, trades) {
  const pesos = trades.map(t => t.contratos || 1);
  const soma = pesos.reduce((s, p) => s + p, 0);
  const partes = pesos.map(p => r2(total * p / soma));
  const resto = r2(total - partes.reduce((s, p) => s + p, 0));
  if (resto) { const i = pesos.indexOf(Math.max(...pesos)); partes[i] = r2(partes[i] + resto); }
  return partes;
}

// Carteiras da B3 que têm operações no dia (onde entram zeragem, IRRF e a nota)
export function carteirasB3DoDia(config, trades) {
  return listaCarteiras(config).filter(c => c.mercado === "B3" && (trades || []).some(t => tradeNaCarteira(t, c)));
}

// Recalcula custos e resultado líquido dos trades do dia. Trades sem desconto não mudam.
export function recalcularCustos(trades, entry, config) {
  const lista = (trades || []).map(t => ({ ...t }));
  const custosDia = entry?.custosDia || {};
  const tocados = new Set();

  for (const cart of listaCarteiras(config)) {
    const doDia = lista.filter(t => tradeNaCarteira(t, cart));
    if (!doDia.length) continue;
    const dia = cart.mercado === "B3" ? custosDia[cart.key] || {} : {};

    if (typeof dia.liquidoNota === "number") {
      // Nota informada: todas as operações da carteira entram, e os custos fecham com a nota
      const alvo = doDia.filter(t => t.descontaCustos || typeof t.resultado === "number");
      // (quem ainda não tinha desconto ganha a taxa atual, para o caso de a nota ser removida)
      const cfg = custosDaConta(config, cart.contaId);
      alvo.forEach(t => { if (!t.descontaCustos) Object.assign(t, { descontaCustos:true, bruto:t.resultado, custoContrato:r2(custoPorContrato(cfg, t.ativo)), irrf:!!cfg.irrf }); });
      const total = r2(alvo.reduce((s, t) => s + t.bruto, 0) - dia.liquidoNota);
      ratear(total, alvo).forEach((c, i) => { alvo[i].custos = c; tocados.add(alvo[i]); });
      continue;
    }

    const alvo = doDia.filter(t => t.descontaCustos && typeof t.bruto === "number");
    if (!alvo.length) continue;
    alvo.forEach(t => { t.custos = r2((t.contratos || 1) * (t.custoContrato || 0)); tocados.add(t); });
    let extra = Number(dia.zeragem) || 0;
    if (cart.mercado === "B3" && alvo.some(t => t.irrf)) {
      const lucro = alvo.reduce((s, t) => s + t.bruto - t.custos, 0) - extra;
      if (lucro > 0) extra += r2(lucro * 0.01);
    }
    if (extra) ratear(r2(extra), alvo).forEach((c, i) => { alvo[i].custos = r2(alvo[i].custos + c); });
  }

  tocados.forEach(t => { t.resultado = r2(t.bruto - t.custos); });
  return lista;
}

// Resumo dos custos de uma carteira no dia: { bruto, custos, liquido, n }
export function resumoCustos(trades, cart) {
  const alvo = (trades || []).filter(t => tradeNaCarteira(t, cart) && t.descontaCustos);
  return {
    n: alvo.length,
    bruto: r2(alvo.reduce((s, t) => s + (t.bruto || 0), 0)),
    custos: r2(alvo.reduce((s, t) => s + (t.custos || 0), 0)),
    liquido: r2(alvo.reduce((s, t) => s + (t.resultado || 0), 0)),
  };
}
