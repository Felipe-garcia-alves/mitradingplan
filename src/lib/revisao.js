// Mi Trading Plan - revisão de trades
//
// A revisão fica dentro do próprio trade, no diário:
//   trade.revisao = { veredito, erros:[ids], licao, marca, em }
// Loss não é erro: o veredito separa "dentro do plano" de erro de análise, execução ou emocional.
// Os erros são etiquetas fixas por fase do trade, para dar para somar quanto cada um custou.

import { chaveLocal } from "./datas";

export const VEREDITOS = [
  { id:"sem_erro",  rot:"Sem erro",  desc:"Segui o plano — o mercado não colaborou", cor:"#2ee6a0" },
  { id:"analise",   rot:"Análise",   desc:"Li errado o gráfico ou o contexto",       cor:"#0099ff" },
  { id:"execucao",  rot:"Execução",  desc:"Li certo, mas executei errado",           cor:"#f5b941" },
  { id:"emocional", rot:"Emocional", desc:"Agi por impulso, medo ou ganância",       cor:"#ff5470" },
];
export const VEREDITO = Object.fromEntries(VEREDITOS.map(v => [v.id, v]));

export const FASES_ERRO = [
  { fase:"Entrada", erros:[
    ["antecipada", "Entrou antes da confirmação"], ["atrasada", "Entrou atrasado / correu atrás"],
    ["contra_tendencia", "Contra a tendência"], ["fora_setup", "Fora do setup"], ["fora_horario", "Fora do horário"] ] },
  { fase:"Gestão", erros:[
    ["stop_mal", "Stop mal posicionado"], ["mexeu_stop", "Mexeu no stop"], ["sem_stop", "Operou sem stop"], ["lote", "Lote acima do plano"] ] },
  { fase:"Saída", erros:[
    ["saiu_cedo", "Saiu cedo"], ["segurou_loss", "Segurou o loss"], ["nao_realizou", "Não realizou no alvo"] ] },
  { fase:"Comportamento", erros:[
    ["revanche", "Revanche"], ["overtrade", "Overtrade"], ["fomo", "FOMO"], ["ignorou_contexto", "Ignorou contexto / notícia"] ] },
];
export const ROTULO_ERRO = Object.fromEntries(FASES_ERRO.flatMap(f => f.erros));
export const rotuloErro = id => ROTULO_ERRO[id] || id;

export const MARCAS = {
  exemplo: { rot:"Exemplo A+",    cor:"#2ee6a0" },
  classico: { rot:"Erro clássico", cor:"#ff5470" },
};

// Execução em estrelas (registros antigos guardavam A+/A/B/C)
export function estrelasDe(q) {
  if (typeof q === "number") return q;
  return ({ "A+":3, "A":3, "B":2, "C":1, "3":3, "2":2, "1":1 })[q] || 0;
}

const EMOCOES_ALERTA = ["Revanche", "Compulsivo", "Ansioso", "Eufórico", "Impaciente", "Frustrado", "Medo"];

// Por que este trade merece revisão. Lista vazia = não entra na fila sozinho.
// WIN com execução ruim entra também: é o caso mais perigoso, ensina o hábito errado.
export function motivosRevisao(t, entry) {
  const m = [];
  const q = estrelasDe(t.qualidade);
  if (t.tipo === "LOSS") m.push({ rot:"LOSS", cor:"#ff5470" });
  if (q && q <= 2) m.push(t.tipo === "WIN"
    ? { rot:"WIN com execução " + (q === 1 ? "ruim" : "regular"), cor:"#f5b941" }
    : { rot:"Execução " + (q === 1 ? "ruim" : "regular"), cor:"#f5b941" });
  const emo = (entry?.emocoes || []).filter(e => EMOCOES_ALERTA.includes(e));
  if (emo.includes("Revanche") || emo.includes("Compulsivo") || m.length) emo.forEach(e => m.push({ rot:e, cor:"#a78bfa" }));
  return m;
}

// Todos os trades do diário, do mais recente para o mais antigo
export function listarTrades(entries) {
  const lista = [];
  for (const [dia, entry] of Object.entries(entries || {})) {
    (entry.trades || []).forEach((t, idx) => lista.push({ dia, idx, t, entry, chave: dia + "#" + idx }));
  }
  return lista.sort((a, b) => b.dia.localeCompare(a.dia) || b.idx - a.idx);
}

export const precisaRevisar = it => !it.t.revisao && motivosRevisao(it.t, it.entry).length > 0;

export function desdeDias(dias) {
  return dias ? chaveLocal(new Date(Date.now() - dias * 86400000)) : "";
}

// Contador da sidebar: pendentes dos últimos 30 dias (a fila fica acionável, sem o passado inteiro)
export function contarPendentes(entries, dias = 30) {
  const desde = desdeDias(dias);
  return listarTrades(entries).filter(it => it.dia >= desde && precisaRevisar(it)).length;
}
