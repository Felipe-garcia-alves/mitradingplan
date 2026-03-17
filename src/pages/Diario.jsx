import { useState } from "react";

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function formatMonthLabel(s) { const p=s.split("-"); return MONTH_NAMES[parseInt(p[1])-1]+" "+p[0]; }

const EMOCOES = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche"];
const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};

export default function Diario({ entries, saveEntry, deleteEntry }) {
  const today    = todayKey();
  const curMonth = monthKey(today);
  const [selMonth,   setSelMonth]   = useState(curMonth);
  const [expanded,   setExpanded]   = useState(null);
  const [msg,        setMsg]        = useState("");
  const [emocoes,    setEmocoes]    = useState([]);
  const [observacao, setObservacao] = useState("");
  const [trades,     setTrades]     = useState([]);
  const [novoTrade,  setNovoTrade]  = useState({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN"});

  const todayEntry = entries[today];

  function toggleEmocao(em) {
    setEmocoes(prev => prev.includes(em) ? prev.filter(e=>e!==em) : [...prev, em]);
  }

  function addTrade() {
    if (!novoTrade.resultado && !novoTrade.pontos) return;
    const t = {
      id: Date.now(),
      mercado: novoTrade.mercado,
      resultado: novoTrade.resultado !== "" ? parseFloat(novoTrade.resultado) : null,
      pontos: novoTrade.pontos !== "" ? parseFloat(novoTrade.pontos) : null,
      estrategia: novoTrade.estrategia,
      tipo: novoTrade.tipo,
    };
    setTrades(prev => [...prev, t]);
    setNovoTrade({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN"});
  }

  function removeTrade(id) { setTrades(prev => prev.filter(t => t.id !== id)); }

  async function handleSave() {
    if (trades.length === 0 && !observacao.trim()) {
      setMsg("Adicione ao menos um trade ou observação."); return;
    }
    const totalB3    = trades.filter(t=>t.mercado==="B3").reduce((s,t)=>s+(t.resultado||0),0);
    const totalForex = trades.filter(t=>t.mercado==="Forex").reduce((s,t)=>s+(t.resultado||0),0);
    const totalPts   = trades.reduce((s,t)=>s+(t.pontos||0),0);
    const wins       = trades.filter(t=>t.tipo==="WIN").length;
    const winRate    = trades.length > 0 ? Math.round((wins/trades.length)*100) : null;

    const data = {
      trades: trades.map(t => {
        const tr = {mercado:t.mercado, tipo:t.tipo, estrategia:t.estrategia||""};
        if (t.resultado !== null) tr.resultado = t.resultado;
        if (t.pontos    !== null) tr.pontos    = t.pontos;
        return tr;
      }),
      emocoes,
      observacao: observacao || "",
      numTrades:  trades.length,
      totalPts,
      ts: new Date().toISOString()
    };
    if (totalB3    !== 0) data.totalB3    = totalB3;
    if (totalForex !== 0) data.totalForex = totalForex;
    if (winRate    !== null) data.winRate = winRate;

    await saveEntry(today, data);
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2500);
    setTrades([]); setEmocoes([]); setObservacao("");
  }

  const allMonths = [...new Set(Object.keys(entries).map(monthKey))].sort().reverse();
  if (!allMonths.includes(curMonth)) allMonths.unshift(curMonth);
  const monthDays = Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>b.localeCompare(a));
  const inp = {background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"9px 12px",color:"#f0f0f0",fontSize:"13px",outline:"none",fontFamily:"Inter,sans-serif"};

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{marginBottom:"24px"}}>
        <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>Diário</h1>
        <p style={{margin:0,color:"#888",fontSize:"13px"}}>Registre suas operações e emoções do dia</p>
      </div>

      <div style={{background:"#0d0d14",border:"1px solid "+(todayEntry?"#00d4aa22":"#1a1a2e"),borderRadius:"14px",padding:"22px",marginBottom:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div>
            <p style={{margin:"0 0 2px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Registrar hoje</p>
            <p style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"600"}}>{formatDateFull(today)}</p>
          </div>
          {todayEntry && <span style={{background:"rgba(0,212,170,0.1)",color:"#00d4aa",padding:"4px 12px",borderRadius:"20px",fontSize:"11px",fontWeight:"600"}}>✓ Registrado hoje</span>}
        </div>

        <div style={{marginBottom:"18px"}}>
          <label style={{color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"10px"}}>Emoções do dia</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {EMOCOES.map(em => {
              const sel = emocoes.includes(em);
              const cor = EMOCAO_COLORS[em]||"#888";
              return <button key={em} onClick={()=>toggleEmocao(em)} style={{padding:"5px 12px",borderRadius:"20px",border:"1px solid "+(sel?cor+"66":"#2a2a3a"),background:sel?cor+"1a":"transparent",color:sel?cor:"#999",fontSize:"12px",fontWeight:"600",cursor:"pointer",transition:"all 0.15s",fontFamily:"Inter,sans-serif"}}>{em}</button>;
            })}
          </div>
        </div>

        <div style={{marginBottom:"16px"}}>
          <label style={{color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"10px"}}>Adicionar operação</label>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
            <select value={novoTrade.tipo} onChange={e=>setNovoTrade(p=>({...p,tipo:e.target.value}))} style={{...inp,width:"80px"}}>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
            </select>
            <select value={novoTrade.mercado} onChange={e=>setNovoTrade(p=>({...p,mercado:e.target.value}))} style={{...inp,width:"90px"}}>
              <option value="B3">B3</option>
              <option value="Forex">Forex</option>
            </select>
            <input style={{...inp,width:"90px"}} type="number" placeholder="Pontos" value={novoTrade.pontos} onChange={e=>setNovoTrade(p=>({...p,pontos:e.target.value}))}/>
            <input style={{...inp,width:"90px"}} type="number" placeholder={novoTrade.mercado==="B3"?"R$":"$"} value={novoTrade.resultado} onChange={e=>setNovoTrade(p=>({...p,resultado:e.target.value}))}/>
            <input style={{...inp,flex:1,minWidth:"100px"}} type="text" placeholder="Estratégia" value={novoTrade.estrategia} onChange={e=>setNovoTrade(p=>({...p,estrategia:e.target.value}))}/>
            <button onClick={addTrade} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"8px",padding:"9px 16px",fontWeight:"700",fontSize:"13px",cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
          </div>
        </div>

        {trades.length > 0 && (
          <div style={{marginBottom:"16px",display:"flex",flexDirection:"column",gap:"5px"}}>
            {trades.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"8px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
                <span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                <span style={{color:"#777",fontSize:"12px"}}>{t.mercado}</span>
                {t.pontos    !== null && <span style={{color:"#f0f0f0",fontSize:"13px",fontWeight:"600",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                {t.resultado !== null && <span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"600",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$ ":"$ "}{t.resultado?.toFixed(2)}</span>}
                {t.estrategia && <span style={{color:"#888",fontSize:"12px"}}>{t.estrategia}</span>}
                <button onClick={()=>removeTrade(t.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:"14px",padding:"2px 6px"}}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{marginBottom:"16px"}}>
          <label style={{color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"8px"}}>Observações do dia</label>
          <textarea style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"70px",boxSizing:"border-box"}} placeholder="Como foi o dia? Setup, erros, aprendizados..." value={observacao} onChange={e=>setObservacao(e.target.value)} rows={3}/>
        </div>

        <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
          <button onClick={handleSave} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar dia</button>
          {msg && <span style={{color:msg.includes("✓")?"#00d4aa":"#ff6b6b",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
        </div>
      </div>

      <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>
        {allMonths.map(m => (
          <button key={m} onClick={()=>setSelMonth(m)} style={{padding:"5px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"12px",background:selMonth===m?"#00d4aa":"rgba(255,255,255,0.04)",color:selMonth===m?"#000":"#999",fontFamily:"Inter,sans-serif"}}>{formatMonthLabel(m)}</button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
        {monthDays.map(([ds, entry]) => {
          const isToday = ds === today;
          const isOpen  = expanded === ds;
          const total   = (entry.totalB3||0)+(entry.totalForex||0);
          return (
            <div key={ds} style={{borderRadius:"12px",overflow:"hidden",border:"1px solid "+(isToday?"#00d4aa22":"#1a1a2e"),background:"#0d0d14"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"13px 16px",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:ds)}>
                <div style={{minWidth:"80px"}}>
                  <p style={{margin:0,color:isToday?"#00d4aa":"#aaa",fontSize:"12px",fontWeight:"600"}}>{isToday?"Hoje":formatDateFull(ds)}</p>
                </div>
                <div style={{display:"flex",gap:"12px",flex:1,flexWrap:"wrap",alignItems:"center"}}>
                  {entry.numTrades !== undefined && <span style={{color:"#999",fontSize:"12px"}}>{entry.numTrades} trade{entry.numTrades!==1?"s":""}</span>}
                  {entry.winRate   !== undefined && <span style={{color:"#00d4aa",fontSize:"12px",fontWeight:"600"}}>{entry.winRate}% acerto</span>}
                  {entry.emocoes?.length > 0 && <span style={{color:EMOCAO_COLORS[entry.emocoes[0]]||"#999",fontSize:"12px"}}>{entry.emocoes[0]}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px",flexShrink:0}}>
                  {entry.totalPts !== undefined && <span style={{color:entry.totalPts>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{entry.totalPts>=0?"+":""}{entry.totalPts} pts</span>}
                  <span style={{color:total>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{total>=0?"+":""}R$ {Math.abs(total).toFixed(2)}</span>
                  <button onClick={e=>{e.stopPropagation();deleteEntry(ds);}} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:"13px",padding:"2px 6px"}}>✕</button>
                </div>
              </div>
              {isOpen && (
                <div style={{borderTop:"1px solid #1a1a2e",padding:"14px 16px"}}>
                  {entry.emocoes?.length > 0 && (
                    <div style={{marginBottom:"12px"}}>
                      <p style={{margin:"0 0 8px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                        {entry.emocoes.map(em => <span key={em} style={{padding:"3px 10px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"1a",color:EMOCAO_COLORS[em]||"#888",fontSize:"12px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"44"}}>{em}</span>)}
                      </div>
                    </div>
                  )}
                  {entry.trades?.length > 0 && (
                    <div style={{marginBottom:"12px"}}>
                      <p style={{margin:"0 0 8px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações</p>
                      {entry.trades.map((t,i) => (
                        <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"7px 10px",borderRadius:"6px",background:"rgba(255,255,255,0.02)",marginBottom:"4px"}}>
                          <span style={{padding:"2px 7px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                          <span style={{color:"#777",fontSize:"12px"}}>{t.mercado}</span>
                          {t.pontos    !== null && t.pontos    !== undefined && <span style={{color:"#bbb",fontSize:"12px",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                          {t.resultado !== null && t.resultado !== undefined && <span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"12px",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                          {t.estrategia && <span style={{color:"#888",fontSize:"12px"}}>{t.estrategia}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.observacao && (
                    <div>
                      <p style={{margin:"0 0 6px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Observações</p>
                      <p style={{margin:0,color:"#888",fontSize:"13px",lineHeight:"1.6",fontStyle:"italic"}}>{entry.observacao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {monthDays.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 20px",color:"#666",fontSize:"13px"}}>Nenhum registro em {formatMonthLabel(selMonth)}.</div>
        )}
      </div>
    </div>
  );
}
