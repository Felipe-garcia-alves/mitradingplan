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

// Semanas do mês só com dias úteis (seg a sex): [[null, null, 1, 2, 3], [6, 7, 8, 9, 10], ...]
// Sábados e domingos ficam de fora dos calendários (não há pregão).
export const DIAS_UTEIS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
export function semanasUteis(ano, mes) {
  const semanas = [];
  let sem = null;
  const total = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const dow = new Date(ano, mes, d).getDay(); // 0 dom … 6 sáb
    if (dow === 0 || dow === 6) continue;
    if (!sem || dow === 1) { sem = Array(5).fill(null); semanas.push(sem); }
    sem[dow - 1] = d;
  }
  return semanas;
}
