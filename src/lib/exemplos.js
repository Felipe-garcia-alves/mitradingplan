// Mi Trading Plan - exemplos da estratégia (playbook)
//
// estrategia.fotos guarda os prints que mostram o setup "de livro":
//   { url, origem: "upload" | "trade", dia?, criadoEm }
// "upload" foi enviado direto na estratégia (o arquivo é dela e sai junto ao remover);
// "trade" é uma foto de um trade marcada com estrela (o arquivo continua sendo do trade).

// Campos da estratégia que vão para o banco (sem os de controle)
export function dadosDe(est) {
  const { id: _id, firebase_id: _fid, ...dados } = est || {};
  return dados;
}

// Em que dia e trade está esta foto
export function tradeDaFoto(entries, url) {
  for (const [dia, e] of Object.entries(entries || {}))
    for (const t of e.trades || [])
      if ((t.imagens || []).includes(url)) return { dia, trade: t };
  return null;
}

// Botão do visualizador para marcar/desmarcar a foto como exemplo da estratégia do trade
export function acaoExemplo(url, { entries, estrategias, saveEstrategia }) {
  if (!url || !saveEstrategia) return null;
  const achado = tradeDaFoto(entries, url);
  const est = achado && (estrategias || []).find(e => e.nome === achado.trade.estrategia);
  if (!est) return null;
  const fotos = est.fotos || [];
  const marcada = fotos.some(f => f.url === url);
  return {
    marcada,
    rotulo: marcada ? "Nos exemplos de " + est.nome : "Enviar para os exemplos de " + est.nome,
    onClick: () => saveEstrategia(est.id, {
      ...dadosDe(est),
      fotos: marcada
        ? fotos.filter(f => f.url !== url)
        : [...fotos, { url, origem: "trade", dia: achado.dia, criadoEm: new Date().toISOString() }],
    }),
  };
}
