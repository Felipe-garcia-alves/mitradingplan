import { useState, useRef, useEffect } from "react";
import { Select, TimePicker, Confirmar, Modal, Valores } from "../components/ui";
import { somaPorMoeda, corDasPartes } from "../lib/moedas";
import { listaContas, contaPadrao, contaDoTrade, TIPOS_CONTA } from "../lib/contas";
import { ATIVOS_SUGERIDOS, opcoesDeAtivo, ativosUsados, normalizarAtivo, rotuloAtivo } from "../lib/ativos";
import { supabase } from "../supabase";
import { decodificarArquivo, lerArquivo, jaRegistrada } from "../lib/importar";
import { custosDaConta, custoPorContrato, comDesconto, semDesconto, recalcularCustos, carteirasB3DoDia, resumoCustos, valorZeragem, semTaxa, r2 } from "../lib/custos";
import { Check } from "../components/ContaModal";
import { tradeNaCarteira } from "../lib/banca";
import { numDigitado, soNumero } from "../lib/numeros";

const fmtR = v => Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
// Etiqueta "custos" de uma operação com desconto (bruto no title)
function TagCustos({ t }) {
  if (!t.descontaCustos) return null;
  const m = t.mercado==="B3" ? "R$ " : "$ ";
  return <span className="mtp-tag" title={"Bruto "+(t.bruto>=0?"+":"-")+m+fmtR(t.bruto)+" · custos "+m+fmtR(t.custos||0)} style={{fontFamily:"var(--font-mono)",color:"var(--warn)"}}>custos −{m}{fmtR(t.custos||0)}</span>;
}
import ImageEditor, { uploadTradeImage, ImageThumb, ImageViewer, ImagemSegura } from "../components/ImageEditor";
import { fonteDoEditor, enviarFoto, trocarFotoAnotada, semFoto, arquivosDoTrade, apagarArquivos } from "../lib/fotos";
import { segundaDe } from "../lib/revisao";
import { alfa } from "../lib/cor.js";
import { acaoExemplo } from "../lib/exemplos";

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
const MONTH_NAMES_LONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function formatDateLong(s) {
  const p=s.split("-");
  return p[2]+" de "+MONTH_NAMES_LONG[parseInt(p[1])-1]+" de "+p[0];
}
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
function chaveDe(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
// Segunda-feira da semana do dia (data local)
function inicioDaSemana(s) {
  const [a,m,d] = s.split("-").map(Number);
  const dt = new Date(a, m-1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return chaveDe(dt);
}
// "12 – 16 out" (segunda a sexta)
function rotuloSemana(seg) {
  const [a,m,d] = seg.split("-").map(Number);
  const fim = new Date(a, m-1, d+4);
  const mes = i => MONTH_NAMES[i].slice(0,3).toLowerCase();
  return fim.getMonth() === m-1 ? d+" – "+fim.getDate()+" "+mes(m-1) : d+" "+mes(m-1)+" – "+fim.getDate()+" "+mes(fim.getMonth());
}

const EMOCOES = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche","Compulsivo"];
const EMOCAO_COLORS = {"Focado":"var(--accent)","Confiante":"#0099ff","Neutro":"var(--text-mute)","Atento":"#a78bfa","Cauteloso":"var(--warn-2)","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};

// Execução em estrelas: 3 bom · 2 regular · 1 ruim. Registros antigos guardavam A+/A/B/C.
const EXECUCAO = { 3:{ rot:"bom", cor:"var(--accent)" }, 2:{ rot:"regular", cor:"var(--warn)" }, 1:{ rot:"ruim", cor:"var(--neg)" } };
function estrelasDe(q) {
  if (typeof q === "number") return q;
  return ({ "A+":3, "A":3, "B":2, "C":1, "3":3, "2":2, "1":1 })[q] || 0;
}
function Estrela({ cheia, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={cheia ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <polygon points="12 2.5 14.9 8.6 21.5 9.4 16.6 13.9 17.9 20.5 12 17.2 6.1 20.5 7.4 13.9 2.5 9.4 9.1 8.6"/>
    </svg>
  );
}
// Só leitura (listas)
function EstrelasMini({ q }) {
  const n = estrelasDe(q);
  if (!n) return null;
  return (
    <span title={"Execução: "+EXECUCAO[n].rot} style={{display:"inline-flex",gap:"1px",color:"var(--warn)",lineHeight:0}}>
      {[1,2,3].map(i => <span key={i} style={{opacity:i<=n?1:0.25}}><Estrela cheia={i<=n} size={12}/></span>)}
    </span>
  );
}
function EstrelasInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const atual = hover || value || 0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
      <div className="mtp-estrelas" onMouseLeave={()=>setHover(0)}>
        {[1,2,3].map(i => (
          <button key={i} type="button" className={"mtp-estrela"+(i<=atual?" on":"")} aria-label={i+" estrela"+(i>1?"s":"")+" — "+EXECUCAO[i].rot}
            onMouseEnter={()=>setHover(i)} onClick={()=>onChange(value===i ? 0 : i)}>
            <Estrela cheia={i<=atual} size={22}/>
          </button>
        ))}
      </div>
      <span className="mtp-estrelas-rotulo" style={{color: atual ? EXECUCAO[atual].cor : "var(--text-3)"}}>{atual ? EXECUCAO[atual].rot : "—"}</span>
    </div>
  );
}

export default function Diario({ entries, saveEntry, deleteEntry, estrategias, saveEstrategia, uid, config, setPagina, focarNovoTrade, onFocouNovoTrade }) {
  const contas = listaContas(config);
  const today    = todayKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [diaModal,    setDiaModal]    = useState(null); // dia escolhido dentro dela
  const [msg,        setMsg]        = useState("");
  const [avisoNovo,  setAvisoNovo]  = useState(""); // validação do "Adicionar", mostrada ao lado do botão
  const [emocoes,    setEmocoes]    = useState([]);
  const [observacao, setObservacao] = useState("");
  const [trades,     setTrades]     = useState([]);
  const [novoTrade,  setNovoTrade]  = useState({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:"",horario:"",contratos:"",qualidade:"",conta:contaPadrao(config).id,ativo:ativosUsados(entries,"B3")[0]||"WIN",descontar:custosDaConta(config,contaPadrao(config).id).automatico});
  const [pendingImages, setPendingImages] = useState([]);
  const [editingTrade, setEditingTrade] = useState(null); // { dateKey, index, data }
  const [editorImg, setEditorImg]   = useState(null);  // { src, tradeIdx } — editor aberto
  const [viewerImg, setViewerImg]   = useState(null);  // url — viewer aberto
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const fileInputRef = useRef(null);
  const [confirmacao, setConfirmacao] = useState(null); // { titulo, texto, botao, acao }
  const [importacao, setImportacao] = useState(null);   // { nome, conta, operacoes } — prévia do .csv
  const [avisoImport, setAvisoImport] = useState("");
  const importInputRef = useRef(null);

  // Botão "Novo trade" da sidebar: volta para hoje e leva o cursor ao resultado
  const composerRef = useRef(null);
  useEffect(() => {
    if (!focarNovoTrade) return;
    setSelectedDate(today);
    const el = composerRef.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector(".mtp-campo input")?.focus({ preventScroll: true });
    }
    onFocouNovoTrade?.();
  }, [focarNovoTrade, today, onFocouNovoTrade]);

  // Operações adicionadas e ainda não salvas: avisa antes de fechar/recarregar a aba
  useEffect(() => {
    if (trades.length === 0) return;
    const fn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [trades.length]);

  // Recalcula os totais do dia a partir dos trades (mesma regra do salvar)
  // e recalcula os custos (taxas, IRRF, zeragem, nota) das operações com desconto
  function montarDia(entry, lista) {
    lista = recalcularCustos(lista, entry, config);
    const soma = m => lista.filter(t=>t.mercado===m).reduce((s,t)=>s+(t.resultado||0),0);
    const wins = lista.filter(t=>t.tipo==="WIN").length;
    const dia = { ...entry, trades: lista, numTrades: lista.length, totalPts: lista.reduce((s,t)=>s+(t.pontos||0),0) };
    for (const [m,k] of [["B3","totalB3"],["Forex","totalForex"],["Cripto","totalCripto"],["Americano","totalAmericano"]]) {
      const v = soma(m); if (v !== 0) dia[k] = v; else delete dia[k];
    }
    if (lista.length) dia.winRate = Math.round(wins/lista.length*100); else delete dia.winRate;
    return dia;
  }

  // Apaga uma operação já salva (e as fotos dela)
  async function apagarOperacaoSalva(dateKey, idx) {
    const entry = entries[dateKey];
    if (!entry) return;
    const alvo = entry.trades[idx];
    const resto = entry.trades.filter((_, i) => i !== idx);
    const ok = resto.length === 0 && !(entry.observacao||"").trim() && !(entry.emocoes||[]).length
      ? await deleteEntry(dateKey)
      : await saveEntry(dateKey, montarDia(entry, resto));
    if (ok !== false) {
      await apagarArquivos(arquivosDoTrade(alvo));
      setMsg("✓ Operação apagada."); setTimeout(()=>setMsg(""), 2500);
    }
  }

  // Custos do dia de uma carteira da B3 (zeragem, total da nota): grava e recalcula o dia
  async function salvarCustosDia(dateKey, cartKey, campos) {
    const entry = entries[dateKey];
    if (!entry) return;
    const atual = { ...(entry.custosDia?.[cartKey] || {}), ...campos };
    Object.keys(atual).forEach(k => { if (atual[k] === null || atual[k] === undefined) delete atual[k]; });
    const custosDia = { ...(entry.custosDia || {}) };
    if (Object.keys(atual).length) custosDia[cartKey] = atual; else delete custosDia[cartKey];
    const novo = { ...entry, custosDia };
    if (!Object.keys(custosDia).length) delete novo.custosDia;
    const ok = await saveEntry(dateKey, montarDia(novo, entry.trades || []));
    if (ok !== false) { setMsg("✓ Custos do dia atualizados."); setTimeout(()=>setMsg(""), 2500); }
  }

  function startEditTrade(dateKey, index, trade) {
    setEditingTrade({
      dateKey,
      index,
      data: {
        tipo: trade.tipo || "WIN",
        mercado: trade.mercado || "B3",
        pontos: trade.pontos !== undefined && trade.pontos !== null ? String(trade.pontos) : "",
        resultado: trade.descontaCustos ? String(trade.bruto) : trade.resultado !== undefined && trade.resultado !== null ? String(trade.resultado) : "",
        contratos: trade.contratos ? String(trade.contratos) : "",
        descontar: !!trade.descontaCustos,
        estrategia: trade.estrategia || "",
        observacao: trade.observacao || "",
        conta: contaDoTrade(trade),
        ativo: trade.ativo || "",
      }
    });
  }

  async function saveEditTrade() {
    if (!editingTrade) return;
    const { dateKey, index, data } = editingTrade;
    const entry = entries[dateKey];
    if (!entry) return;
    if (data.descontar && !(parseInt(data.contratos) > 0)) { setMsg("Informe os lotes para calcular os custos."); setTimeout(()=>setMsg(""), 3500); return; }
    const updatedTrades = entry.trades.map((t, i) => {
      if (i !== index) return t;
      // mantém o resto do trade (fotos, horário, execução)
      let updated = { ...semDesconto(t), mercado: data.mercado, tipo: data.tipo, estrategia: data.estrategia || "", observacao: data.observacao || "", conta: data.conta || contaDoTrade(t) };
      const ativoEd = normalizarAtivo(data.ativo);
      if (ativoEd) updated.ativo = ativoEd; else delete updated.ativo;
      const pontosEd = numDigitado(data.pontos), resultadoEd = numDigitado(data.resultado);
      if (pontosEd !== null) updated.pontos = pontosEd; else delete updated.pontos;
      if (resultadoEd !== null) updated.resultado = resultadoEd; else delete updated.resultado;
      updated.contratos = data.contratos !== "" ? parseInt(data.contratos) : null;
      // com desconto, o resultado digitado é o bruto; mantém a taxa da época se nada mudou
      if (data.descontar && typeof updated.resultado === "number") {
        const novo = comDesconto(updated, custosDaConta(config, updated.conta));
        updated = t.descontaCustos && t.ativo === updated.ativo && contaDoTrade(t) === updated.conta ? { ...novo, custoContrato: t.custoContrato, irrf: t.irrf } : novo;
      }
      return updated;
    });
    await saveEntry(dateKey, montarDia(entry, updatedTrades));
    setEditingTrade(null);
    setMsg("✓ Operação atualizada!"); setTimeout(()=>setMsg(""), 2500);
  }

  function changeDate(delta) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const newKey = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    if (newKey <= today) setSelectedDate(newKey);
  }

  const todayEntry = entries[selectedDate];
  const estNomes = [...new Set((estrategias||[]).map(e=>e.nome).filter(Boolean))];

  // Calcula win rate por estrategia a partir do historico
  const estWinRate = {};
  Object.values(entries||{}).forEach(entry => {
    (entry.trades||[]).forEach(t => {
      if (!t.estrategia) return;
      if (!estWinRate[t.estrategia]) estWinRate[t.estrategia] = {wins:0,total:0};
      estWinRate[t.estrategia].total++;
      if (t.tipo==="WIN") estWinRate[t.estrategia].wins++;
    });
  });
  function sugerirExecucao(nomeEst) {
    const s = estWinRate[nomeEst];
    if (!s || s.total < 3) return "";
    const wr = Math.round((s.wins/s.total)*100);
    if (wr >= 60) return 3;
    if (wr >= 40) return 2;
    return 1;
  }

  function toggleEmocao(em) {
    setEmocoes(prev => prev.includes(em) ? prev.filter(e=>e!==em) : [...prev, em]);
  }

  // LOSS sempre negativo, WIN sempre positivo (aceita o prejuízo digitado sem sinal)
  function comSinal(v) {
    const n = Math.abs(numDigitado(v));
    return novoTrade.tipo === "LOSS" ? -n : n;
  }
  function trocarTipo(t) {
    setNovoTrade(p => {
      const ajusta = v => { const n = numDigitado(v); if (!n) return v; return (t === "LOSS") === (n < 0) ? v : (n < 0 ? v.trim().slice(1) : "-" + v.trim()); };
      return { ...p, tipo:t, resultado:ajusta(p.resultado), pontos:ajusta(p.pontos) };
    });
  }
  function digitarNumero(k, v) {
    v = soNumero(v, { inteiro: k === "contratos" });
    setAvisoNovo("");
    setNovoTrade(p => {
      const novo = { ...p, [k]: v };
      if (k !== "contratos" && v.startsWith("-")) novo.tipo = "LOSS";
      return novo;
    });
  }
  function avisarNovo(t) { setAvisoNovo(t); setTimeout(()=>setAvisoNovo(""), 4000); }
  function escolherEstrategia(n) {
    const sug = sugerirExecucao(n);
    setNovoTrade(p => ({ ...p, estrategia:n, qualidade: sug || p.qualidade }));
  }

  function addTrade() {
    if (!novoTrade.resultado && !novoTrade.pontos) return;
    if ((novoTrade.resultado !== "" && numDigitado(novoTrade.resultado) === null) || (novoTrade.pontos !== "" && numDigitado(novoTrade.pontos) === null)) { avisarNovo("Número inválido — use só algarismos e vírgula (ex.: 150,50)."); return; }
    if (novoTrade.descontar && novoTrade.resultado === "") { avisarNovo("Informe o resultado em dinheiro para descontar os custos (ou desmarque \"Descontar custos\")."); return; }
    if (novoTrade.descontar && !(parseInt(novoTrade.contratos) > 0)) { avisarNovo("Informe os lotes para calcular os custos (ou desmarque \"Descontar custos\")."); return; }
    let t = {
      id: Date.now(),
      mercado: novoTrade.mercado,
      resultado: novoTrade.resultado !== "" ? comSinal(novoTrade.resultado) : null,
      pontos: novoTrade.pontos !== "" ? comSinal(novoTrade.pontos) : null,
      estrategia: novoTrade.estrategia,
      tipo: novoTrade.tipo,
      observacao: novoTrade.observacao,
      horario: novoTrade.horario,
      contratos: novoTrade.contratos !== "" ? parseInt(novoTrade.contratos) : null,
      qualidade: novoTrade.qualidade || null,
      conta: novoTrade.conta || contaPadrao(config).id,
      ativo: normalizarAtivo(novoTrade.ativo) || null,
      imagens: [],
      _pendingFiles: pendingImages,
    };
    if (novoTrade.descontar) t = comDesconto(t, custosDaConta(config, t.conta));
    setTrades(prev => [...prev, t]);
    setNovoTrade(p=>({mercado:p.mercado,ativo:p.ativo,resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:"",horario:"",contratos:"",qualidade:"",conta:p.conta,descontar:p.descontar}));
    setPendingImages([]);
  }

  // ── Image upload for a trade in the pending list (before saving)
  async function handleImageFile(file, tradeId) {
    if (!uid || !file) return;
    setUploadingIdx(tradeId);
    try {
      const url = await uploadTradeImage(file, uid, selectedDate, tradeId);
      setTrades(prev => prev.map(t => t.id===tradeId ? {...t, imagens:[...(t.imagens||[]),url]} : t));
    } catch(e) { console.error(e); }
    setUploadingIdx(null);
  }

  // ── Image upload for a saved trade (already in entry)
  async function handleSavedImageUpload(file, dateKey, tradeIdx) {
    if (!uid || !file) return;
    setUploadingIdx(tradeIdx);
    try {
      const url = await uploadTradeImage(file, uid, dateKey, tradeIdx);
      const entry = entries[dateKey];
      const updatedTrades = entry.trades.map((t,i) =>
        i===tradeIdx ? {...t, imagens:[...(t.imagens||[]),url]} : t
      );
      await saveEntry(dateKey, {...entry, trades:updatedTrades});
    } catch(e) { console.error(e); }
    setUploadingIdx(null);
  }

  // ── Nova versão de uma foto anotada de um trade salvo (substitui a anterior; a original fica guardada)
  async function handleSavedImageReplace(file, formas, dateKey, tradeIdx, url) {
    const entry = entries[dateKey];
    const { trade, apagar } = await trocarFotoAnotada(entry.trades[tradeIdx], url, file, formas, uid, dateKey);
    const ok = await saveEntry(dateKey, {...entry, trades: entry.trades.map((t,i) => i===tradeIdx ? trade : t)});
    if (ok === false) throw new Error("não salvou o dia");
    await apagarArquivos(apagar);
  }

  // ── Delete image from saved trade (e a original dela, se foi anotada)
  async function handleDeleteImage(dateKey, tradeIdx, imgUrl) {
    const entry = entries[dateKey];
    const { trade, apagar } = semFoto(entry.trades[tradeIdx], imgUrl);
    const ok = await saveEntry(dateKey, {...entry, trades: entry.trades.map((t,i) => i===tradeIdx ? trade : t)});
    if (ok !== false) await apagarArquivos(apagar);
  }

  // ── Importar operações de um .csv (cada linha = uma operação)
  function avisarImport(t) { setAvisoImport(t); setTimeout(()=>setAvisoImport(""), 6000); }

  async function abrirArquivoImportacao(file) {
    if (!file) return;
    const { conta, operacoes, erro, plataforma, moeda, repetidas } = lerArquivo(decodificarArquivo(await file.arrayBuffer()));
    if (erro) { avisarImport(erro); return; }
    setImportacao({ nome: file.name, conta, operacoes, plataforma, moeda, repetidas });
  }

  // diasInfo: { "2026-10-16": { emocoes:[], observacao:"" } } — o que foi marcado para cada dia na prévia
  // descontar: aplica os custos da conta às operações da B3 (o Profit exporta o bruto)
  async function salvarImportacao(selecionadas, contaId, diasInfo, descontar) {
    const cfgCustos = custosDaConta(config, contaId);
    const porDia = {};
    for (const op of selecionadas) (porDia[op.data] ||= []).push(op);
    let total = 0, falhou = false, fotosFalharam = 0;
    for (const [dia, ops] of Object.entries(porDia)) {
      const entry = entries[dia] || { emocoes: [], observacao: "" };
      const info = diasInfo[dia] || {};
      const novos = [];
      for (const op of ops.sort((a,b)=>a.abertura.localeCompare(b.abertura))) {
        const t = { mercado:op.mercado||"B3", tipo:op.tipo, estrategia:op.estrategia||"", observacao:(op.observacao||"").trim(), horario:op.horario, abertura:op.abertura,
          contratos:op.contratos, qualidade:op.qualidade||null, conta:contaId, ativo:op.ativo, resultado:op.resultado, origem:"importado" };
        if (op.pontos !== null) t.pontos = op.pontos;
        if (op.lado) t.lado = op.lado;
        // MT5: ticket da posição (evita duplicar), fechamento e custos
        for (const k of ["posicao","fechamento","bruto","comissao","swap","stop","alvo"]) if (op[k] !== undefined && op[k] !== null && op[k] !== "") t[k] = op[k];
        const imagens = [];
        if (uid) for (const [i, f] of (op.fotos||[]).entries()) {
          try { imagens.push(await uploadTradeImage(f.file, uid, dia, "imp-" + op.abertura.replace(/:/g,"") + "-" + i)); }
          catch (e) { console.error("upload da foto:", e); fotosFalharam++; }
        }
        if (imagens.length) t.imagens = imagens;
        novos.push(descontar && t.mercado === "B3" && typeof t.resultado === "number" ? comDesconto(t, cfgCustos) : t);
      }
      const obsNova = (info.observacao||"").trim();
      const obsAntiga = (entry.observacao||"").trim();
      const dia_ = {
        ...montarDia(entry, [...(entry.trades||[]), ...novos]),
        emocoes: [...new Set([...(entry.emocoes||[]), ...(info.emocoes||[])])],
        observacao: obsAntiga && obsNova ? obsAntiga + "\n\n" + obsNova : obsNova || obsAntiga,
        ts: new Date().toISOString(),
      };
      const ok = await saveEntry(dia, dia_);
      if (ok === false) falhou = true; else total += novos.length;
    }
    avisarImport(falhou
      ? "Parte das operações não foi salva. Importe o arquivo de novo — as que já entraram são ignoradas."
      : "✓ "+total+(total===1?" operação importada":" operações importadas")+(fotosFalharam ? " — "+fotosFalharam+(fotosFalharam===1?" foto não subiu; adicione pela operação.":" fotos não subiram; adicione pela operação.") : "."));
    if (!falhou) setImportacao(null);
  }

  function removeTrade(id) { setTrades(prev => prev.filter(t => t.id !== id)); }

  async function handleSave() {
    if (trades.length === 0 && !observacao.trim()) {
      setMsg("Adicione ao menos um trade ou observação."); return;
    }
    // Merge with existing trades for selectedDate
    const existingTrades = todayEntry?.trades || [];
    const novos = [];
    for (const t of trades) {
      const imagens = [...(t.imagens || [])];
      const camadas = {};
      if (uid) {
        for (const [i, foto] of (t._pendingFiles || []).entries()) {
          try {
            const { url, camada } = await enviarFoto(foto, uid, selectedDate, t.id + "-" + i);
            imagens.push(url);
            if (camada) camadas[url] = camada;
          } catch (e) { console.error("upload da foto:", e); }
        }
      }
      const tr = {mercado:t.mercado, tipo:t.tipo, estrategia:t.estrategia||"", observacao:t.observacao||"", horario:t.horario||"", contratos:t.contratos||null, qualidade:t.qualidade||null, conta:t.conta||contaPadrao(config).id};
      if (t.resultado !== null) tr.resultado = t.resultado;
      if (t.pontos    !== null) tr.pontos    = t.pontos;
      if (imagens.length) tr.imagens = imagens;
      if (Object.keys(camadas).length) tr.camadas = camadas;
      if (t.ativo) tr.ativo = t.ativo;
      if (t.descontaCustos) Object.assign(tr, { descontaCustos:true, bruto:t.bruto, custoContrato:t.custoContrato, irrf:t.irrf });
      novos.push(tr);
    }
    const allTrades = [...existingTrades, ...novos];
    const mergedEmocoes = [...new Set([...(todayEntry?.emocoes||[]), ...emocoes])];
    const mergedObs = observacao.trim() || todayEntry?.observacao || "";
    const data = montarDia({ ...(todayEntry||{}), emocoes: mergedEmocoes, observacao: mergedObs, ts: new Date().toISOString() }, allTrades);

    const ok = await saveEntry(selectedDate, data);
    if (ok === false) { setMsg("Não foi possível salvar. Suas operações continuam aqui — tente de novo."); return; }
    const label = selectedDate === today ? "hoje" : "em "+formatDateFull(selectedDate);
    setMsg("✓ Salvo! "+allTrades.length+" trades "+label); setTimeout(()=>setMsg(""),2500);
    setTrades([]); setEmocoes([]); setObservacao("");
  }


  // Semana atual, só dias úteis (seg a sex); sábado/domingo só se tiverem registro. O passado fica no Histórico.
  const segunda = inicioDaSemana(today);
  const diasDaSemana = Array.from({length:7}, (_, i) => {
    const [a,m,d] = segunda.split("-").map(Number);
    return chaveDe(new Date(a, m-1, d+i));
  }).filter((ds, i) => i < 5 || entries[ds]);
  const semanaAtual = { chave: segunda, dias: diasDaSemana.filter(ds => entries[ds]).reverse().map(ds => [ds, entries[ds]]) };
  {
    const trs = semanaAtual.dias.flatMap(([,e]) => e.trades || []);
    semanaAtual.partes = somaPorMoeda(trs);
    semanaAtual.numTrades = trs.length;
    semanaAtual.winRate = trs.length ? Math.round(trs.filter(t=>t.tipo==="WIN").length / trs.length * 100) : null;
  }
  // Janela do dia: aberta pelo cartão; as abas trocam entre os dias da semana
  const semanaAberta = diaModal ? semanaAtual : null;
  const diaAberto = semanaAberta && semanaAberta.dias.find(([d]) => d === diaModal);

  const inp = {background:"var(--line)",border:"1px solid var(--line-strong)",borderRadius:"8px",padding:"10px 13px",color:"var(--text)",fontSize:"14px",outline:"none",fontFamily:"var(--font-sans)"};
  const focoSemana = config?.revisaoSemanal?.[segundaDe(today)]?.foco;

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      {focoSemana && (
        <button type="button" onClick={()=>setPagina("revisao")} title="Definido na revisão semanal"
          style={{display:"flex",alignItems:"center",gap:"10px",width:"100%",textAlign:"left",marginBottom:"14px",padding:"10px 14px",borderRadius:"12px",background:"color-mix(in srgb, var(--accent) 6%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
          <span style={{fontSize:"16px"}}>🎯</span>
          <span style={{color:"var(--accent)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px",flexShrink:0}}>Foco da semana</span>
          <span style={{color:"var(--text)",fontSize:"13.5px",fontWeight:"600",minWidth:0}}>{focoSemana}</span>
        </button>
      )}
      

      {/* Form */}
      <div style={{background:"var(--panel)",border:"1px solid "+(todayEntry?"color-mix(in srgb, var(--accent) 13.3%, transparent)":"var(--line)"),borderRadius:"16px",padding:"28px",marginBottom:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px"}}>
          <div>
            <p style={{margin:"0 0 8px",color:"var(--text-soft)",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>Registrar</p>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <button onClick={()=>changeDate(-1)} style={{background:"color-mix(in srgb, var(--ink) 5%, transparent)",border:"1px solid var(--line-strong)",borderRadius:"8px",width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-soft)",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <p style={{margin:0,color:"var(--text)",fontSize:"17px",fontWeight:"700",whiteSpace:"nowrap"}}>{selectedDate===today?"Hoje — ":""}{formatDateLong(selectedDate)}</p>
              <button onClick={()=>changeDate(+1)} disabled={selectedDate===today} style={{background:selectedDate===today?"transparent":"color-mix(in srgb, var(--ink) 5%, transparent)",border:"1px solid "+(selectedDate===today?"var(--line)":"var(--line-strong)"),borderRadius:"8px",width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",cursor:selectedDate===today?"default":"pointer",color:selectedDate===today?"var(--text-5)":"var(--text-soft)",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
            <button type="button" className="mtp-btn-sec" onClick={()=>importInputRef.current?.click()} title="Importar operações: relatório .csv da B3 (Profit) ou relatório .html do MetaTrader 5"
              style={{minHeight:"32px",borderRadius:"20px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Importar operações
            </button>
            <input ref={importInputRef} type="file" accept=".csv,.html,.htm,text/csv,text/html" style={{display:"none"}}
              onChange={e=>{ abrirArquivoImportacao(e.target.files?.[0]); e.target.value=""; }}/>
            {contas.length > 1 && (
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{color:"var(--text-3)",fontSize:"12px"}}>Registrando em</span>
                <Select value={novoTrade.conta} onChange={v=>setNovoTrade(p=>({...p,conta:v,descontar:custosDaConta(config,v).automatico}))} popWidth={240} align="right" title="Conta das próximas operações"
                  style={{minHeight:"32px",padding:"5px 12px",borderRadius:"20px",fontSize:"12.5px"}}
                  options={contas.map(c=>({value:c.id,label:c.nome,cor:TIPOS_CONTA[c.tipo]?.cor,hint:c.padrao?"padrão":""}))}/>
              </div>
            )}
            {todayEntry && <span style={{background:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)",padding:"5px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"600"}}>✓ {selectedDate===today?"Registrado hoje":"Já registrado"}</span>}
          </div>
        </div>
        {avisoImport && <p style={{margin:"-14px 0 22px",color:avisoImport.startsWith("✓")?"var(--accent)":"var(--neg-soft)",fontSize:"13px",fontWeight:"600"}}>{avisoImport}</p>}

        {/* Emocoes */}
        <div style={{marginBottom:"32px"}}>
          <label style={{color:"var(--text-3)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.4px",display:"block",marginBottom:"14px",fontWeight:"700"}}>Emoções do dia</label>
          <div className="mtp-linha-unica">
            {EMOCOES.map(em => {
              const sel = emocoes.includes(em);
              const cor = EMOCAO_COLORS[em]||"var(--text-mute)";
              return <button key={em} onClick={()=>toggleEmocao(em)} style={{flex:"1 0 auto",padding:"8px 10px",whiteSpace:"nowrap",borderRadius:"20px",border:"1px solid "+(sel?alfa(cor,"66"):"var(--line-strong)"),background:sel?alfa(cor,"1a"):"transparent",color:sel?cor:"var(--text-soft)",fontSize:"12.5px",fontWeight:"600",cursor:"pointer",transition:"all 0.15s",fontFamily:"var(--font-sans)"}}>{em}</button>;
            })}
          </div>
        </div>

        {/* Nova operação */}
        <div ref={composerRef} className="mtp-composer" onKeyDown={e=>{ if(e.key==="Enter" && e.target.tagName==="INPUT"){ e.preventDefault(); addTrade(); } }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap",marginBottom:"24px"}}>
            <p className="mtp-section-title" style={{fontSize:"15px"}}>Nova operação</p>
            <TimePicker value={novoTrade.horario} onChange={v=>setNovoTrade(p=>({...p,horario:v}))} style={{minHeight:"34px",padding:"6px 12px",borderRadius:"20px",fontSize:"13px"}}/>
          </div>

          {/* WIN/LOSS */}
          <div className="mtp-bloco">
            <span className="mtp-rotulo-linha">Tipo</span>
            <div className="mtp-seg">
              {[["WIN","var(--accent)"],["LOSS","var(--neg)"]].map(([t,c])=>(
                <button key={t} type="button" onClick={()=>trocarTipo(t)} className={novoTrade.tipo===t?"on":""} style={{"--seg":c}}>{t}</button>
              ))}
            </div>
          </div>

          {/* Mercado */}
          <div className="mtp-bloco">
            <span className="mtp-rotulo-linha">Mercado</span>
            <div className="mtp-bloco-conteudo">
              {["B3","Forex","Cripto","Americano"].map(m=>(
                <button key={m} type="button" onClick={()=>setNovoTrade(p=>({...p,mercado:m,ativo:p.mercado===m?p.ativo:(ativosUsados(entries,m)[0]||ATIVOS_SUGERIDOS[m]?.[0]?.v||"")}))} className={"mtp-pill"+(novoTrade.mercado===m?" active":"")} style={{"--pill":"#d2bc8f"}}>{m}</button>
              ))}
            </div>
          </div>

          {/* Ativo */}
          <div className="mtp-bloco">
            <span className="mtp-rotulo-linha">Ativo</span>
            <div className="mtp-bloco-conteudo">
              {opcoesDeAtivo(entries, novoTrade.mercado).slice(0,10).map(a=>(
                <button key={a} type="button" onClick={()=>setNovoTrade(p=>({...p,ativo:a}))} title={rotuloAtivo(novoTrade.mercado,a)||a}
                  className={"mtp-pill"+(novoTrade.ativo===a?" active":"")} style={{"--pill":"#8fb8cf",fontFamily:"var(--font-mono)",fontSize:"12px"}}>
                  {a}{rotuloAtivo(novoTrade.mercado,a) && <span style={{opacity:.55,fontFamily:"var(--font-sans)",marginLeft:"6px",fontWeight:500}}>{rotuloAtivo(novoTrade.mercado,a)}</span>}
                </button>
              ))}
              <input value={opcoesDeAtivo(entries, novoTrade.mercado).includes(novoTrade.ativo)?"":novoTrade.ativo}
                onChange={e=>setNovoTrade(p=>({...p,ativo:normalizarAtivo(e.target.value)}))}
                placeholder="outro…" className="mtp-input-pill" style={{fontFamily:"var(--font-mono)",textTransform:"uppercase",minWidth:"100px"}}/>
            </div>
          </div>

          <hr className="mtp-divisor"/>

          {/* Números */}
          <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr) minmax(0,0.7fr)",gap:"14px"}}>
            {[
              {k:"resultado", l:"Resultado "+(novoTrade.mercado==="B3"?"R$":"$"), ph:"0,00", grande:true},
              {k:"pontos",    l:"Pontos", ph:"0"},
              {k:"contratos", l:"Lotes",  ph:"1"},
            ].map(c=>{
              const v = novoTrade[c.k];
              const n = numDigitado(v);
              const cor = c.k==="contratos" || n===null ? "var(--text)" : (n<0 || novoTrade.tipo==="LOSS") ? "var(--neg)" : "var(--accent)";
              return (
                <label key={c.k} className="mtp-campo">
                  <span>{c.l}</span>
                  <input type="text" inputMode={c.k==="contratos"?"numeric":"decimal"} autoComplete="off" placeholder={c.ph} value={v}
                    onChange={e=>digitarNumero(c.k, e.target.value)}
                    style={{color:cor,fontSize:c.grande?"22px":"18px"}}/>
                </label>
              );
            })}
          </div>

          {/* Descontar custos: o resultado digitado é o bruto */}
          {(() => {
            const cfg = custosDaConta(config, novoTrade.conta);
            const n = parseInt(novoTrade.contratos) || 0;
            const custo = r2(n * r2(custoPorContrato(cfg, normalizarAtivo(novoTrade.ativo))));
            const bruto = numDigitado(novoTrade.resultado) !== null ? comSinal(novoTrade.resultado) : null;
            const m = novoTrade.mercado==="B3" ? "R$ " : "$ ";
            return (
              <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",marginTop:"14px"}}>
                <div onClick={()=>setNovoTrade(p=>({...p,descontar:!p.descontar}))} style={{display:"flex",alignItems:"center",gap:"9px",cursor:"pointer",userSelect:"none"}}>
                  <Check marcado={novoTrade.descontar}/>
                  <span style={{color:"var(--text-2)",fontSize:"13px"}}>Descontar custos</span>
                </div>
                {novoTrade.descontar && (
                  <span style={{color:"var(--text-3)",fontSize:"12.5px",fontFamily:"var(--font-mono)"}}>
                    {semTaxa(cfg, normalizarAtivo(novoTrade.ativo))
                      ? <span style={{color:"var(--warn)",fontFamily:"var(--font-sans)"}}>Sem taxa para {normalizarAtivo(novoTrade.ativo)||"este ativo"} — configure em Configurações › Contas</span>
                      : !n ? <span style={{fontFamily:"var(--font-sans)"}}>informe os lotes</span>
                      : <>custos −{m}{fmtR(custo)}{bruto!==null && <> · líquido <b style={{color:bruto-custo>=0?"var(--accent)":"var(--neg)"}}>{bruto-custo>=0?"+":"-"}{m}{fmtR(bruto-custo)}</b></>}{cfg.irrf && novoTrade.mercado==="B3" ? " · + IRRF no dia" : ""}</>}
                  </span>
                )}
              </div>
            );
          })()}

          <hr className="mtp-divisor"/>

          {/* Estratégia */}
          <div className="mtp-bloco">
            <span className="mtp-rotulo-linha">Estratégia</span>
            <div className="mtp-bloco-conteudo">
              {estNomes.map(n=>{
                const st = estWinRate[n];
                const ativo = novoTrade.estrategia===n;
                return (
                  <button key={n} type="button" onClick={()=>escolherEstrategia(ativo?"":n)} className={"mtp-pill"+(ativo?" active":"")} style={{"--pill":"#b7a4ec"}} title={st?.total ? st.total+" ops · "+Math.round(st.wins/st.total*100)+"% acerto" : "sem histórico"}>
                    {n}
                  </button>
                );
              })}
              <input value={estNomes.includes(novoTrade.estrategia)?"":novoTrade.estrategia} onChange={e=>escolherEstrategia(e.target.value)}
                placeholder={estNomes.length?"outra…":"Nome da estratégia"} className="mtp-input-pill"/>
            </div>
          </div>

          {/* Execução */}
          <div className="mtp-bloco" style={{alignItems:"center"}}>
            <span className="mtp-rotulo-linha" style={{paddingTop:0}}>Execução</span>
            <EstrelasInput value={estrelasDe(novoTrade.qualidade)} onChange={n=>setNovoTrade(p=>({...p,qualidade:n||""}))}/>
            {novoTrade.estrategia && estWinRate[novoTrade.estrategia]?.total >= 3 && (
              <span style={{color:"var(--text-3)",fontSize:"11.5px",fontFamily:"var(--font-mono)"}}>
                sugestão {EXECUCAO[sugerirExecucao(novoTrade.estrategia)].rot} · {Math.round(estWinRate[novoTrade.estrategia].wins/estWinRate[novoTrade.estrategia].total*100)}% acerto em {estWinRate[novoTrade.estrategia].total} ops
              </span>
            )}
          </div>

          <hr className="mtp-divisor"/>

          {/* Observação + foto + adicionar */}
          <div style={{display:"flex",gap:"10px",alignItems:"stretch",flexWrap:"wrap"}}>
            <input style={{...inp,flex:1,minWidth:"200px"}} type="text" placeholder="Observação desta operação (opcional)" value={novoTrade.observacao} onChange={e=>setNovoTrade(p=>({...p,observacao:e.target.value}))}/>
            <label title="Anexar print" className="mtp-btn-sec">
              <input type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  const firstFile = files[0];
                  const previewUrl = URL.createObjectURL(firstFile);
                  setEditorImg({
                    src: previewUrl,
                    isNew: true,
                    file: firstFile,
                    otherFiles: files.slice(1).map(f=>({file:f,preview:URL.createObjectURL(f)}))
                  });
                }
                e.target.value = "";
              }}/>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Foto{pendingImages.length>0 && <span className="mtp-ctx-badge">{pendingImages.length}</span>}
            </label>
            <button type="button" onClick={addTrade} disabled={!novoTrade.resultado && !novoTrade.pontos}
              style={{background:(!novoTrade.resultado && !novoTrade.pontos)?"color-mix(in srgb, var(--ink) 5%, transparent)":"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:(!novoTrade.resultado && !novoTrade.pontos)?"var(--text-3)":"#000",border:"none",borderRadius:"10px",padding:"0 20px",minHeight:"42px",fontWeight:"800",fontSize:"13px",cursor:(!novoTrade.resultado && !novoTrade.pontos)?"not-allowed":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"8px"}}>
              Adicionar <span style={{opacity:.6,fontSize:"11px",fontFamily:"var(--font-mono)"}}>↵</span>
            </button>
          </div>
          {avisoNovo && <p style={{margin:"10px 0 0",color:"var(--neg-soft)",fontSize:"13px",fontWeight:"600"}}>{avisoNovo}</p>}

          {pendingImages.length > 0 && (
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"12px"}}>
              {pendingImages.map((img,i)=>(
                <div key={i} style={{position:"relative",width:"84px",height:"58px",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--line-strong)"}}>
                  <img src={img.preview} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                  <button onClick={()=>setPendingImages(prev=>prev.filter((_,j)=>j!==i))} aria-label="Remover imagem"
                    style={{position:"absolute",top:"4px",right:"4px",width:"20px",height:"20px",borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:"12px",cursor:"pointer",padding:0}}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operações adicionadas (ainda não salvas) */}
        {trades.length > 0 && (() => {
          const partesPend = somaPorMoeda(trades);
          const w = trades.filter(t=>t.tipo==="WIN").length;
          return (
            <div style={{marginBottom:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",gap:"12px",flexWrap:"wrap"}}>
                <span className="mtp-section-hint" style={{color:"var(--warn)"}}>● {trades.length} {trades.length===1?"operação":"operações"} ainda não {trades.length===1?"salva":"salvas"} — clique em Salvar dia</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"12.5px",color:"var(--text-3)"}}>
                  <Valores partes={partesPend}/> · {Math.round(w/trades.length*100)}% acerto
                </span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {trades.map(t => {
                  const cor = t.tipo==="WIN" ? "var(--accent)" : "var(--neg)";
                  return (
                    <div key={t.id} className="mtp-op-card" style={{"--op":cor}}>
                      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                        <span style={{padding:"3px 9px",borderRadius:"6px",fontSize:"11.5px",fontWeight:"800",background:alfa(cor,"1f"),color:cor,letterSpacing:"0.5px"}}>{t.tipo}</span>
                        <span style={{color:t.resultado>=0?"var(--accent)":"var(--neg)",fontSize:"16px",fontWeight:"700",fontFamily:"var(--font-mono)",minWidth:"110px"}}>
                          {t.resultado !== null ? (t.resultado>=0?"+":"-")+(t.mercado==="B3"?"R$ ":"$ ")+Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}
                        </span>
                        {t.pontos !== null && <span style={{color:"var(--text-2)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{Number((+t.pontos).toFixed(1))} pts</span>}
                        <span className="mtp-tag">{t.mercado}{t.ativo && <b style={{marginLeft:"6px",fontFamily:"var(--font-mono)",color:"var(--text)"}}>{t.ativo}</b>}</span>
                        {t.estrategia && <span className="mtp-tag">{t.estrategia}</span>}
                        {t.contratos && <span className="mtp-tag" style={{fontFamily:"var(--font-mono)"}}>{t.contratos}×</span>}
                        <TagCustos t={t}/>
                        {t.qualidade && <EstrelasMini q={t.qualidade}/>}
                        {t.horario && <span style={{color:"var(--text-3)",fontSize:"12px",fontFamily:"var(--font-mono)"}}>{t.horario}</span>}
                        {contas.length > 1 && <span className="mtp-tag" style={{color:TIPOS_CONTA[contas.find(c=>c.id===t.conta)?.tipo]?.cor}}>{contas.find(c=>c.id===t.conta)?.nome}</span>}
                        <div style={{marginLeft:"auto",display:"flex",gap:"6px",alignItems:"center"}}>
                          <label className="mtp-btn-sec" style={{minHeight:"30px",padding:"0 10px",fontSize:"11.5px"}}>
                            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]) handleImageFile(e.target.files[0],t.id); e.target.value="";}}/>
                            {uploadingIdx===t.id ? "enviando…" : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Foto</>}
                          </label>
                          <button onClick={()=>setConfirmacao({titulo:"Remover esta operação?",texto:"Ela ainda não foi salva e vai sair da lista do dia.",botao:"Remover",acao:()=>removeTrade(t.id)})} aria-label="Remover operação" style={{background:"none",border:"none",color:"var(--text-3)",cursor:"pointer",fontSize:"15px",padding:"2px 6px"}}>✕</button>
                        </div>
                      </div>
                      {t.observacao && <p style={{margin:"8px 0 0",color:"var(--text-3)",fontSize:"12.5px",fontStyle:"italic"}}>"{t.observacao}"</p>}
                      {((t.imagens||[]).length > 0 || (t._pendingFiles||[]).length > 0) && (
                        <div style={{display:"flex",gap:"8px",marginTop:"10px",flexWrap:"wrap"}}>
                          {(t.imagens||[]).map((url,ii)=>(
                            <div key={ii} style={{position:"relative",width:"84px",height:"58px",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--line-strong)"}}>
                              <ImagemSegura url={url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",cursor:"pointer"}} onClick={()=>setViewerImg(url)}/>
                              <button onClick={()=>setTrades(prev=>prev.map(tr=>tr.id===t.id?{...tr,imagens:tr.imagens.filter(u=>u!==url)}:tr))} aria-label="Remover imagem"
                                style={{position:"absolute",top:"4px",right:"4px",width:"20px",height:"20px",borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:"12px",cursor:"pointer",padding:0}}>×</button>
                            </div>
                          ))}
                          {(t._pendingFiles||[]).length > 0 && <span className="mtp-tag">{t._pendingFiles.length} foto{t._pendingFiles.length>1?"s":""} a enviar ao salvar</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Custos do dia (zeragem, nota de corretagem) — só para operações já salvas na B3 */}
        {todayEntry && carteirasB3DoDia(config, todayEntry.trades).map(cart => (
          <CustosDoDia key={selectedDate+cart.key} cart={cart} entry={todayEntry} config={config} varias={carteirasB3DoDia(config, todayEntry.trades).length > 1}
            onSalvar={campos => salvarCustosDia(selectedDate, cart.key, campos)}/>
        ))}

        {/* Observacao */}
        <div style={{marginBottom:"24px"}}>
          <label style={{color:"var(--text-3)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.4px",fontWeight:"700",display:"block",marginBottom:"12px"}}>Observação geral do dia</label>
          <textarea style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"80px",boxSizing:"border-box",fontSize:"14px"}} placeholder="Como foi o dia? Setup, erros, aprendizados..." value={observacao} onChange={e=>setObservacao(e.target.value)} rows={3}/>
        </div>

        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button onClick={handleSave} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px 24px",fontWeight:"700",fontSize:"14px",cursor:"pointer"}}>Salvar dia</button>
          {msg && <span style={{color:msg.includes("✓")?"var(--accent)":"var(--neg-soft)",fontSize:"14px",fontWeight:"600"}}>{msg}</span>}
        </div>
      </div>

      {/* Esta semana: um cartão por dia; dias anteriores ficam no Histórico */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
        <div>
          <p className="mtp-section-title" style={{fontSize:"15px"}}>Esta semana <span style={{color:"var(--text-3)",fontWeight:"600"}}>· {rotuloSemana(segunda)}</span></p>
          {semanaAtual.numTrades > 0 && (
            <p style={{margin:"6px 0 0",fontSize:"13px",color:"var(--text-3)"}}>
              {semanaAtual.numTrades} trade{semanaAtual.numTrades!==1?"s":""}
              {semanaAtual.winRate!==null && <> · <span style={{color:"var(--accent)",fontWeight:"600"}}>{semanaAtual.winRate}% acerto</span></>} ·{" "}
              <Valores partes={semanaAtual.partes}/>
            </p>
          )}
        </div>
        {setPagina && (
          <button type="button" onClick={()=>setPagina("historico")} className="mtp-btn-sec" style={{minHeight:"34px",borderRadius:"20px"}}>
            Ver semanas anteriores no Histórico
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"12px"}}>
        {diasDaSemana.map(ds => {
          const e = entries[ds];
          const futuro = ds > today, hoje = ds === today;
          const nome = hoje ? "Hoje" : DIAS_SEMANA[new Date(ds+"T12:00").getDay()];
          if (!e) {
            // Dia sem registro: clicar leva o formulário para esse dia
            return (
              <button key={ds} type="button" disabled={futuro} onClick={()=>{ setSelectedDate(ds); window.scrollTo({top:0,behavior:"smooth"}); }}
                title={futuro ? "" : "Registrar este dia"} className={"mtp-cal-dia"+(futuro?"":" tem")+(hoje?" hoje":"")}
                style={{border:"1px dashed "+(hoje?"color-mix(in srgb, var(--accent) 33.3%, transparent)":"var(--line)"),background:"transparent",minHeight:"118px",opacity:futuro?0.4:0.8}}>
                <span className="mtp-cal-rot">{nome}</span>
                <span className="mtp-cal-num">{+ds.slice(8)}</span>
                <span className="mtp-cal-sub">{futuro ? "—" : "+ registrar"}</span>
              </button>
            );
          }
          const partes = somaPorMoeda(e.trades), cor = corDasPartes(partes);
          const trs = e.trades || [];
          const wr = trs.length ? Math.round(trs.filter(t=>t.tipo==="WIN").length / trs.length * 100) : null;
          return (
            <button key={ds} type="button" onClick={()=>setDiaModal(ds)} title="Ver o dia" className={"mtp-cal-dia tem"+(hoje?" hoje":"")}
              style={{border:"1px solid "+alfa(cor,hoje?"66":"33"),background:"linear-gradient(180deg,"+alfa(cor,"14")+","+alfa(cor,"05")+")",minHeight:"118px",overflow:"hidden"}}>
              <span className="mtp-cal-rot">{nome}</span>
              <span className="mtp-cal-num">{+ds.slice(8)}</span>
              <Valores partes={partes} empilhar style={{fontSize:"16px"}}/>
              <span className="mtp-cal-sub">{trs.length} trade{trs.length!==1?"s":""}{wr!==null && <> · <b style={{color:wr>=60?"var(--accent)":wr>=40?"var(--warn-2)":"var(--neg)"}}>{wr}%</b></>}</span>
              {e.emocoes?.length > 0 && <span className="mtp-cal-sub" style={{color:EMOCAO_COLORS[e.emocoes[0]]||"var(--text-mute)",fontWeight:"600"}}>{e.emocoes[0]}{e.emocoes.length>1 ? " +"+(e.emocoes.length-1) : ""}</span>}
            </button>
          );
        })}
      </div>

      {/* Semana aberta: dias em abas, o dia escolhido mostra emoções, operações e observação */}
      {semanaAberta && diaAberto && (
        <Modal onClose={()=>setDiaModal(null)} width={880}>
          <div style={{padding:"22px 24px 24px",display:"flex",flexDirection:"column",gap:"18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"14px"}}>
              <div style={{minWidth:0}}>
                <p style={{margin:0,color:"var(--text-3)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.4px",fontWeight:"700"}}>Esta semana</p>
                <p style={{margin:"4px 0 0",color:"var(--text)",fontSize:"19px",fontWeight:"800"}}>{rotuloSemana(semanaAberta.chave)}</p>
                <p style={{margin:"6px 0 0",color:"var(--text-3)",fontSize:"13px"}}>
                  {semanaAberta.dias.length} {semanaAberta.dias.length===1?"dia":"dias"} · {semanaAberta.numTrades} trade{semanaAberta.numTrades!==1?"s":""}
                  {semanaAberta.winRate!==null && <> · <span style={{color:"var(--accent)",fontWeight:"600"}}>{semanaAberta.winRate}% acerto</span></>} ·{" "}
                  <Valores partes={semanaAberta.partes}/>
                </p>
              </div>
              <button onClick={()=>setDiaModal(null)} className="mtp-drawer-close" aria-label="Fechar">×</button>
            </div>

            {/* Abas dos dias, em ordem cronológica */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(112px,1fr))",gap:"8px"}}>
              {[...semanaAberta.dias].reverse().map(([ds,e])=>{
                const partes = somaPorMoeda(e.trades), on = ds === diaAberto[0];
                const cor = corDasPartes(partes);
                return (
                  <button key={ds} type="button" onClick={()=>setDiaModal(ds)} aria-pressed={on} className={"mtp-cal-dia tem"+(ds===today?" hoje":"")}
                    style={{border:"1px solid "+(on?alfa(cor,"88"):"var(--line)"),background:on?alfa(cor,"18"):"color-mix(in srgb, var(--ink) 2%, transparent)",minHeight:"78px"}}>
                    <span className="mtp-cal-rot">{ds===today?"Hoje":DIAS_SEMANA[new Date(ds+"T12:00").getDay()]}</span>
                    <span className="mtp-cal-num">{+ds.slice(8)}</span>
                    <Valores partes={partes} compacto empilhar style={{fontSize:"13.5px"}}/>
                    <span className="mtp-cal-sub">{(e.trades||[]).length} trade{(e.trades||[]).length!==1?"s":""}</span>
                  </button>
                );
              })}
            </div>

        {[diaAberto].map(([ds, entry]) => {
          const isToday = ds === today;
          return (
            <div key={ds} style={{borderRadius:"14px",overflow:"hidden",border:"1px solid "+(isToday?"color-mix(in srgb, var(--accent) 13.3%, transparent)":"var(--line)"),background:"var(--card)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 18px"}}>
                <div style={{minWidth:"100px"}}>
                  <p style={{margin:0,color:isToday?"var(--accent)":"var(--text-2)",fontSize:"13px",fontWeight:"600"}}>{isToday?"Hoje":formatDateFull(ds)}</p>
                </div>
                <div style={{display:"flex",gap:"14px",flex:1,flexWrap:"wrap",alignItems:"center"}}>
                  {entry.numTrades !== undefined && <span style={{color:"var(--text-soft)",fontSize:"13px"}}>{entry.numTrades} trade{entry.numTrades!==1?"s":""}</span>}
                  {entry.winRate   !== undefined && <span style={{color:"var(--accent)",fontSize:"13px",fontWeight:"600"}}>{entry.winRate}% acerto</span>}
                  {entry.emocoes?.length > 0 && <span style={{color:EMOCAO_COLORS[entry.emocoes[0]]||"var(--text-mute)",fontSize:"13px"}}>{entry.emocoes[0]}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                  {entry.totalPts !== undefined && <span style={{color:entry.totalPts>=0?"var(--accent)":"var(--neg)",fontSize:"14px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{entry.totalPts>=0?"+":""}{Number((+entry.totalPts).toFixed(1))} pts</span>}
                  <Valores partes={somaPorMoeda(entry.trades)} style={{fontSize:"14px",fontWeight:700}}/>
                  <button title="Apagar o dia inteiro" onClick={e=>{e.stopPropagation();setConfirmacao({titulo:"Apagar o dia "+formatDateFull(ds)+"?",texto:"Isso apaga "+((entries[ds]?.trades||[]).length)+" operação(ões), as emoções e a observação desse dia. Não dá para desfazer.",botao:"Apagar dia",acao:()=>deleteEntry(ds)});}} style={{background:"none",border:"none",color:"var(--text-4)",cursor:"pointer",fontSize:"14px",padding:"2px 6px"}}>✕</button>
                </div>
              </div>
                <div style={{borderTop:"1px solid var(--line)",padding:"16px 18px"}}>
                  {entry.emocoes?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                        {entry.emocoes.map(em=><span key={em} style={{padding:"4px 12px",borderRadius:"20px",background:alfa(EMOCAO_COLORS[em]||"var(--text-mute)","1a"),color:EMOCAO_COLORS[em]||"var(--text-mute)",fontSize:"13px",fontWeight:"600",border:"1px solid "+alfa(EMOCAO_COLORS[em]||"var(--text-mute)","44")}}>{em}</span>)}
                      </div>
                    </div>
                  )}
                  {entry.trades?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações</p>
                      {entry.trades.map((t,i)=>{
                        const isEditing = editingTrade?.dateKey===ds && editingTrade?.index===i;
                        if (isEditing) {
                          const ed = editingTrade.data;
                          const inpE = {background:"var(--surface)",border:"1px solid var(--line-strong)",borderRadius:"6px",padding:"6px 10px",color:"var(--text)",fontSize:"13px",outline:"none",fontFamily:"var(--font-sans)"};
                          return (
                            <div key={i} style={{padding:"12px 14px",borderRadius:"10px",background:"color-mix(in srgb, var(--accent) 4%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)",marginBottom:"6px"}}>
                              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",marginBottom:"8px"}}>
                                <Select value={ed.tipo} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,tipo:v}}))} style={{...inpE,width:"100px"}} options={[{value:"WIN",label:"WIN",cor:"var(--accent)"},{value:"LOSS",label:"LOSS",cor:"var(--neg)"}]}/>
                                <Select value={ed.mercado} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,mercado:v}}))} style={{...inpE,width:"118px"}} popWidth={150} options={[{value:"B3",label:"B3",cor:"var(--accent)"},{value:"Forex",label:"Forex",cor:"var(--warn)"},{value:"Cripto",label:"Cripto",cor:"#a78bfa"},{value:"Americano",label:"Americano",cor:"#60a5fa"}]}/>
                                <input type="text" inputMode="decimal" placeholder="Pontos" value={ed.pontos} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,pontos:soNumero(e.target.value)}}))} style={{...inpE,width:"90px"}}/>
                                <Select value={ed.ativo||""} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,ativo:v}}))} style={{...inpE,width:"118px"}} popWidth={190} placeholder="Ativo"
                                  options={[{value:"",label:"Sem ativo"}, ...[...new Set([...(ed.ativo?[ed.ativo]:[]), ...opcoesDeAtivo(entries, ed.mercado)])].map(a=>({value:a,label:a,hint:rotuloAtivo(ed.mercado,a)}))]}/>
                                <input type="text" inputMode="decimal" placeholder={ed.mercado==="B3"?"R$":"$"} title={ed.descontar?"Resultado bruto (os custos são descontados)":"Resultado"} value={ed.resultado} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,resultado:soNumero(e.target.value)}}))} style={{...inpE,width:"90px"}}/>
                                <input type="text" inputMode="numeric" placeholder="Lotes" value={ed.contratos} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,contratos:soNumero(e.target.value, { inteiro:true })}}))} style={{...inpE,width:"70px"}}/>
                                <div onClick={()=>setEditingTrade(p=>({...p,data:{...p.data,descontar:!p.data.descontar}}))} style={{display:"flex",alignItems:"center",gap:"7px",cursor:"pointer",userSelect:"none"}}>
                                  <Check marcado={ed.descontar}/><span style={{color:"var(--text-2)",fontSize:"12px"}}>Descontar custos</span>
                                </div>
                                {contas.length > 1 && (
                                  <Select value={ed.conta} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,conta:v}}))} style={{...inpE,width:"150px"}} popWidth={240} title="Conta"
                                    options={contas.map(c=>({value:c.id,label:c.nome,cor:TIPOS_CONTA[c.tipo]?.cor}))}/>
                                )}
                                <Select value={ed.estrategia||""} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,estrategia:v}}))} style={{...inpE,flex:1,minWidth:"140px"}} placeholder="Estratégia"
                                  options={[{value:"",label:"Sem estratégia"}, ...estrategias.map(e=>({value:e.nome,label:e.nome}))]}/>
                              </div>
                              <input type="text" placeholder="Observação" value={ed.observacao} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,observacao:e.target.value}}))} style={{...inpE,width:"100%",boxSizing:"border-box",marginBottom:"8px"}}/>
                              <div style={{display:"flex",gap:"8px"}}>
                                <button onClick={saveEditTrade} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"6px",padding:"7px 16px",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>Salvar</button>
                                <button onClick={()=>setEditingTrade(null)} style={{background:"transparent",color:"var(--text-mute)",border:"1px solid var(--line-strong)",borderRadius:"6px",padding:"7px 14px",fontSize:"12px",cursor:"pointer"}}>Cancelar</button>
                                {ed.descontar && !(parseInt(ed.contratos) > 0) && <span style={{alignSelf:"center",color:"var(--neg-soft)",fontSize:"12px"}}>Informe os lotes para calcular os custos.</span>}
                              </div>
                            </div>
                          );
                        }
                        const temImagens = (t.imagens||[]).length > 0;
                        return (
                          <div key={i} style={{borderRadius:"8px",background:"color-mix(in srgb, var(--ink) 2%, transparent)",marginBottom:"5px",overflow:"hidden"}}>
                            {/* Info row */}
                            <div style={{display:"flex",gap:"10px",alignItems:"center",padding:"9px 12px",flexWrap:"wrap"}}>
                              <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"12px",fontWeight:"700",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)"}}>{t.tipo}</span>
                              <span style={{color:"var(--text-soft)",fontSize:"13px"}}>{t.mercado}{t.ativo && <b style={{marginLeft:"6px",fontFamily:"var(--font-mono)",color:"var(--text)"}}>{t.ativo}</b>}</span>
                              {t.pontos!==null&&t.pontos!==undefined&&<span style={{color:"var(--text-2)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{Number((+t.pontos).toFixed(1))} pts</span>}
                              {t.resultado!==null&&t.resultado!==undefined&&<span style={{color:t.resultado>=0?"var(--accent)":"var(--neg)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":"-"}{t.mercado==="B3"?"R$":"$"} {Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>}
                              {t.contratos&&<span style={{color:"var(--text-soft)",fontSize:"11px",background:"color-mix(in srgb, var(--ink) 5%, transparent)",padding:"2px 7px",borderRadius:"4px",fontFamily:"var(--font-mono)"}}>{t.contratos}×</span>}
                              <TagCustos t={t}/>
                              {t.qualidade&&<EstrelasMini q={t.qualidade}/>}
                              {t.estrategia&&<span style={{color:"var(--text-mute)",fontSize:"12px",background:"color-mix(in srgb, var(--ink) 4%, transparent)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                              {t.observacao&&<span style={{color:"var(--text-mute)",fontSize:"12px",fontStyle:"italic"}}>"{t.observacao}"</span>}
                              <div style={{marginLeft:"auto",display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
                                {temImagens&&<span style={{color:"var(--text-3)",fontSize:"11px",background:"color-mix(in srgb, var(--ink) 4%, transparent)",padding:"2px 7px",borderRadius:"4px",display:"flex",alignItems:"center",gap:"3px"}}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                  {t.imagens.length}
                                </span>}
                                <label style={{cursor:"pointer",display:"flex",alignItems:"center",gap:"4px",padding:"4px 9px",borderRadius:"6px",border:"1px solid var(--line-strong)",color:"var(--text-3)",fontSize:"11px",fontWeight:"600",background:"transparent",transition:"all 0.15s"}}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor="color-mix(in srgb, var(--accent) 26.7%, transparent)";e.currentTarget.style.color="var(--accent)";}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-strong)";e.currentTarget.style.color="var(--text-5)";}}>
                                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleSavedImageUpload(e.target.files[0],ds,i);}}/>
                                  {uploadingIdx===i
                                    ?<span style={{fontSize:"10px"}}>⏳</span>
                                    :<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                                  Foto
                                </label>
                                <button onClick={e=>{e.stopPropagation();startEditTrade(ds,i,t);}} style={{background:"none",border:"1px solid var(--line-strong)",borderRadius:"5px",color:"var(--text-3)",cursor:"pointer",fontSize:"11px",fontWeight:"600",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px",transition:"all 0.15s"}}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor="color-mix(in srgb, var(--accent) 26.7%, transparent)";e.currentTarget.style.color="var(--accent)";}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--line-strong)";e.currentTarget.style.color="var(--text-5)";}}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  Editar
                                </button>
                                <button title="Apagar esta operação" onClick={e=>{e.stopPropagation();setConfirmacao({titulo:"Apagar esta operação?",texto:(t.tipo||"")+" "+(t.mercado||"")+(t.ativo?" "+t.ativo:"")+(t.resultado!=null?" · "+(t.resultado>=0?"+":"-")+(t.mercado==="B3"?"R$ ":"$ ")+Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2}):"")+" — os totais do dia são recalculados. Não dá para desfazer.",botao:"Apagar",acao:()=>apagarOperacaoSalva(ds,i)});}}
                                  style={{background:"none",border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)",borderRadius:"5px",color:"var(--neg-soft)",cursor:"pointer",fontSize:"11px",fontWeight:"600",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px"}}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                  Apagar
                                </button>
                              </div>
                            </div>
                            {/* Image gallery strip */}
                            {temImagens&&(
                              <div style={{padding:"6px 12px 10px",display:"flex",gap:"8px",flexWrap:"wrap",borderTop:"1px solid var(--line)"}}>
                                {t.imagens.map((url,ii)=>(
                                  <div key={ii} style={{width:"100px",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--line-strong)",boxShadow:"0 2px 8px color-mix(in srgb, var(--shade) 35%, transparent)"}}>
                                    <ImagemSegura url={url} style={{width:"100%",height:"70px",objectFit:"cover",display:"block",cursor:"pointer"}} onClick={()=>setViewerImg(url)}/>
                                    <div style={{display:"flex",background:"var(--surface)",borderTop:"1px solid var(--line)"}}>
                                      <button onClick={()=>setEditorImg({...fonteDoEditor(t,url),saved:true,dateKey:ds,tradeIdx:i,url})}
                                        style={{flex:1,background:"transparent",border:"none",borderRight:"1px solid var(--line)",color:"var(--text-soft)",cursor:"pointer",padding:"5px 0",fontSize:"10px",fontWeight:"600",fontFamily:"var(--font-sans)",transition:"color 0.15s"}}
                                        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"}
                                        onMouseLeave={e=>e.currentTarget.style.color="var(--text-mute)"}>
                                        Editar
                                      </button>
                                      <button onClick={()=>handleDeleteImage(ds,i,url)}
                                        style={{flex:1,background:"transparent",border:"none",color:"color-mix(in srgb, var(--neg) 53.3%, transparent)",cursor:"pointer",padding:"5px 0",fontSize:"10px",fontWeight:"600",fontFamily:"var(--font-sans)",transition:"color 0.15s"}}
                                        onMouseEnter={e=>e.currentTarget.style.color="var(--neg)"}
                                        onMouseLeave={e=>e.currentTarget.style.color="color-mix(in srgb, var(--neg) 53.3%, transparent)"}>
                                        Excluir
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {entry.observacao&&(
                    <div>
                      <p style={{margin:"0 0 6px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observações</p>
                      <p style={{margin:0,color:"var(--text-soft)",fontSize:"14px",lineHeight:"1.6",fontStyle:"italic"}}>{entry.observacao}</p>
                    </div>
                  )}
                </div>
            </div>
          );
        })}
          </div>
        </Modal>
      )}

      {/* Image Editor Modal */}
      {editorImg && (
        <ImageEditor
          src={editorImg.src}
          formasIniciais={editorImg.formas}
          onClose={()=>setEditorImg(null)}
          onSave={async(file, formas)=>{
            if (editorImg.isNew) {
              // Foto anotada + original e desenhos (para reabrir editável) + demais arquivos escolhidos
              const preview = URL.createObjectURL(file);
              const others = editorImg.otherFiles || [];
              setPendingImages(prev=>[...prev, {file, preview, original:editorImg.file, formas}, ...others]);
            } else if(editorImg.saved) {
              await handleSavedImageReplace(file, formas, editorImg.dateKey, editorImg.tradeIdx, editorImg.url);
            } else {
              await handleImageFile(file, editorImg.tradeId);
            }
          }}
        />
      )}

      {/* Image Viewer fullscreen */}
      {viewerImg && <ImageViewer url={viewerImg} onClose={()=>setViewerImg(null)} acao={acaoExemplo(viewerImg, { entries, estrategias, saveEstrategia })}/>}
      {importacao && (
        <ImportarOperacoes importacao={importacao} entries={entries} contas={contas} contaInicial={novoTrade.conta} config={config}
          estNomes={estNomes} sugerirExecucao={sugerirExecucao}
          onCancelar={()=>setImportacao(null)} onSalvar={salvarImportacao}/>
      )}
      {confirmacao && (
        <Confirmar titulo={confirmacao.titulo} texto={confirmacao.texto} botao={confirmacao.botao}
          onCancelar={()=>setConfirmacao(null)}
          onConfirmar={async()=>{ await confirmacao.acao(); setConfirmacao(null); }}/>
      )}
    </div>
  );
}

// ── Custos do dia de uma carteira da B3: resumo, zeragem automática e o total líquido da nota.
// Com a nota informada, os custos do dia passam a ser bruto − líquido e a banca bate com a corretora.
function CustosDoDia({ cart, entry, config, varias, onSalvar }) {
  const cfg = custosDaConta(config, cart.contaId);
  const dia = entry.custosDia?.[cart.key] || {};
  const temNota = typeof dia.liquidoNota === "number";
  const [nota, setNota] = useState(temNota ? fmtR(dia.liquidoNota) : "");
  const [dc, setDc] = useState(temNota && dia.liquidoNota > 0 ? "C" : "D");
  const [salvando, setSalvando] = useState(false);
  const res = resumoCustos(entry.trades, cart);
  if (!cfg.automatico && !res.n && !entry.custosDia?.[cart.key]) return null;

  const doDia = (entry.trades || []).filter(t => tradeNaCarteira(t, cart) && typeof (t.descontaCustos ? t.bruto : t.resultado) === "number");
  const brutoDia = r2(doDia.reduce((s, t) => s + (t.descontaCustos ? t.bruto : t.resultado), 0));
  const n = parseFloat(String(nota).trim().replace(/\./g, "").replace(",", "."));
  const liquido = isNaN(n) ? null : r2(dc === "C" ? Math.abs(n) : -Math.abs(n));
  const custosNota = liquido === null ? null : r2(brutoDia - liquido);
  const zer = valorZeragem(cfg);
  const sinal = v => (v >= 0 ? "+" : "-") + "R$ " + fmtR(v);
  async function salvar(campos) { setSalvando(true); try { await onSalvar(campos); } finally { setSalvando(false); } }

  return (
    <div className="mtp-op-card" style={{ "--op":"var(--warn)", marginBottom:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"12px", flexWrap:"wrap" }}>
        <span style={{ color:"var(--text)", fontSize:"13.5px", fontWeight:"800" }}>Custos do dia{varias && <span style={{ color:"var(--text-3)", fontWeight:"600" }}> · {cart.label}</span>}</span>
        {res.n > 0 && (
          <span style={{ fontFamily:"var(--font-mono)", fontSize:"12.5px", color:"var(--text-3)" }}>
            bruto {sinal(res.bruto)} · custos <span style={{ color:"var(--warn)" }}>−R$ {fmtR(res.custos)}</span> · líquido <b style={{ color:res.liquido >= 0 ? "var(--accent)" : "var(--neg)" }}>{sinal(res.liquido)}</b>
          </span>
        )}
      </div>

      {zer > 0 && (
        <div onClick={() => !temNota && !salvando && salvar({ zeragem: dia.zeragem ? null : zer })}
          style={{ display:"flex", alignItems:"center", gap:"9px", cursor:temNota ? "default" : "pointer", userSelect:"none", opacity:temNota ? 0.5 : 1 }}>
          <Check marcado={!!dia.zeragem}/>
          <span style={{ color:"var(--text-2)", fontSize:"13px" }}>Teve zeragem automática <span style={{ color:"var(--text-3)", fontFamily:"var(--font-mono)" }}>(−R$ {fmtR(dia.zeragem || zer)})</span>{temNota && " — já incluída na nota"}</span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
        <span style={{ color:"var(--text-2)", fontSize:"13px" }}>Total líquido da nota</span>
        <input value={nota} onChange={e => setNota(e.target.value)} inputMode="decimal" placeholder="0,00"
          style={{ background:"var(--line)", border:"1px solid var(--line-strong)", borderRadius:"8px", padding:"7px 11px", color:"var(--text)", fontSize:"13.5px", outline:"none", fontFamily:"var(--font-mono)", width:"120px" }}/>
        <div className="mtp-seg">
          {[["D","var(--neg)"],["C","var(--accent)"]].map(([k, c]) => (
            <button key={k} type="button" onClick={() => setDc(k)} className={dc === k ? "on" : ""} style={{ "--seg":c }} title={k === "D" ? "Débito (saiu da conta)" : "Crédito (entrou na conta)"}>{k}</button>
          ))}
        </div>
        <button type="button" className="mtp-btn-sec" disabled={liquido === null || salvando || (temNota && liquido === dia.liquidoNota)}
          onClick={() => salvar({ liquidoNota: liquido, zeragem: null })} style={{ minHeight:"32px" }}>{temNota ? "Atualizar" : "Aplicar"}</button>
        {temNota && <button type="button" className="mtp-btn-sec" disabled={salvando} onClick={() => { setNota(""); salvar({ liquidoNota: null }); }} style={{ minHeight:"32px" }}>Remover</button>}
      </div>

      <p style={{ margin:0, color:custosNota !== null && custosNota < 0 ? "var(--neg-soft)" : "var(--text-3)", fontSize:"12px", lineHeight:1.6 }}>
        {temNota && liquido === dia.liquidoNota
          ? <>✓ Conferido pela nota: custos reais de R$ {fmtR(res.custos)} divididos entre as {res.n} operações.</>
          : custosNota !== null
            ? custosNota < 0
              ? <>O líquido da nota é maior que o bruto lançado ({sinal(brutoDia)}). Confira se todas as operações do dia estão no Diário.</>
              : <>Bruto lançado {sinal(brutoDia)} → custos reais de R$ {fmtR(custosNota)}.</>
            : <>Copie o "Total líquido da nota" da sua nota de corretagem, com D ou C. A banca passa a bater exatamente com a corretora (taxas, IRRF e zeragem incluídos).</>}
      </p>
    </div>
  );
}

// ── Prévia da importação: cada linha do arquivo vira uma operação; o trader completa
// estratégia, execução, comentário e fotos de cada uma, e as emoções/observação de cada dia
function ImportarOperacoes({ importacao, entries, contas, contaInicial, config, estNomes, sugerirExecucao, onCancelar, onSalvar }) {
  const chaveConta = "mtp-import-conta-" + importacao.conta;
  const [conta, setConta] = useState(() => {
    let lembrada = null;
    try { lembrada = importacao.conta ? localStorage.getItem(chaveConta) : null; } catch { /* sem storage */ }
    return contas.some(c => c.id === lembrada) ? lembrada : contaInicial;
  });
  const [ops, setOps] = useState(() => importacao.operacoes.map((op, i) => {
    const dup = jaRegistrada(op, entries[op.data]?.trades);
    return { ...op, id:i, dup, incluir:!dup, estrategia:"", qualidade:"", observacao:"", fotos:[] };
  }));
  const dias = [...new Set(importacao.operacoes.map(o => o.data))].sort();
  const [diasInfo, setDiasInfo] = useState(() => Object.fromEntries(dias.map(d => [d, { emocoes:[], observacao:"" }])));
  const [salvando, setSalvando] = useState(false);
  // undefined = segue a configuração da conta escolhida
  const [descontarEsc, setDescontar] = useState(undefined);
  const cfgCustos = custosDaConta(config, conta);
  const descontar = importacao.plataforma !== "MT5" && (descontarEsc ?? cfgCustos.automatico);

  const comEstrategia = (o, n) => ({ ...o, estrategia:n, qualidade: o.qualidade || (n ? sugerirExecucao(n) : "") || "" });
  const mudar = (id, f) => setOps(p => p.map(o => o.id === id ? f(o) : o));
  const mudarDia = (d, campo) => setDiasInfo(p => ({ ...p, [d]: { ...p[d], ...campo } }));
  const addFotos = (id, files) => {
    const imgs = Array.from(files || []).filter(f => f.type.startsWith("image/"));
    if (imgs.length) mudar(id, o => ({ ...o, fotos:[...o.fotos, ...imgs.map(file => ({ file, preview:URL.createObjectURL(file) }))] }));
  };
  const tirarFoto = (id, j) => mudar(id, o => { URL.revokeObjectURL(o.fotos[j].preview); return { ...o, fotos:o.fotos.filter((_, k) => k !== j) }; });

  const selecionadas = ops.filter(o => o.incluir);
  const duplicadas = ops.filter(o => o.dup).length;
  const mt5 = importacao.plataforma === "MT5";
  const brl = v => (v >= 0 ? "+" : "-") + (importacao.moeda || "R$") + " " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
  const optsEst = [{ value:"", label:"Sem estratégia" }, ...estNomes.map(n => ({ value:n, label:n }))];
  const preenchido = ops.some(o => o.estrategia || o.qualidade || o.observacao || o.fotos.length) || Object.values(diasInfo).some(d => d.emocoes.length || d.observacao);

  function fechar() {
    if (salvando) return;
    if (preenchido && !window.confirm("Descartar o que você preencheu nesta importação?")) return;
    ops.forEach(o => o.fotos.forEach(f => URL.revokeObjectURL(f.preview)));
    onCancelar();
  }

  async function salvar() {
    setSalvando(true);
    try { if (importacao.conta) localStorage.setItem(chaveConta, conta); } catch { /* sem storage */ }
    try { await onSalvar(selecionadas, conta, diasInfo, descontar); } finally { setSalvando(false); }
  }

  const rotulo = { color:"var(--text-3)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1.2px", fontWeight:"700", display:"block", marginBottom:"10px" };
  const campo = { background:"var(--line)", border:"1px solid var(--line-strong)", borderRadius:"8px", padding:"8px 12px", color:"var(--text)", fontSize:"13px", outline:"none", fontFamily:"var(--font-sans)", boxSizing:"border-box" };

  return (
    <Modal onClose={fechar} width={920}>
      <div style={{ padding:"24px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"14px", flexWrap:"wrap" }}>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, color:"var(--text)", fontSize:"17px", fontWeight:"800" }}>Importar operações</p>
            <p style={{ margin:"6px 0 0", color:"var(--text-3)", fontSize:"12.5px", lineHeight:1.6, wordBreak:"break-word" }}>
              {importacao.nome}{importacao.conta && <> · conta {importacao.conta}</>} · {ops.length} {ops.length === 1 ? "operação" : "operações"}
              {duplicadas > 0 && <> · <span style={{ color:"var(--warn)" }}>{duplicadas} já {duplicadas === 1 ? "registrada" : "registradas"}</span></>}
              {importacao.repetidas > 0 && <> · <span style={{ color:"var(--warn)" }}>{importacao.repetidas} {importacao.repetidas === 1 ? "linha repetida no arquivo foi ignorada" : "linhas repetidas no arquivo foram ignoradas"}</span></>}
            </p>
          </div>
          {contas.length > 1 && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <span style={{ color:"var(--text-3)", fontSize:"12px" }}>Lançar em</span>
              <Select value={conta} onChange={setConta} popWidth={240} align="right"
                style={{ minHeight:"32px", padding:"5px 12px", borderRadius:"20px", fontSize:"12.5px" }}
                options={contas.map(c => ({ value:c.id, label:c.nome, cor:TIPOS_CONTA[c.tipo]?.cor }))}/>
            </div>
          )}
        </div>

        {dias.map(dia => {
          const doDia = ops.filter(o => o.data === dia);
          const tot = doDia.filter(o => o.incluir).reduce((s, o) => s + o.resultado, 0);
          const custoDia = descontar ? r2(doDia.filter(o => o.incluir && (o.mercado || "B3") === "B3").reduce((s, o) => s + (o.contratos || 1) * r2(custoPorContrato(cfgCustos, o.ativo)), 0)) : 0;
          const info = diasInfo[dia];
          return (
            <div key={dia} style={{ display:"flex", flexDirection:"column", gap:"16px", paddingTop:dias.length > 1 ? "6px" : 0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"10px" }}>
                <span style={{ color:"var(--text)", fontSize:"14px", fontWeight:"800" }}>{formatDateLong(dia)}</span>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:"13px", color:tot - custoDia >= 0 ? "var(--accent)" : "var(--neg)", fontWeight:"700" }}>
                  {custoDia > 0 && <span style={{ color:"var(--text-3)", fontWeight:"500" }}>bruto {brl(tot)} · custos −R$ {fmtR(custoDia)} · </span>}{brl(tot - custoDia)}
                </span>
              </div>

              {/* Emoções do dia */}
              <div>
                <span style={rotulo}>Emoções do dia</span>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {EMOCOES.map(em => {
                    const on = info.emocoes.includes(em);
                    const cor = EMOCAO_COLORS[em] || "var(--text-mute)";
                    return <button key={em} type="button" onClick={() => mudarDia(dia, { emocoes: on ? info.emocoes.filter(e => e !== em) : [...info.emocoes, em] })}
                      style={{ padding:"6px 11px", borderRadius:"20px", border:"1px solid " + (on ? alfa(cor,"66") : "var(--line-strong)"), background:on ? alfa(cor,"1a") : "transparent", color:on ? cor : "var(--text-soft)", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>{em}</button>;
                  })}
                </div>
              </div>

              {/* Operações */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"10px", flexWrap:"wrap", marginBottom:"10px" }}>
                  <span style={{ ...rotulo, marginBottom:0 }}>Operações</span>
                  {estNomes.length > 0 && doDia.filter(o => o.incluir).length > 1 && (
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <span style={{ color:"var(--text-3)", fontSize:"12px" }}>Mesma estratégia para todas:</span>
                      <Select value="" onChange={n => setOps(p => p.map(o => o.incluir && o.data === dia ? comEstrategia(o, n) : o))} placeholder="Escolher..." popWidth={220} align="right"
                        style={{ minHeight:"30px", padding:"4px 12px", borderRadius:"20px", fontSize:"12px", minWidth:"140px" }} options={optsEst}/>
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                  {doDia.map(o => {
                    const cor = o.tipo === "WIN" ? "var(--accent)" : "var(--neg)";
                    return (
                      <div key={o.id} className="mtp-op-card" style={{ "--op":cor, opacity:o.incluir ? 1 : 0.45, display:"flex", flexDirection:"column", gap:"12px" }}
                        onPaste={e => { if (o.incluir && e.clipboardData?.files?.length) { e.preventDefault(); addFotos(o.id, e.clipboardData.files); } }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                          <input type="checkbox" checked={o.incluir} onChange={e => mudar(o.id, x => ({ ...x, incluir:e.target.checked }))}
                            aria-label="Importar esta operação" style={{ width:"16px", height:"16px", accentColor:"var(--accent)", cursor:"pointer" }}/>
                          <span style={{ color:"var(--text-3)", fontSize:"12.5px", fontFamily:"var(--font-mono)" }}>{o.horario}</span>
                          <span style={{ padding:"3px 9px", borderRadius:"6px", fontSize:"11.5px", fontWeight:"800", background:alfa(cor,"1f"), color:cor }}>{o.tipo}</span>
                          <span style={{ color:cor, fontSize:"14.5px", fontWeight:"700", fontFamily:"var(--font-mono)", minWidth:"96px" }}>{brl(o.resultado)}</span>
                          {o.pontos !== null && <span style={{ color:"var(--text-2)", fontSize:"12.5px", fontFamily:"var(--font-mono)" }}>{o.pontos >= 0 ? "+" : ""}{o.pontos} {mt5 ? "pips" : "pts"}</span>}
                          <span className="mtp-tag"><b style={{ fontFamily:"var(--font-mono)", color:"var(--text)" }}>{o.ativo}</b></span>
                          {o.lado && <span className="mtp-tag">{o.lado}</span>}
                          {o.contratos && <span className="mtp-tag" style={{ fontFamily:"var(--font-mono)" }}>{o.contratos}{mt5 ? (o.contratos <= 1 ? " lote" : " lotes") : "×"}</span>}
                          {o.dup && <span className="mtp-tag" style={{ color:"var(--warn)" }}>já registrada</span>}
                          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginLeft:"auto", flexWrap:"wrap" }}>
                            {estNomes.length > 0 && (
                              <Select value={o.estrategia} onChange={n => mudar(o.id, x => comEstrategia(x, n))} placeholder="Estratégia" popWidth={220} align="right"
                                style={{ minHeight:"32px", padding:"5px 12px", borderRadius:"10px", fontSize:"12.5px", width:"150px" }} options={optsEst}/>
                            )}
                            <EstrelasInput value={estrelasDe(o.qualidade)} onChange={n => mudar(o.id, x => ({ ...x, qualidade:n || "" }))}/>
                          </div>
                        </div>
                        {o.incluir && (
                          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                            <input value={o.observacao} onChange={e => mudar(o.id, x => ({ ...x, observacao:e.target.value }))}
                              placeholder="Comentário da operação (cole o print aqui com Ctrl+V)" style={{ ...campo, flex:"1 1 260px", minWidth:0 }}/>
                            <label className="mtp-btn-sec" style={{ minHeight:"36px", cursor:"pointer" }} title="Adicionar fotos desta operação">
                              <input type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e => { addFotos(o.id, e.target.files); e.target.value = ""; }}/>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              Foto{o.fotos.length > 0 && <span className="mtp-ctx-badge">{o.fotos.length}</span>}
                            </label>
                            {o.fotos.length > 0 && (
                              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", flexBasis:"100%" }}>
                                {o.fotos.map((f, j) => (
                                  <div key={f.preview} style={{ position:"relative", width:"84px", height:"58px", borderRadius:"8px", overflow:"hidden", border:"1px solid var(--line-strong)" }}>
                                    <img src={f.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                                    <button type="button" onClick={() => tirarFoto(o.id, j)} aria-label="Remover foto"
                                      style={{ position:"absolute", top:"4px", right:"4px", width:"20px", height:"20px", borderRadius:"50%", border:"none", background:"rgba(0,0,0,0.7)", color:"#fff", fontSize:"12px", cursor:"pointer", padding:0 }}>×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observação geral do dia */}
              <div>
                <span style={rotulo}>Observação geral do dia</span>
                <textarea value={info.observacao} onChange={e => mudarDia(dia, { observacao:e.target.value })} rows={3}
                  placeholder={entries[dia]?.observacao ? "Será adicionada à observação que o dia já tem" : "Como foi o dia? Setup, erros, aprendizados..."}
                  style={{ ...campo, width:"100%", resize:"vertical", lineHeight:1.6, minHeight:"72px", fontSize:"13.5px", padding:"10px 13px" }}/>
              </div>
            </div>
          );
        })}

        <p style={{ margin:0, color:"var(--text-3)", fontSize:"12px", lineHeight:1.6 }}>
          {mt5
            ? "Resultado líquido (lucro + comissão + swap), igual ao que entra no saldo. Horários convertidos do servidor da corretora (GMT+2/+3) para o seu horário."
            : descontar
              ? "Resultado bruto da plataforma, com os custos da conta descontados (taxas por contrato" + (cfgCustos.irrf ? " e IRRF" : "") + "). Para bater no centavo, informe depois o total da nota no dia."
              : "Resultado bruto, como vem da plataforma (sem corretagem e emolumentos)."}{" "}
          Cada operação entra no Diário no próprio dia e pode ser editada depois.
        </p>
        {!mt5 && (
          <div onClick={() => setDescontar(!descontar)} style={{ display:"flex", alignItems:"center", gap:"9px", cursor:"pointer", userSelect:"none", marginTop:"-6px" }}>
            <Check marcado={descontar}/>
            <span style={{ color:"var(--text-2)", fontSize:"13px" }}>Descontar custos operacionais</span>
          </div>
        )}

        <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={fechar} disabled={salvando} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"10px 16px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !selecionadas.length}
            style={{ background:selecionadas.length ? "linear-gradient(135deg,#2ee6a0,#1fc98a)" : "color-mix(in srgb, var(--ink) 5%, transparent)", color:selecionadas.length ? "#000" : "var(--text-3)", border:"none", borderRadius:"10px", padding:"10px 18px", fontSize:"13px", fontWeight:"800", cursor:salvando ? "wait" : selecionadas.length ? "pointer" : "not-allowed", fontFamily:"var(--font-sans)" }}>
            {salvando ? "Importando..." : "Importar " + selecionadas.length + (selecionadas.length === 1 ? " operação" : " operações")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
