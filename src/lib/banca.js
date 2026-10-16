// Mi Trading Plan - banca por carteira (inicial + resultados + depósitos - saques)
//
// Carteira = onde o dinheiro fica:
//   • Conta Principal × mercado  (key "B3", "Forex", ...)  — bancas em config.bancaB3 etc.
//   • cada conta extra            (key "conta:<id>")       — conta.bancaInicial, um mercado
//
// Saques ficam em config.saques: [{ id, data, valor, carteira, mercado, obs }].
// Saques antigos só têm `mercado` → pertencem à carteira principal daquele mercado.
// Um saque reduz a banca, mas NÃO é resultado de trading.
// Depósitos ficam em config.depositos, com o mesmo formato: aumentam a banca,
// também sem contar como resultado.
import { listaContas, contaDoTrade, limitesDaConta, ID_PRINCIPAL, TIPOS_CONTA } from "./contas";

export const MERCADOS = {
  B3:        { label:"Mini Índice B3",   curto:"B3",        moeda:"R$", key:"bancaB3",        entry:"totalB3",        padrao:3000, cor:"#2ee6a0", sigla:"B3", core:true  },
  Forex:     { label:"Forex",            curto:"Forex",     moeda:"$",  key:"bancaForex",     entry:"totalForex",     padrao:200,  cor:"#f5b941", sigla:"FX", core:true  },
  Cripto:    { label:"Cripto",           curto:"Cripto",    moeda:"$",  key:"bancaCripto",    entry:"totalCripto",    padrao:1000, cor:"#a78bfa", sigla:"₿",  core:false },
  Americano: { label:"Ações Americanas", curto:"Americano", moeda:"$",  key:"bancaAmericano", entry:"totalAmericano", padrao:500,  cor:"#60a5fa", sigla:"US", core:false },
};

function siglaDe(nome = "") {
  const p = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

// Banca de um mercado da Conta Principal está ativa? B3 e Forex vêm ligadas por padrão;
// qualquer uma pode ser excluída (fica em config.bancasExcluidas até ser recriada).
export function mercadoAtivo(config, mk) {
  const m = MERCADOS[mk];
  if (!m || (config?.bancasExcluidas || []).includes(mk)) return false;
  return m.core || config?.[m.key] !== undefined;
}

// Todas as carteiras ativas, na ordem de exibição
export function listaCarteiras(config) {
  const lim = limitesDaConta(config, ID_PRINCIPAL);
  const principais = Object.entries(MERCADOS)
    .filter(([mk]) => mercadoAtivo(config, mk))
    .map(([mk, m]) => ({
      key: mk, contaId: ID_PRINCIPAL, mercado: mk, extra: false,
      label: m.label, curto: m.curto, moeda: m.moeda, cor: m.cor, sigla: m.sigla,
      inicial: typeof config?.[m.key] === "number" ? config[m.key] : m.padrao,
      limites: lim,
    }));
  const extras = listaContas(config).filter(c => c.id !== ID_PRINCIPAL).map(c => {
    const m = MERCADOS[c.mercado] || MERCADOS.B3;
    return {
      key: "conta:" + c.id, contaId: c.id, mercado: c.mercado || "B3", extra: true,
      label: c.nome, curto: c.nome, moeda: m.moeda, cor: TIPOS_CONTA[c.tipo]?.cor || m.cor, sigla: siglaDe(c.nome),
      tipo: c.tipo, inicial: Number(c.bancaInicial) || 0,
      limites: limitesDaConta(config, c.id),
    };
  });
  return [...principais, ...extras];
}

export function carteira(config, key) {
  return listaCarteiras(config).find(c => c.key === key) || null;
}

// O trade pertence à carteira?
export function tradeNaCarteira(t, cart) {
  const conta = contaDoTrade(t);
  return cart.extra ? conta === cart.contaId : conta === ID_PRINCIPAL && t.mercado === cart.mercado;
}

export function resultadoDia(e, cart) {
  return (e.trades || []).filter(t => tradeNaCarteira(t, cart)).reduce((s, t) => s + (t.resultado || 0), 0);
}

export function carteiraDoSaque(s) {
  return s.carteira || s.mercado || "B3";
}

export function listaDepositos(config, cartKey) {
  return (config?.depositos || []).filter(s => !cartKey || carteiraDoSaque(s) === cartKey);
}

// Com `ate`, só depósitos com data <= ate; com `antes`, só data < antes
export function totalDepositos(config, cartKey, { ate, antes } = {}) {
  return listaDepositos(config, cartKey)
    .filter(s => (!ate || s.data <= ate) && (!antes || s.data < antes))
    .reduce((t, s) => t + (Number(s.valor) || 0), 0);
}

export function listaSaques(config, cartKey) {
  return (config?.saques || []).filter(s => !cartKey || carteiraDoSaque(s) === cartKey);
}

// Com `ate`, só saques com data <= ate; com `antes`, só data < antes
export function totalSaques(config, cartKey, { ate, antes } = {}) {
  return listaSaques(config, cartKey)
    .filter(s => (!ate || s.data <= ate) && (!antes || s.data < antes))
    .reduce((t, s) => t + (Number(s.valor) || 0), 0);
}

// Resultado de trading da carteira (sem saques); com `antes`, só dias anteriores
export function resultadoCarteira(entries, cart, { antes } = {}) {
  return Object.entries(entries || {})
    .filter(([d]) => !antes || d < antes)
    .reduce((t, [, e]) => t + resultadoDia(e, cart), 0);
}

export function bancaCarteira(entries, config, cart, opts = {}) {
  return cart.inicial + resultadoCarteira(entries, cart, opts) + totalDepositos(config, cart.key, opts) - totalSaques(config, cart.key, opts);
}

// Banca dia a dia: [{ d, val, saque, deposito }], começando pelo valor inicial
export function curvaCarteira(entries, config, cart, rotuloInicio = "início") {
  const porDia = {};
  Object.entries(entries || {}).forEach(([d, e]) => {
    const r = resultadoDia(e, cart);
    if (r) porDia[d] = { res: r, saque: 0, deposito: 0 };
  });
  const dia = d => porDia[d] || (porDia[d] = { res: 0, saque: 0, deposito: 0 });
  listaSaques(config, cart.key).forEach(s => { dia(s.data).saque += Number(s.valor) || 0; });
  listaDepositos(config, cart.key).forEach(s => { dia(s.data).deposito += Number(s.valor) || 0; });
  let acc = cart.inicial;
  const pontos = [{ d: rotuloInicio, val: acc, saque: 0, deposito: 0 }];
  Object.keys(porDia).sort().forEach(d => {
    acc += porDia[d].res + porDia[d].deposito - porDia[d].saque;
    pontos.push({ d, val: parseFloat(acc.toFixed(2)), saque: porDia[d].saque, deposito: porDia[d].deposito });
  });
  return pontos;
}
