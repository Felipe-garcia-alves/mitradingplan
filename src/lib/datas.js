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
