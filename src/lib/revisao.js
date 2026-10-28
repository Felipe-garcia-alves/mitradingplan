// Mi Trading Plan - revisão de trades
//
// A revisão fica dentro do próprio trade, no diário:
//   trade.revisao = { veredito, erros:[ids], licao, marca, em }
// Loss não é erro: o veredito separa "dentro do plano" de erro de análise, execução ou emocional.
// Os erros são etiquetas fixas por fase do trade, para dar para somar quanto cada um custou.

import { chaveLocal } from "./datas";

export const VEREDITOS = [
  { id:"sem_erro",  rot:"Sem erro",  desc:"Segui o plano — o mercado não colaborou", cor:"var(--accent)" },
  { id:"analise",   rot:"Análise",   desc:"Li errado o gráfico ou o contexto",       cor:"#0099ff" },
  { id:"execucao",  rot:"Execução",  desc:"Li certo, mas executei errado",           cor:"var(--warn)" },
  { id:"emocional", rot:"Emocional", desc:"Agi por impulso, medo ou ganância",       cor:"var(--neg)" },
];
export const VEREDITO = Object.fromEntries(VEREDITOS.map(v => [v.id, v]));

// No WIN a pergunta é "mérito ou sorte?": mesmos vereditos (as estatísticas somam juntas),
// outro texto. Ganhar com erro é o caso mais perigoso: ensina o hábito errado.
const NO_WIN = {
  sem_erro:  { rot:"Mérito",            desc:"Segui o plano e o mercado pagou" },
  analise:   { rot:"Sorte · análise",   desc:"Ganhei, mas a leitura estava errada" },
  execucao:  { rot:"Sorte · execução",  desc:"Ganhei, mas executei fora do plano" },
  emocional: { rot:"Sorte · emocional", desc:"Ganhei, mas entrei por impulso" },
};
export const vereditosDo = t => t?.tipo === "WIN" ? VEREDITOS.map(v => ({ ...v, ...NO_WIN[v.id] })) : VEREDITOS;
export const vereditoDo = (t, id) => vereditosDo(t).find(v => v.id === id);
export const perguntaDo = t => t?.tipo === "WIN" ? "Foi mérito ou sorte?" : "Foi erro ou foi o mercado?";

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
  exemplo: { rot:"Exemplo A+",    cor:"var(--accent)" },
  classico: { rot:"Erro clássico", cor:"var(--neg)" },
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
  if (t.tipo === "LOSS") m.push({ rot:"LOSS", cor:"var(--neg)" });
  if (q && q <= 2) m.push(t.tipo === "WIN"
    ? { rot:"WIN com execução " + (q === 1 ? "ruim" : "regular"), cor:"var(--warn)" }
    : { rot:"Execução " + (q === 1 ? "ruim" : "regular"), cor:"var(--warn)" });
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

// ── Datas da revisão semanal e do treino
export function somarDias(dia, n) {
  const d = new Date(dia + "T12:00:00");
  d.setDate(d.getDate() + n);
  return chaveLocal(d);
}
export function segundaDe(dia) {
  const d = new Date(dia + "T12:00:00");
  return somarDias(dia, -((d.getDay() + 6) % 7));
}
export function rotuloSemana(seg) {
  const fmt = k => new Date(k + "T12:00:00").toLocaleDateString("pt-BR", { day:"numeric", month:"short" }).replace(/\./g, "");
  return fmt(seg) + " a " + fmt(somarDias(seg, 4));
}

// ── Treino "Você entraria?": a foto aparece cortada antes da entrada e você decide.
// Repetição espaçada por caixas (Leitner): acertou sobe de caixa e demora mais para voltar,
// errou volta para a caixa 1 e reaparece amanhã.
//   trade.revisao.treino = { foto, corte, resposta: "entrar"|"nao_entrar", caixa, proxima }
export const INTERVALOS_TREINO = { 1:1, 2:3, 3:7, 4:21 };
export const ERROS_DE_ENTRADA = ["antecipada", "atrasada", "contra_tendencia", "fora_setup", "fora_horario"];

export function respostaSugerida({ veredito, erros, marca }) {
  if ((erros || []).some(e => ERROS_DE_ENTRADA.includes(e)) || marca === "classico") return "nao_entrar";
  if (veredito === "sem_erro" || marca === "exemplo") return "entrar";
  return "";
}

export function proximoTreino(treino, acertou, hoje) {
  const caixa = acertou ? Math.min(4, (treino.caixa || 1) + 1) : 1;
  return { ...treino, caixa, proxima: somarDias(hoje, INTERVALOS_TREINO[caixa]) };
}

export const cartaoVence = (it, hoje) => !!it.t.revisao?.treino && (it.t.revisao.treino.proxima || "") <= hoje;
