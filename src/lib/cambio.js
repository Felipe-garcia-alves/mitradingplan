// Mi Trading Plan - cotação do dólar para somar carteiras em R$ e em $
//
// Busca USD/BRL ao vivo (AwesomeAPI, sem chave) e guarda no navegador como reserva.
// O usuário pode fixar uma cotação manual, que tem prioridade.
import { useEffect, useState } from "react";
import { numDigitado } from "./numeros";

const CHAVE_CACHE  = "mtp:usdbrl";
const CHAVE_MANUAL = "mtp:usdbrl-manual";
const URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";

function ler(chave) {
  try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; }
}
function gravar(chave, valor) {
  try { valor == null ? localStorage.removeItem(chave) : localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem storage */ }
}

// { valor, origem: "manual" | "ao vivo" | "salva" | null, em, setManual }
export function useCotacaoUSD() {
  const [manual, setManualState] = useState(() => ler(CHAVE_MANUAL));
  const [auto, setAuto] = useState(() => ler(CHAVE_CACHE));
  const [aoVivo, setAoVivo] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch(URL)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(j => {
        const v = parseFloat(j?.USDBRL?.bid);
        if (!vivo || !(v > 0)) return;
        const c = { valor: v, em: new Date().toISOString() };
        gravar(CHAVE_CACHE, c);
        setAuto(c);
        setAoVivo(true);
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const setManual = v => {
    const n = numDigitado(v) ?? NaN;
    const novo = n > 0 ? n : null;
    gravar(CHAVE_MANUAL, novo);
    setManualState(novo);
  };

  if (manual > 0) return { valor: manual, origem: "manual", em: null, setManual };
  if (auto?.valor > 0) return { valor: auto.valor, origem: aoVivo ? "ao vivo" : "salva", em: auto.em, setManual };
  return { valor: null, origem: null, em: null, setManual };
}

// Fator para levar um valor da moeda da carteira para R$
export function paraBRL(moeda, cotacao) {
  return moeda === "R$" ? 1 : (cotacao || 0);
}
