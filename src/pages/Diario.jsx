import { useState, useRef, useEffect } from "react";
import { Select, TimePicker, Confirmar, Modal } from "../components/ui";
import { listaContas, contaPadrao, contaDoTrade, TIPOS_CONTA } from "../lib/contas";
import { ATIVOS_SUGERIDOS, opcoesDeAtivo, ativosUsados, normalizarAtivo, rotuloAtivo } from "../lib/ativos";
import { supabase } from "../supabase";
import { decodificarArquivo, lerOperacoes, jaRegistrada } from "../lib/importar";
import ImageEditor, { uploadTradeImage, deleteTradeImage, ImageThumb, ImageViewer, ImagemSegura } from "../components/ImageEditor";

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
const MONTH_NAMES_LONG = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function formatDateLong(s) {
  const p=s.split("-");
  return p[2]+" de "+MONTH_NAMES_LONG[parseInt(p[1])-1]+" de "+p[0];
}
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function formatMonthLabel(s) { const p=s.split("-"); return MONTH_NAMES[parseInt(p[1])-1]+" "+p[0]; }

const EMOCOES = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche","Compulsivo"];
const EMOCAO_COLORS = {"Focado":"#2ee6a0","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};

// Execução em estrelas: 3 bom · 2 regular · 1 ruim. Registros antigos guardavam A+/A/B/C.
const EXECUCAO = { 3:{ rot:"bom", cor:"#2ee6a0" }, 2:{ rot:"regular", cor:"#f5b941" }, 1:{ rot:"ruim", cor:"#ff5470" } };
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
    <span title={"Execução: "+EXECUCAO[n].rot} style={{display:"inline-flex",gap:"1px",color:"#f5b941",lineHeight:0}}>
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

export default function Diario({ entries, saveEntry, deleteEntry, estrategias, uid, config }) {
  const contas = listaContas(config);
  const today    = todayKey();
  const curMonth = monthKey(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selMonth,   setSelMonth]   = useState(curMonth);
  const [expanded,   setExpanded]   = useState(null);
  const [msg,        setMsg]        = useState("");
  const [emocoes,    setEmocoes]    = useState([]);
  const [observacao, setObservacao] = useState("");
  const [trades,     setTrades]     = useState([]);
  const [novoTrade,  setNovoTrade]  = useState({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:"",horario:"",contratos:"",qualidade:"",conta:contaPadrao(config).id,ativo:ativosUsados(entries,"B3")[0]||"WIN"});
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

  // Operações adicionadas e ainda não salvas: avisa antes de fechar/recarregar a aba
  useEffect(() => {
    if (trades.length === 0) return;
    const fn = e => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [trades.length]);

  // Recalcula os totais do dia a partir dos trades (mesma regra do salvar)
  function montarDia(entry, lista) {
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
      for (const url of (alvo?.imagens || [])) await deleteTradeImage(url);
      setMsg("✓ Operação apagada."); setTimeout(()=>setMsg(""), 2500);
    }
  }

  function startEditTrade(dateKey, index, trade) {
    setEditingTrade({
      dateKey,
      index,
      data: {
        tipo: trade.tipo || "WIN",
        mercado: trade.mercado || "B3",
        pontos: trade.pontos !== undefined && trade.pontos !== null ? String(trade.pontos) : "",
        resultado: trade.resultado !== undefined && trade.resultado !== null ? String(trade.resultado) : "",
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
    const updatedTrades = entry.trades.map((t, i) => {
      if (i !== index) return t;
      // mantém o resto do trade (fotos, horário, lotes, execução)
      const updated = { ...t, mercado: data.mercado, tipo: data.tipo, estrategia: data.estrategia || "", observacao: data.observacao || "", conta: data.conta || contaDoTrade(t) };
      const ativoEd = normalizarAtivo(data.ativo);
      if (ativoEd) updated.ativo = ativoEd; else delete updated.ativo;
      if (data.pontos !== "") updated.pontos = parseFloat(data.pontos); else delete updated.pontos;
      if (data.resultado !== "") updated.resultado = parseFloat(data.resultado); else delete updated.resultado;
      return updated;
    });
    const totalB3     = updatedTrades.filter(t=>t.mercado==="B3").reduce((s,t)=>s+(t.resultado||0),0);
    const totalForex  = updatedTrades.filter(t=>t.mercado==="Forex").reduce((s,t)=>s+(t.resultado||0),0);
    const totalCripto = updatedTrades.filter(t=>t.mercado==="Cripto").reduce((s,t)=>s+(t.resultado||0),0);
    const totalAmericano = updatedTrades.filter(t=>t.mercado==="Americano").reduce((s,t)=>s+(t.resultado||0),0);
    const totalPts   = updatedTrades.reduce((s,t)=>s+(t.pontos||0),0);
    const wins       = updatedTrades.filter(t=>t.tipo==="WIN").length;
    const winRate    = updatedTrades.length > 0 ? Math.round((wins/updatedTrades.length)*100) : null;
    const data2 = { ...entry, trades: updatedTrades, numTrades: updatedTrades.length, totalPts };
    if (totalB3     !== 0) data2.totalB3     = totalB3;     else delete data2.totalB3;
    if (totalForex  !== 0) data2.totalForex  = totalForex;  else delete data2.totalForex;
    if (totalCripto !== 0) data2.totalCripto = totalCripto; else delete data2.totalCripto;
    if (totalAmericano !== 0) data2.totalAmericano = totalAmericano; else delete data2.totalAmericano;
    if (winRate    !== null) data2.winRate = winRate;
    await saveEntry(dateKey, data2);
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
    const n = Math.abs(parseFloat(String(v).replace(",", ".")));
    return novoTrade.tipo === "LOSS" ? -n : n;
  }
  function trocarTipo(t) {
    setNovoTrade(p => {
      const ajusta = v => { const n = parseFloat(v); if (v === "" || isNaN(n) || n === 0) return v; return (t === "LOSS") === (n < 0) ? v : String(-n); };
      return { ...p, tipo:t, resultado:ajusta(p.resultado), pontos:ajusta(p.pontos) };
    });
  }
  function digitarNumero(k, v) {
    setNovoTrade(p => {
      const novo = { ...p, [k]: v };
      if (k !== "contratos" && parseFloat(v) < 0) novo.tipo = "LOSS";
      return novo;
    });
  }
  function escolherEstrategia(n) {
    const sug = sugerirExecucao(n);
    setNovoTrade(p => ({ ...p, estrategia:n, qualidade: sug || p.qualidade }));
  }

  function addTrade() {
    if (!novoTrade.resultado && !novoTrade.pontos) return;
    const t = {
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
      _pendingFiles: pendingImages.map(p=>p.file),
    };
    setTrades(prev => [...prev, t]);
    setNovoTrade(p=>({mercado:p.mercado,ativo:p.ativo,resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:"",horario:"",contratos:"",qualidade:"",conta:p.conta}));
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

  // ── Delete image from saved trade
  async function handleDeleteImage(dateKey, tradeIdx, imgUrl) {
    await deleteTradeImage(imgUrl);
    const entry = entries[dateKey];
    const updatedTrades = entry.trades.map((t,i) =>
      i===tradeIdx ? {...t, imagens:(t.imagens||[]).filter(u=>u!==imgUrl)} : t
    );
    await saveEntry(dateKey, {...entry, trades:updatedTrades});
  }

  // ── Importar operações de um .csv (cada linha = uma operação)
  function avisarImport(t) { setAvisoImport(t); setTimeout(()=>setAvisoImport(""), 6000); }

  async function abrirArquivoImportacao(file) {
    if (!file) return;
    const { conta, operacoes, erro } = lerOperacoes(decodificarArquivo(await file.arrayBuffer()));
    if (erro) { avisarImport(erro); return; }
    setImportacao({ nome: file.name, conta, operacoes });
  }

  async function salvarImportacao(selecionadas, contaId) {
    const porDia = {};
    for (const op of selecionadas) (porDia[op.data] ||= []).push(op);
    let total = 0, falhou = false;
    for (const [dia, ops] of Object.entries(porDia)) {
      const entry = entries[dia] || { emocoes: [], observacao: "" };
      const novos = ops.sort((a,b)=>a.abertura.localeCompare(b.abertura)).map(op => {
        const t = { mercado:"B3", tipo:op.tipo, estrategia:op.estrategia||"", observacao:"", horario:op.horario, abertura:op.abertura,
          contratos:op.contratos, qualidade:op.qualidade||null, conta:contaId, ativo:op.ativo, resultado:op.resultado, origem:"importado" };
        if (op.pontos !== null) t.pontos = op.pontos;
        if (op.lado) t.lado = op.lado;
        return t;
      });
      const ok = await saveEntry(dia, { ...montarDia(entry, [...(entry.trades||[]), ...novos]), ts: new Date().toISOString() });
      if (ok === false) falhou = true; else total += novos.length;
    }
    avisarImport(falhou
      ? "Parte das operações não foi salva. Importe o arquivo de novo — as que já entraram são ignoradas."
      : "✓ "+total+(total===1?" operação importada.":" operações importadas."));
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
      if (uid) {
        for (const [i, file] of (t._pendingFiles || []).entries()) {
          try { imagens.push(await uploadTradeImage(file, uid, selectedDate, t.id + "-" + i)); }
          catch (e) { console.error("upload da foto:", e); }
        }
      }
      const tr = {mercado:t.mercado, tipo:t.tipo, estrategia:t.estrategia||"", observacao:t.observacao||"", horario:t.horario||"", contratos:t.contratos||null, qualidade:t.qualidade||null, conta:t.conta||contaPadrao(config).id};
      if (t.resultado !== null) tr.resultado = t.resultado;
      if (t.pontos    !== null) tr.pontos    = t.pontos;
      if (imagens.length) tr.imagens = imagens;
      if (t.ativo) tr.ativo = t.ativo;
      novos.push(tr);
    }
    const allTrades = [...existingTrades, ...novos];
    const mergedEmocoes = [...new Set([...(todayEntry?.emocoes||[]), ...emocoes])];
    const mergedObs = observacao.trim() || todayEntry?.observacao || "";

    const totalB3     = allTrades.filter(t=>t.mercado==="B3").reduce((s,t)=>s+(t.resultado||0),0);
    const totalForex  = allTrades.filter(t=>t.mercado==="Forex").reduce((s,t)=>s+(t.resultado||0),0);
    const totalCripto = allTrades.filter(t=>t.mercado==="Cripto").reduce((s,t)=>s+(t.resultado||0),0);
    const totalAmericano = allTrades.filter(t=>t.mercado==="Americano").reduce((s,t)=>s+(t.resultado||0),0);
    const totalPts   = allTrades.reduce((s,t)=>s+(t.pontos||0),0);
    const wins       = allTrades.filter(t=>t.tipo==="WIN").length;
    const winRate    = allTrades.length > 0 ? Math.round((wins/allTrades.length)*100) : null;

    const data = {
      trades: allTrades,
      emocoes: mergedEmocoes,
      observacao: mergedObs,
      numTrades: allTrades.length,
      totalPts,
      ts: new Date().toISOString()
    };
    if (totalB3     !== 0) data.totalB3     = totalB3;
    if (totalForex  !== 0) data.totalForex  = totalForex;
    if (totalCripto !== 0) data.totalCripto = totalCripto;
    if (totalAmericano !== 0) data.totalAmericano = totalAmericano;
    if (winRate    !== null) data.winRate = winRate;

    const ok = await saveEntry(selectedDate, data);
    if (ok === false) { setMsg("Não foi possível salvar. Suas operações continuam aqui — tente de novo."); return; }
    const label = selectedDate === today ? "hoje" : "em "+formatDateFull(selectedDate);
    setMsg("✓ Salvo! "+allTrades.length+" trades "+label); setTimeout(()=>setMsg(""),2500);
    setTrades([]); setEmocoes([]); setObservacao("");
  }

  const allMonths = [...new Set(Object.keys(entries).map(monthKey))].sort().reverse();
  if (!allMonths.includes(curMonth)) allMonths.unshift(curMonth);
  const monthDays = Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>b.localeCompare(a));

  const inp = {background:"#18241f",border:"1px solid #26352e",borderRadius:"8px",padding:"10px 13px",color:"#f0f0f0",fontSize:"14px",outline:"none",fontFamily:"var(--font-sans)"};

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      

      {/* Form */}
      <div style={{background:"var(--panel)",border:"1px solid "+(todayEntry?"#2ee6a022":"#18241f"),borderRadius:"16px",padding:"28px",marginBottom:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px"}}>
          <div>
            <p style={{margin:"0 0 8px",color:"#a3b2ab",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>Registrar</p>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <button onClick={()=>changeDate(-1)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid #26352e",borderRadius:"8px",width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#aaa",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"17px",fontWeight:"700",whiteSpace:"nowrap"}}>{selectedDate===today?"Hoje — ":""}{formatDateLong(selectedDate)}</p>
              <button onClick={()=>changeDate(+1)} disabled={selectedDate===today} style={{background:selectedDate===today?"transparent":"rgba(255,255,255,0.05)",border:"1px solid "+(selectedDate===today?"#18241f":"#26352e"),borderRadius:"8px",width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",cursor:selectedDate===today?"default":"pointer",color:selectedDate===today?"#333":"#aaa",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
            <button type="button" className="mtp-btn-sec" onClick={()=>importInputRef.current?.click()} title="Importar o relatório de operações (.csv) da plataforma"
              style={{minHeight:"32px",borderRadius:"20px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Importar operações
            </button>
            <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{display:"none"}}
              onChange={e=>{ abrirArquivoImportacao(e.target.files?.[0]); e.target.value=""; }}/>
            {contas.length > 1 && (
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{color:"var(--text-3)",fontSize:"12px"}}>Registrando em</span>
                <Select value={novoTrade.conta} onChange={v=>setNovoTrade(p=>({...p,conta:v}))} popWidth={240} align="right" title="Conta das próximas operações"
                  style={{minHeight:"32px",padding:"5px 12px",borderRadius:"20px",fontSize:"12.5px"}}
                  options={contas.map(c=>({value:c.id,label:c.nome,cor:TIPOS_CONTA[c.tipo]?.cor,hint:c.padrao?"padrão":""}))}/>
              </div>
            )}
            {todayEntry && <span style={{background:"rgba(46,230,160,0.1)",color:"#2ee6a0",padding:"5px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"600"}}>✓ {selectedDate===today?"Registrado hoje":"Já registrado"}</span>}
          </div>
        </div>
        {avisoImport && <p style={{margin:"-14px 0 22px",color:avisoImport.startsWith("✓")?"#2ee6a0":"#ff7a90",fontSize:"13px",fontWeight:"600"}}>{avisoImport}</p>}

        {/* Emocoes */}
        <div style={{marginBottom:"32px"}}>
          <label style={{color:"var(--text-3)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.4px",display:"block",marginBottom:"14px",fontWeight:"700"}}>Emoções do dia</label>
          <div className="mtp-linha-unica">
            {EMOCOES.map(em => {
              const sel = emocoes.includes(em);
              const cor = EMOCAO_COLORS[em]||"#888";
              return <button key={em} onClick={()=>toggleEmocao(em)} style={{flex:"1 0 auto",padding:"8px 10px",whiteSpace:"nowrap",borderRadius:"20px",border:"1px solid "+(sel?cor+"66":"#26352e"),background:sel?cor+"1a":"transparent",color:sel?cor:"#aaa",fontSize:"12.5px",fontWeight:"600",cursor:"pointer",transition:"all 0.15s",fontFamily:"var(--font-sans)"}}>{em}</button>;
            })}
          </div>
        </div>

        {/* Nova operação */}
        <div className="mtp-composer" onKeyDown={e=>{ if(e.key==="Enter" && e.target.tagName==="INPUT"){ e.preventDefault(); addTrade(); } }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap",marginBottom:"24px"}}>
            <p className="mtp-section-title" style={{fontSize:"15px"}}>Nova operação</p>
            <TimePicker value={novoTrade.horario} onChange={v=>setNovoTrade(p=>({...p,horario:v}))} style={{minHeight:"34px",padding:"6px 12px",borderRadius:"20px",fontSize:"13px"}}/>
          </div>

          {/* WIN/LOSS */}
          <div className="mtp-bloco">
            <span className="mtp-rotulo-linha">Tipo</span>
            <div className="mtp-seg">
              {[["WIN","#2ee6a0"],["LOSS","#ff5470"]].map(([t,c])=>(
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
              const n = parseFloat(v);
              const cor = c.k==="contratos" || v==="" || isNaN(n) ? "var(--text)" : (n<0 || novoTrade.tipo==="LOSS") ? "#ff5470" : "#2ee6a0";
              return (
                <label key={c.k} className="mtp-campo">
                  <span>{c.l}</span>
                  <input type="number" inputMode="decimal" placeholder={c.ph} value={v} min={c.k==="contratos"?"1":undefined}
                    onChange={e=>digitarNumero(c.k, e.target.value)}
                    style={{color:cor,fontSize:c.grande?"22px":"18px"}}/>
                </label>
              );
            })}
          </div>

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
              style={{background:(!novoTrade.resultado && !novoTrade.pontos)?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:(!novoTrade.resultado && !novoTrade.pontos)?"var(--text-3)":"#000",border:"none",borderRadius:"10px",padding:"0 20px",minHeight:"42px",fontWeight:"800",fontSize:"13px",cursor:(!novoTrade.resultado && !novoTrade.pontos)?"not-allowed":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"8px"}}>
              Adicionar <span style={{opacity:.6,fontSize:"11px",fontFamily:"var(--font-mono)"}}>↵</span>
            </button>
          </div>

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
          const tot = trades.reduce((s,t)=>s+(t.resultado||0),0);
          const w = trades.filter(t=>t.tipo==="WIN").length;
          return (
            <div style={{marginBottom:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",gap:"12px",flexWrap:"wrap"}}>
                <span className="mtp-section-hint" style={{color:"#f5b941"}}>● {trades.length} {trades.length===1?"operação":"operações"} ainda não {trades.length===1?"salva":"salvas"} — clique em Salvar dia</span>
                <span style={{fontFamily:"var(--font-mono)",fontSize:"12.5px",color:"var(--text-3)"}}>
                  <b style={{color:tot>=0?"#2ee6a0":"#ff5470"}}>{tot>=0?"+":"-"}{Math.abs(tot).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</b> · {Math.round(w/trades.length*100)}% acerto
                </span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {trades.map(t => {
                  const cor = t.tipo==="WIN" ? "#2ee6a0" : "#ff5470";
                  return (
                    <div key={t.id} className="mtp-op-card" style={{"--op":cor}}>
                      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
                        <span style={{padding:"3px 9px",borderRadius:"6px",fontSize:"11.5px",fontWeight:"800",background:cor+"1f",color:cor,letterSpacing:"0.5px"}}>{t.tipo}</span>
                        <span style={{color:t.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"16px",fontWeight:"700",fontFamily:"var(--font-mono)",minWidth:"110px"}}>
                          {t.resultado !== null ? (t.resultado>=0?"+":"-")+(t.mercado==="B3"?"R$ ":"$ ")+Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "—"}
                        </span>
                        {t.pontos !== null && <span style={{color:"var(--text-2)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{Number((+t.pontos).toFixed(1))} pts</span>}
                        <span className="mtp-tag">{t.mercado}{t.ativo && <b style={{marginLeft:"6px",fontFamily:"var(--font-mono)",color:"var(--text)"}}>{t.ativo}</b>}</span>
                        {t.estrategia && <span className="mtp-tag">{t.estrategia}</span>}
                        {t.contratos && <span className="mtp-tag" style={{fontFamily:"var(--font-mono)"}}>{t.contratos}×</span>}
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

        {/* Observacao */}
        <div style={{marginBottom:"24px"}}>
          <label style={{color:"var(--text-3)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1.4px",fontWeight:"700",display:"block",marginBottom:"12px"}}>Observação geral do dia</label>
          <textarea style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"80px",boxSizing:"border-box",fontSize:"14px"}} placeholder="Como foi o dia? Setup, erros, aprendizados..." value={observacao} onChange={e=>setObservacao(e.target.value)} rows={3}/>
        </div>

        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button onClick={handleSave} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px 24px",fontWeight:"700",fontSize:"14px",cursor:"pointer"}}>Salvar dia</button>
          {msg && <span style={{color:msg.includes("✓")?"#2ee6a0":"#ff7a90",fontSize:"14px",fontWeight:"600"}}>{msg}</span>}
        </div>
      </div>

      {/* Filtro mes */}
      <div style={{display:"flex",gap:"8px",marginBottom:"18px",flexWrap:"wrap"}}>
        {allMonths.map(m => (
          <button key={m} onClick={()=>setSelMonth(m)} style={{padding:"6px 16px",borderRadius:"20px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"13px",background:selMonth===m?"#2ee6a0":"rgba(255,255,255,0.05)",color:selMonth===m?"#000":"#888",fontFamily:"var(--font-sans)"}}>{formatMonthLabel(m)}</button>
        ))}
      </div>

      {/* Lista dias */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {monthDays.map(([ds, entry]) => {
          const isToday = ds === today;
          const isOpen  = expanded === ds;
          const total   = (entry.totalB3||0)+(entry.totalForex||0)+(entry.totalCripto||0);
          return (
            <div key={ds} style={{borderRadius:"14px",overflow:"hidden",border:"1px solid "+(isToday?"#2ee6a022":"#18241f"),background:"var(--card)"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 18px",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:ds)}>
                <div style={{minWidth:"100px"}}>
                  <p style={{margin:0,color:isToday?"#2ee6a0":"#ccc",fontSize:"13px",fontWeight:"600"}}>{isToday?"Hoje":formatDateFull(ds)}</p>
                </div>
                <div style={{display:"flex",gap:"14px",flex:1,flexWrap:"wrap",alignItems:"center"}}>
                  {entry.numTrades !== undefined && <span style={{color:"#a3b2ab",fontSize:"13px"}}>{entry.numTrades} trade{entry.numTrades!==1?"s":""}</span>}
                  {entry.winRate   !== undefined && <span style={{color:"#2ee6a0",fontSize:"13px",fontWeight:"600"}}>{entry.winRate}% acerto</span>}
                  {entry.emocoes?.length > 0 && <span style={{color:EMOCAO_COLORS[entry.emocoes[0]]||"#888",fontSize:"13px"}}>{entry.emocoes[0]}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                  {entry.totalPts !== undefined && <span style={{color:entry.totalPts>=0?"#2ee6a0":"#ff5470",fontSize:"14px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{entry.totalPts>=0?"+":""}{Number((+entry.totalPts).toFixed(1))} pts</span>}
                  <span style={{color:total>=0?"#2ee6a0":"#ff5470",fontSize:"14px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{total>=0?"+":"-"}R$ {Math.abs(total).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                  <button title="Apagar o dia inteiro" onClick={e=>{e.stopPropagation();setConfirmacao({titulo:"Apagar o dia "+formatDateFull(ds)+"?",texto:"Isso apaga "+((entries[ds]?.trades||[]).length)+" operação(ões), as emoções e a observação desse dia. Não dá para desfazer.",botao:"Apagar dia",acao:()=>deleteEntry(ds)});}} style={{background:"none",border:"none",color:"#6f8179",cursor:"pointer",fontSize:"14px",padding:"2px 6px"}}>✕</button>
                </div>
              </div>
              {isOpen && (
                <div style={{borderTop:"1px solid #18241f",padding:"16px 18px"}}>
                  {entry.emocoes?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"#86978f",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                        {entry.emocoes.map(em=><span key={em} style={{padding:"4px 12px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"1a",color:EMOCAO_COLORS[em]||"#888",fontSize:"13px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"44"}}>{em}</span>)}
                      </div>
                    </div>
                  )}
                  {entry.trades?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"#86978f",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações</p>
                      {entry.trades.map((t,i)=>{
                        const isEditing = editingTrade?.dateKey===ds && editingTrade?.index===i;
                        if (isEditing) {
                          const ed = editingTrade.data;
                          const inpE = {background:"#0b1210",border:"1px solid #26352e",borderRadius:"6px",padding:"6px 10px",color:"#f0f0f0",fontSize:"13px",outline:"none",fontFamily:"var(--font-sans)"};
                          return (
                            <div key={i} style={{padding:"12px 14px",borderRadius:"10px",background:"rgba(46,230,160,0.04)",border:"1px solid #2ee6a033",marginBottom:"6px"}}>
                              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",marginBottom:"8px"}}>
                                <Select value={ed.tipo} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,tipo:v}}))} style={{...inpE,width:"100px"}} options={[{value:"WIN",label:"WIN",cor:"#2ee6a0"},{value:"LOSS",label:"LOSS",cor:"#ff5470"}]}/>
                                <Select value={ed.mercado} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,mercado:v}}))} style={{...inpE,width:"118px"}} popWidth={150} options={[{value:"B3",label:"B3",cor:"#2ee6a0"},{value:"Forex",label:"Forex",cor:"#f5b941"},{value:"Cripto",label:"Cripto",cor:"#a78bfa"},{value:"Americano",label:"Americano",cor:"#60a5fa"}]}/>
                                <input type="number" placeholder="Pontos" value={ed.pontos} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,pontos:e.target.value}}))} style={{...inpE,width:"90px"}}/>
                                <Select value={ed.ativo||""} onChange={v=>setEditingTrade(p=>({...p,data:{...p.data,ativo:v}}))} style={{...inpE,width:"118px"}} popWidth={190} placeholder="Ativo"
                                  options={[{value:"",label:"Sem ativo"}, ...[...new Set([...(ed.ativo?[ed.ativo]:[]), ...opcoesDeAtivo(entries, ed.mercado)])].map(a=>({value:a,label:a,hint:rotuloAtivo(ed.mercado,a)}))]}/>
                                <input type="number" placeholder={ed.mercado==="B3"?"R$":"$"} value={ed.resultado} onChange={e=>setEditingTrade(p=>({...p,data:{...p.data,resultado:e.target.value}}))} style={{...inpE,width:"90px"}}/>
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
                                <button onClick={()=>setEditingTrade(null)} style={{background:"transparent",color:"#86978f",border:"1px solid #26352e",borderRadius:"6px",padding:"7px 14px",fontSize:"12px",cursor:"pointer"}}>Cancelar</button>
                              </div>
                            </div>
                          );
                        }
                        const temImagens = (t.imagens||[]).length > 0;
                        return (
                          <div key={i} style={{borderRadius:"8px",background:"rgba(255,255,255,0.02)",marginBottom:"5px",overflow:"hidden"}}>
                            {/* Info row */}
                            <div style={{display:"flex",gap:"10px",alignItems:"center",padding:"9px 12px",flexWrap:"wrap"}}>
                              <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"12px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470"}}>{t.tipo}</span>
                              <span style={{color:"#aaa",fontSize:"13px"}}>{t.mercado}{t.ativo && <b style={{marginLeft:"6px",fontFamily:"var(--font-mono)",color:"var(--text)"}}>{t.ativo}</b>}</span>
                              {t.pontos!==null&&t.pontos!==undefined&&<span style={{color:"#ccc",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{Number((+t.pontos).toFixed(1))} pts</span>}
                              {t.resultado!==null&&t.resultado!==undefined&&<span style={{color:t.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":"-"}{t.mercado==="B3"?"R$":"$"} {Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>}
                              {t.contratos&&<span style={{color:"#a3b2ab",fontSize:"11px",background:"rgba(255,255,255,0.05)",padding:"2px 7px",borderRadius:"4px",fontFamily:"var(--font-mono)"}}>{t.contratos}×</span>}
                              {t.qualidade&&<EstrelasMini q={t.qualidade}/>}
                              {t.estrategia&&<span style={{color:"#86978f",fontSize:"12px",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                              {t.observacao&&<span style={{color:"#93a39c",fontSize:"12px",fontStyle:"italic"}}>"{t.observacao}"</span>}
                              <div style={{marginLeft:"auto",display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
                                {temImagens&&<span style={{color:"#7a8c84",fontSize:"11px",background:"rgba(255,255,255,0.04)",padding:"2px 7px",borderRadius:"4px",display:"flex",alignItems:"center",gap:"3px"}}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                  {t.imagens.length}
                                </span>}
                                <label style={{cursor:"pointer",display:"flex",alignItems:"center",gap:"4px",padding:"4px 9px",borderRadius:"6px",border:"1px solid #26352e",color:"#7a8c84",fontSize:"11px",fontWeight:"600",background:"transparent",transition:"all 0.15s"}}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2ee6a044";e.currentTarget.style.color="#2ee6a0";}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#26352e";e.currentTarget.style.color="#555";}}>
                                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])handleSavedImageUpload(e.target.files[0],ds,i);}}/>
                                  {uploadingIdx===i
                                    ?<span style={{fontSize:"10px"}}>⏳</span>
                                    :<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
                                  Foto
                                </label>
                                <button onClick={e=>{e.stopPropagation();startEditTrade(ds,i,t);}} style={{background:"none",border:"1px solid #26352e",borderRadius:"5px",color:"#7a8c84",cursor:"pointer",fontSize:"11px",fontWeight:"600",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px",transition:"all 0.15s"}}
                                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#2ee6a044";e.currentTarget.style.color="#2ee6a0";}}
                                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#26352e";e.currentTarget.style.color="#555";}}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  Editar
                                </button>
                                <button title="Apagar esta operação" onClick={e=>{e.stopPropagation();setConfirmacao({titulo:"Apagar esta operação?",texto:(t.tipo||"")+" "+(t.mercado||"")+(t.ativo?" "+t.ativo:"")+(t.resultado!=null?" · "+(t.resultado>=0?"+":"-")+"R$ "+Math.abs(t.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2}):"")+" — os totais do dia são recalculados. Não dá para desfazer.",botao:"Apagar",acao:()=>apagarOperacaoSalva(ds,i)});}}
                                  style={{background:"none",border:"1px solid #ff547033",borderRadius:"5px",color:"#ff7a90",cursor:"pointer",fontSize:"11px",fontWeight:"600",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px"}}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                  Apagar
                                </button>
                              </div>
                            </div>
                            {/* Image gallery strip */}
                            {temImagens&&(
                              <div style={{padding:"6px 12px 10px",display:"flex",gap:"8px",flexWrap:"wrap",borderTop:"1px solid #18241f"}}>
                                {t.imagens.map((url,ii)=>(
                                  <div key={ii} style={{width:"100px",borderRadius:"8px",overflow:"hidden",border:"1px solid #26352e",boxShadow:"0 2px 8px rgba(0,0,0,0.35)"}}>
                                    <ImagemSegura url={url} style={{width:"100%",height:"70px",objectFit:"cover",display:"block",cursor:"pointer"}} onClick={()=>setViewerImg(url)}/>
                                    <div style={{display:"flex",background:"#0b1210",borderTop:"1px solid #18241f"}}>
                                      <button onClick={()=>setEditorImg({src:url,saved:true,dateKey:ds,tradeIdx:i,url})}
                                        style={{flex:1,background:"transparent",border:"none",borderRight:"1px solid #18241f",color:"#a3b2ab",cursor:"pointer",padding:"5px 0",fontSize:"10px",fontWeight:"600",fontFamily:"var(--font-sans)",transition:"color 0.15s"}}
                                        onMouseEnter={e=>e.currentTarget.style.color="#2ee6a0"}
                                        onMouseLeave={e=>e.currentTarget.style.color="#888"}>
                                        Editar
                                      </button>
                                      <button onClick={()=>handleDeleteImage(ds,i,url)}
                                        style={{flex:1,background:"transparent",border:"none",color:"#ff547088",cursor:"pointer",padding:"5px 0",fontSize:"10px",fontWeight:"600",fontFamily:"var(--font-sans)",transition:"color 0.15s"}}
                                        onMouseEnter={e=>e.currentTarget.style.color="#ff5470"}
                                        onMouseLeave={e=>e.currentTarget.style.color="#ff547088"}>
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
                      <p style={{margin:"0 0 6px",color:"#86978f",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observações</p>
                      <p style={{margin:0,color:"#aaa",fontSize:"14px",lineHeight:"1.6",fontStyle:"italic"}}>{entry.observacao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {monthDays.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px",color:"#6f8179",fontSize:"14px"}}>Nenhum registro em {formatMonthLabel(selMonth)}.</div>
        )}
      </div>

      {/* Image Editor Modal */}
      {editorImg && (
        <ImageEditor
          src={editorImg.src}
          onClose={()=>setEditorImg(null)}
          onSave={async(file)=>{
            if (editorImg.isNew) {
              // Add annotated image + any other files to pending
              const preview = URL.createObjectURL(file);
              const others = editorImg.otherFiles || [];
              setPendingImages(prev=>[...prev, {file, preview}, ...others]);
            } else if(editorImg.saved) {
              await handleSavedImageUpload(file, editorImg.dateKey, editorImg.tradeIdx);
            } else {
              await handleImageFile(file, editorImg.tradeId);
            }
          }}
        />
      )}

      {/* Image Viewer fullscreen */}
      {viewerImg && <ImageViewer url={viewerImg} onClose={()=>setViewerImg(null)}/>}
      {importacao && (
        <ImportarOperacoes importacao={importacao} entries={entries} contas={contas} contaInicial={novoTrade.conta}
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

// ── Prévia da importação: cada linha do arquivo vira uma operação; o trader só marca estratégia e execução
function ImportarOperacoes({ importacao, entries, contas, contaInicial, estNomes, sugerirExecucao, onCancelar, onSalvar }) {
  const chaveConta = "mtp-import-conta-" + importacao.conta;
  const [conta, setConta] = useState(() => {
    let lembrada = null;
    try { lembrada = importacao.conta ? localStorage.getItem(chaveConta) : null; } catch { /* sem storage */ }
    return contas.some(c => c.id === lembrada) ? lembrada : contaInicial;
  });
  const [ops, setOps] = useState(() => importacao.operacoes.map((op, i) => {
    const dup = jaRegistrada(op, entries[op.data]?.trades);
    return { ...op, id:i, dup, incluir:!dup, estrategia:"", qualidade:"" };
  }));
  const [salvando, setSalvando] = useState(false);

  const comEstrategia = (o, n) => ({ ...o, estrategia:n, qualidade: o.qualidade || (n ? sugerirExecucao(n) : "") || "" });
  const mudar = (id, f) => setOps(p => p.map(o => o.id === id ? f(o) : o));
  const selecionadas = ops.filter(o => o.incluir);
  const duplicadas = ops.filter(o => o.dup).length;
  const dias = [...new Set(ops.map(o => o.data))].sort();
  const brl = v => (v >= 0 ? "+" : "-") + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
  const optsEst = [{ value:"", label:"Sem estratégia" }, ...estNomes.map(n => ({ value:n, label:n }))];

  async function salvar() {
    setSalvando(true);
    try { if (importacao.conta) localStorage.setItem(chaveConta, conta); } catch { /* sem storage */ }
    try { await onSalvar(selecionadas, conta); } finally { setSalvando(false); }
  }

  return (
    <Modal onClose={salvando ? () => {} : onCancelar} width={880}>
      <div style={{ padding:"24px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"14px", flexWrap:"wrap" }}>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, color:"var(--text)", fontSize:"17px", fontWeight:"800" }}>Importar operações</p>
            <p style={{ margin:"6px 0 0", color:"var(--text-3)", fontSize:"12.5px", lineHeight:1.6, wordBreak:"break-word" }}>
              {importacao.nome}{importacao.conta && <> · conta {importacao.conta}</>} · {ops.length} {ops.length === 1 ? "operação" : "operações"}
              {duplicadas > 0 && <> · <span style={{ color:"#f5b941" }}>{duplicadas} já {duplicadas === 1 ? "registrada" : "registradas"}</span></>}
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

        {estNomes.length > 0 && selecionadas.length > 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
            <span style={{ color:"var(--text-3)", fontSize:"12px" }}>Mesma estratégia para todas:</span>
            <Select value="" onChange={n => setOps(p => p.map(o => o.incluir ? comEstrategia(o, n) : o))} placeholder="Escolher..." popWidth={220}
              style={{ minHeight:"32px", padding:"5px 12px", borderRadius:"20px", fontSize:"12.5px", minWidth:"160px" }} options={optsEst}/>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
          {dias.map(dia => {
            const doDia = ops.filter(o => o.data === dia);
            const tot = doDia.filter(o => o.incluir).reduce((s, o) => s + o.resultado, 0);
            return (
              <div key={dia}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:"10px", marginBottom:"8px" }}>
                  <span style={{ color:"var(--text-2)", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>{formatDateLong(dia)}</span>
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:"12.5px", color:tot >= 0 ? "#2ee6a0" : "#ff5470", fontWeight:"700" }}>{brl(tot)}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {doDia.map(o => {
                    const cor = o.tipo === "WIN" ? "#2ee6a0" : "#ff5470";
                    return (
                      <div key={o.id} className="mtp-op-card" style={{ "--op":cor, opacity:o.incluir ? 1 : 0.45, display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                        <input type="checkbox" checked={o.incluir} onChange={e => mudar(o.id, x => ({ ...x, incluir:e.target.checked }))}
                          aria-label="Importar esta operação" style={{ width:"16px", height:"16px", accentColor:"#2ee6a0", cursor:"pointer" }}/>
                        <span style={{ color:"var(--text-3)", fontSize:"12.5px", fontFamily:"var(--font-mono)" }}>{o.horario}</span>
                        <span style={{ padding:"3px 9px", borderRadius:"6px", fontSize:"11.5px", fontWeight:"800", background:cor+"1f", color:cor }}>{o.tipo}</span>
                        <span style={{ color:cor, fontSize:"14.5px", fontWeight:"700", fontFamily:"var(--font-mono)", minWidth:"96px" }}>{brl(o.resultado)}</span>
                        {o.pontos !== null && <span style={{ color:"var(--text-2)", fontSize:"12.5px", fontFamily:"var(--font-mono)" }}>{o.pontos >= 0 ? "+" : ""}{o.pontos} pts</span>}
                        <span className="mtp-tag"><b style={{ fontFamily:"var(--font-mono)", color:"var(--text)" }}>{o.ativo}</b></span>
                        {o.lado && <span className="mtp-tag">{o.lado}</span>}
                        {o.contratos && <span className="mtp-tag" style={{ fontFamily:"var(--font-mono)" }}>{o.contratos}×</span>}
                        {o.dup && <span className="mtp-tag" style={{ color:"#f5b941" }}>já registrada</span>}
                        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginLeft:"auto", flexWrap:"wrap" }}>
                          {estNomes.length > 0 && (
                            <Select value={o.estrategia} onChange={n => mudar(o.id, x => comEstrategia(x, n))} placeholder="Estratégia" popWidth={220} align="right"
                              style={{ minHeight:"32px", padding:"5px 12px", borderRadius:"10px", fontSize:"12.5px", width:"150px" }} options={optsEst}/>
                          )}
                          <EstrelasInput value={estrelasDe(o.qualidade)} onChange={n => mudar(o.id, x => ({ ...x, qualidade:n || "" }))}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ margin:0, color:"var(--text-3)", fontSize:"12px", lineHeight:1.6 }}>
          Resultado bruto, como vem da plataforma (sem corretagem e emolumentos). Cada operação entra no Diário no próprio dia e pode ser editada depois.
        </p>

        <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button onClick={onCancelar} disabled={salvando} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"10px 16px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !selecionadas.length}
            style={{ background:selecionadas.length ? "linear-gradient(135deg,#2ee6a0,#1fc98a)" : "rgba(255,255,255,0.05)", color:selecionadas.length ? "#000" : "var(--text-3)", border:"none", borderRadius:"10px", padding:"10px 18px", fontSize:"13px", fontWeight:"800", cursor:salvando ? "wait" : selecionadas.length ? "pointer" : "not-allowed", fontFamily:"var(--font-sans)" }}>
            {salvando ? "Importando..." : "Importar " + selecionadas.length + (selecionadas.length === 1 ? " operação" : " operações")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
