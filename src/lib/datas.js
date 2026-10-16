// Mi Trading Plan - datas no fuso do usuário
//
// As chaves do diário e da disciplina são AAAA-MM-DD no horário LOCAL.
// Não usar toISOString().slice(0,10): é UTC e vira o dia às 21h em Brasília.

export function chaveLocal(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function hojeLocal() {
  return chaveLocal(new Date());
}

// Semanas do mês, de segunda a sexta: [[null, null, 1, 2, 3], [6, 7, 8, 9, 10], ...]
// Sábado e domingo ficam de fora (B3 não tem pregão), a não ser que comFimDeSemana seja true:
// aí cada semana tem 7 colunas (seg … dom). Use quando o mês tiver registro no fim de semana
// (o Forex abre domingo à noite no horário de Brasília) para nenhum dia ficar escondido.
export const DIAS_UTEIS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
export const DIAS_SEMANA_SEG = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export function semanasUteis(ano, mes, comFimDeSemana = false) {
  const semanas = [];
  let sem = null;
  const cols = comFimDeSemana ? 7 : 5;
  const total = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const col = (new Date(ano, mes, d).getDay() + 6) % 7; // 0 seg … 6 dom
    if (col >= cols) continue;
    if (!sem || col === 0) { sem = Array(cols).fill(null); semanas.push(sem); }
    sem[col] = d;
  }
  return semanas;
}

// O mês (AAAA-MM) tem alguma chave AAAA-MM-DD caindo em sábado ou domingo?
export function temFimDeSemana(chaves, ano, mes) {
  const pref = ano + "-" + String(mes + 1).padStart(2, "0") + "-";
  return chaves.some(k => k.startsWith(pref) && [0, 6].includes(new Date(k + "T12:00:00").getDay()));
}
