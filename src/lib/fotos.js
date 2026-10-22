// Mi Trading Plan - fotos dos trades com anotações editáveis
//
// trade.imagens guarda as fotos já com os desenhos aplicados (é o que aparece nas listas).
// trade.camadas guarda, para cada foto anotada, a original sem desenho e os desenhos:
//   { [urlDaFotoAnotada]: { original, formas } }
// Assim o editor reabre a foto e os desenhos continuam móveis, sem desenhar por cima do desenho.

import { uploadTradeImage, deleteTradeImage } from "../components/ImageEditor";

// O que o editor abre para esta foto: a original e os desenhos (ou a própria foto, se nunca foi anotada)
export function fonteDoEditor(t, url) {
  const c = t?.camadas?.[url];
  return { src: c?.original || url, formas: c?.formas || [] };
}

// Foto nova: { file, original?, formas? }. Com desenhos, sobe também a original.
export async function enviarFoto({ file, original, formas }, uid, dia, tag) {
  const url = await uploadTradeImage(file, uid, dia, tag);
  if (!original || !formas?.length) return { url };
  const orig = await uploadTradeImage(original, uid, dia, tag + "-orig");
  return { url, camada: { original: orig, formas } };
}

// Salva a nova versão de uma foto já anotada no lugar da antiga.
// Devolve o trade atualizado e as URLs que podem ser apagadas depois de salvar o dia.
export async function trocarFotoAnotada(t, urlAntiga, file, formas, uid, dia) {
  const original = t.camadas?.[urlAntiga]?.original || urlAntiga;
  const url = await uploadTradeImage(file, uid, dia, "anot");
  const camadas = { ...(t.camadas || {}) };
  delete camadas[urlAntiga];
  camadas[url] = { original, formas };
  return {
    trade: { ...t, imagens: (t.imagens || []).map(u => u === urlAntiga ? url : u), camadas },
    apagar: urlAntiga !== original ? [urlAntiga] : [],
  };
}

// Tira uma foto do trade; devolve o trade e os arquivos a apagar (a foto e a original dela)
export function semFoto(t, url) {
  const original = t.camadas?.[url]?.original;
  const camadas = { ...(t.camadas || {}) };
  delete camadas[url];
  const novo = { ...t, imagens: (t.imagens || []).filter(u => u !== url), camadas };
  if (!Object.keys(camadas).length) delete novo.camadas;
  return { trade: novo, apagar: original && original !== url ? [url, original] : [url] };
}

// Todos os arquivos de um trade (para apagar junto com ele)
export function arquivosDoTrade(t) {
  return [...(t?.imagens || []), ...Object.values(t?.camadas || {}).map(c => c.original)]
    .filter((u, i, a) => u && a.indexOf(u) === i);
}

export async function apagarArquivos(urls) {
  for (const u of urls) await deleteTradeImage(u);
}
