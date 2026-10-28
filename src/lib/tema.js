// Mi Trading Plan - tema claro/escuro
//
// O tema fica em <html data-theme="light|dark"> e vale só para este
// navegador. O index.html já aplica a escolha antes da página aparecer,
// para não piscar escuro ao abrir no tema claro.
import { useState } from "react";

const CHAVE = "mtp-tema";
const COR_BARRA = { dark: "#050907", light: "#eef2f0" };

export function temaAtual() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_BARRA[tema]);
  try { localStorage.setItem(CHAVE, tema); } catch { /* sem storage */ }
}

export function useTema() {
  const [tema, setTema] = useState(temaAtual);
  const trocar = () => {
    const novo = tema === "light" ? "dark" : "light";
    aplicarTema(novo);
    setTema(novo);
  };
  return [tema, trocar];
}
