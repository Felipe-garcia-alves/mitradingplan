// Mi Trading Plan - aparência: tema claro/escuro, cor do fundo, cor dos cards e cards flutuando
//
// Fica em <html data-theme="light|dark" data-fundo="..." data-cards="..." data-flutuar="nao"> e vale
// só para este navegador. O index.html já aplica a escolha antes da página aparecer,
// para não piscar a cor errada ao abrir. As cores de cada fundo estão no theme.css.
import { useState, useEffect } from "react";

const CHAVE = "mtp-tema";
const CHAVE_FUNDO = "mtp-fundo";
const CHAVE_CARDS = "mtp-cards";
const CHAVE_FLUTUAR = "mtp-flutuar";
const EVENTO = "mtp-aparencia"; // avisa Sidebar e Configurações quando algo muda

// Só no tema escuro. Fundo e cards são independentes (amostras na tela de Configurações)
export const FUNDOS = [
  { id: "slate",    nome: "Grafite azulado", desc: "neutro e frio, o verde se destaca", cor: "#0e1217" },
  { id: "grafite",  nome: "Grafite neutro",  desc: "cinza puro, sóbrio",                cor: "#111214" },
  { id: "marinho",  nome: "Azul-marinho",    desc: "profundo, estilo fintech",           cor: "#0b1220" },
  { id: "floresta", nome: "Verde floresta",  desc: "fundo na cor da marca",              cor: "#0b1813" },
];
// cores = [card, borda]
export const CARDS = [
  { id: "vidro",   nome: "Vidro verde", desc: "esmeralda translúcido", cores: ["#172f25", "#2f4a3e"] },
  { id: "grafite", nome: "Grafite",     desc: "cinza frio, discreto",  cores: ["#1c242e", "#313b46"] },
  { id: "azul",    nome: "Azul",        desc: "azul profundo",         cores: ["#18233a", "#2c3d5c"] },
];
const PADRAO = "slate", PADRAO_CARDS = "vidro";

const gravar = (chave, v) => { try { localStorage.setItem(chave, v); } catch { /* sem storage */ } };
const avisar = () => window.dispatchEvent(new Event(EVENTO));

export function temaAtual() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
export function fundoAtual() {
  const f = document.documentElement.dataset.fundo;
  return FUNDOS.some(x => x.id === f) ? f : PADRAO;
}
export function cardsAtual() {
  const c = document.documentElement.dataset.cards;
  return CARDS.some(x => x.id === c) ? c : PADRAO_CARDS;
}
export function flutuarAtual() {
  return document.documentElement.dataset.flutuar !== "nao";
}

// cor da barra do navegador no celular
function corDaBarra() {
  return temaAtual() === "light" ? "#eef2f0" : FUNDOS.find(f => f.id === fundoAtual()).cor;
}
function atualizarBarra() {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", corDaBarra());
}

export function aplicarTema(tema) {
  document.documentElement.dataset.theme = tema;
  gravar(CHAVE, tema);
  atualizarBarra();
  avisar();
}
export function aplicarFundo(fundo) {
  document.documentElement.dataset.fundo = fundo;
  gravar(CHAVE_FUNDO, fundo);
  atualizarBarra();
  avisar();
}
export function aplicarCards(cards) {
  document.documentElement.dataset.cards = cards;
  gravar(CHAVE_CARDS, cards);
  avisar();
}
export function aplicarFlutuar(sim) {
  if (sim) delete document.documentElement.dataset.flutuar;
  else document.documentElement.dataset.flutuar = "nao";
  gravar(CHAVE_FLUTUAR, sim ? "sim" : "nao");
  avisar();
}

// Estado da aparência que acompanha mudanças feitas em qualquer lugar do app
export function useAparencia() {
  const atual = () => ({ tema: temaAtual(), fundo: fundoAtual(), cards: cardsAtual(), flutuar: flutuarAtual() });
  const [ap, setAp] = useState(atual);
  useEffect(() => {
    const at = () => setAp(atual());
    window.addEventListener(EVENTO, at);
    return () => window.removeEventListener(EVENTO, at);
  }, []);
  return ap;
}

export function useTema() {
  const { tema } = useAparencia();
  const trocar = () => aplicarTema(tema === "light" ? "dark" : "light");
  return [tema, trocar];
}
