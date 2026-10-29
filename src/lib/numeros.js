// Mi Trading Plan - números digitados pelo usuário
//
// Os campos de valor são <input type="text" inputMode="decimal">, não type="number":
// no celular em português o teclado decimal tem vírgula, e type="number" devolve ""
// para "150,50" — o campo controlado se apaga e o formulário não salva.

// "150,50" → 150.5 · "1.234,50" → 1234.5 · "12.5" → 12.5 · "" / "-" / "abc" → null
export function numDigitado(v) {
  if (typeof v === "number") return isNaN(v) ? null : v;
  let s = String(v ?? "").trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Filtra o que é digitado: só algarismos, ponto, vírgula e um "-" no início (ou só algarismos)
export function soNumero(v, { inteiro = false, negativo = true } = {}) {
  const s = String(v ?? "");
  if (inteiro) return s.replace(/\D/g, "");
  const limpo = s.replace(/[^\d.,-]/g, "").replace(/(?!^)-/g, "");
  return negativo ? limpo : limpo.replace(/-/g, "");
}

// Valor numérico salvo → texto do campo (1500.5 → "1500,5")
export const paraCampo = v => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));
