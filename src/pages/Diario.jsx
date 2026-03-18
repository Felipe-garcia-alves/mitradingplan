import { useState } from "react";

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

const EMOCOES = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche"];
const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};

export default function Diario({ entries, saveEntry, deleteEntry, estrategias }) {
  const today    = todayKey();
  const curMonth = monthKey(today);
  const [selMonth,   setSelMonth]   = useState(curMonth);
  const [expanded,   setExpanded]   = useState(null);
  const [msg,        setMsg]        = useState("");
  const [emocoes,    setEmocoes]    = useState([]);
  const [observacao, setObservacao] = useState("");
  const [trades,     setTrades]     = useState([]);
  const [novoTrade,  setNovoTrade]  = useState({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:""});
  const [showEstSug, setShowEstSug] = useState(false);

  const todayEntry = entries[today];
  const estNomes = [...new Set((estrategias||[]).map(e=>e.nome).filter(Boolean))];

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
      observacao: novoTrade.observacao,
    };
    setTrades(prev => [...prev, t]);
    setNovoTrade({mercado:"B3",resultado:"",pontos:"",estrategia:"",tipo:"WIN",observacao:""});
    setShowEstSug(false);
  }

  function removeTrade(id) { setTrades(prev => prev.filter(t => t.id !== id)); }

  async function handleSave() {
    if (trades.length === 0 && !observacao.trim()) {
      setMsg("Adicione ao menos um trade ou observação."); return;
    }
    // Merge with existing trades for today
    const existingTrades = todayEntry?.trades || [];
    const allTrades = [
      ...existingTrades,
      ...trades.map(t => {
        const tr = {mercado:t.mercado, tipo:t.tipo, estrategia:t.estrategia||"", observacao:t.observacao||""};
        if (t.resultado !== null) tr.resultado = t.resultado;
        if (t.pontos    !== null) tr.pontos    = t.pontos;
        return tr;
      })
    ];
    const mergedEmocoes = [...new Set([...(todayEntry?.emocoes||[]), ...emocoes])];
    const mergedObs = observacao.trim() || todayEntry?.observacao || "";

    const totalB3    = allTrades.filter(t=>t.mercado==="B3").reduce((s,t)=>s+(t.resultado||0),0);
    const totalForex = allTrades.filter(t=>t.mercado==="Forex").reduce((s,t)=>s+(t.resultado||0),0);
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
    if (totalB3    !== 0) data.totalB3    = totalB3;
    if (totalForex !== 0) data.totalForex = totalForex;
    if (winRate    !== null) data.winRate = winRate;

    await saveEntry(today, data);
    setMsg("✓ Salvo! "+allTrades.length+" trades hoje"); setTimeout(()=>setMsg(""),2500);
    setTrades([]); setEmocoes([]); setObservacao("");
  }

  const allMonths = [...new Set(Object.keys(entries).map(monthKey))].sort().reverse();
  if (!allMonths.includes(curMonth)) allMonths.unshift(curMonth);
  const monthDays = Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>b.localeCompare(a));

  const inp = {background:"#1a1a2e",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"10px 13px",color:"#f0f0f0",fontSize:"14px",outline:"none",fontFamily:"Inter,sans-serif"};

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      

      {/* Form */}
      <div style={{background:"#0d0d14",border:"1px solid "+(todayEntry?"#00d4aa22":"#1a1a2e"),borderRadius:"16px",padding:"28px",marginBottom:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"28px"}}>
          <div>
            <p style={{margin:"0 0 4px",color:"#888",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>Registrar hoje</p>
            <p style={{margin:0,color:"#f0f0f0",fontSize:"18px",fontWeight:"700"}}>{formatDateLong(today)}</p>
          </div>
          {todayEntry && <span style={{background:"rgba(0,212,170,0.1)",color:"#00d4aa",padding:"5px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"600"}}>✓ Registrado hoje</span>}
        </div>

        {/* Emocoes */}
        <div style={{marginBottom:"28px"}}>
          <label style={{color:"#888",fontSize:"13px",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:"14px",fontWeight:"700"}}>Emoções do dia</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px"}}>
            {EMOCOES.map(em => {
              const sel = emocoes.includes(em);
              const cor = EMOCAO_COLORS[em]||"#888";
              return <button key={em} onClick={()=>toggleEmocao(em)} style={{padding:"7px 14px",borderRadius:"20px",border:"1px solid "+(sel?cor+"66":"#2a2a3a"),background:sel?cor+"1a":"transparent",color:sel?cor:"#aaa",fontSize:"13px",fontWeight:"600",cursor:"pointer",transition:"all 0.15s",fontFamily:"Inter,sans-serif"}}>{em}</button>;
            })}
          </div>
        </div>

        {/* Adicionar trade */}
        <div style={{marginBottom:"24px"}}>
          <label style={{color:"#888",fontSize:"13px",textTransform:"uppercase",letterSpacing:"1.5px",display:"block",marginBottom:"14px",fontWeight:"700"}}>Adicionar operação</label>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
            <select value={novoTrade.tipo} onChange={e=>setNovoTrade(p=>({...p,tipo:e.target.value}))} style={{...inp,width:"85px"}}>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
            </select>
            <select value={novoTrade.mercado} onChange={e=>setNovoTrade(p=>({...p,mercado:e.target.value}))} style={{...inp,width:"95px"}}>
              <option value="B3">B3</option>
              <option value="Forex">Forex</option>
            </select>
            <input style={{...inp,width:"95px"}} type="number" placeholder="Pontos" value={novoTrade.pontos} onChange={e=>setNovoTrade(p=>({...p,pontos:e.target.value}))}/>
            <input style={{...inp,width:"95px"}} type="number" placeholder={novoTrade.mercado==="B3"?"R$":"$"} value={novoTrade.resultado} onChange={e=>setNovoTrade(p=>({...p,resultado:e.target.value}))}/>
            {/* Estrategia com autocomplete */}
            <div style={{position:"relative",flex:1,minWidth:"120px"}}>
              <input style={{...inp,width:"100%",boxSizing:"border-box"}} type="text" placeholder="Estratégia" value={novoTrade.estrategia}
                onChange={e=>{setNovoTrade(p=>({...p,estrategia:e.target.value}));setShowEstSug(true);}}
                onFocus={()=>setShowEstSug(true)}
                onBlur={()=>setTimeout(()=>setShowEstSug(false),150)}
              />
              {showEstSug && estNomes.filter(n=>n.toLowerCase().includes(novoTrade.estrategia.toLowerCase())).length>0 && (
                <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#1a1a2e",border:"1px solid #2a2a3a",borderRadius:"8px",zIndex:50,overflow:"hidden"}}>
                  {estNomes.filter(n=>n.toLowerCase().includes(novoTrade.estrategia.toLowerCase())).map(n=>(
                    <div key={n} onMouseDown={()=>{setNovoTrade(p=>({...p,estrategia:n}));setShowEstSug(false);}} style={{padding:"9px 12px",cursor:"pointer",color:"#ccc",fontSize:"13px"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#2a2a3a"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={addTrade} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"8px",padding:"10px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
          </div>
          <input style={{...inp,width:"100%",boxSizing:"border-box",marginTop:"8px"}} type="text" placeholder="Observação desta operação (opcional)" value={novoTrade.observacao} onChange={e=>setNovoTrade(p=>({...p,observacao:e.target.value}))}/>
        </div>

        {/* Lista trades */}
        {trades.length > 0 && (
          <div style={{marginBottom:"18px",display:"flex",flexDirection:"column",gap:"6px"}}>
            {trades.map(t => (
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
                <span style={{padding:"3px 9px",borderRadius:"5px",fontSize:"12px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                <span style={{color:"#aaa",fontSize:"13px"}}>{t.mercado}</span>
                {t.pontos    !== null && <span style={{color:"#f0f0f0",fontSize:"14px",fontWeight:"600",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                {t.resultado !== null && <span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"14px",fontWeight:"600",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$ ":"$ "}{t.resultado?.toFixed(2)}</span>}
                {t.estrategia && <span style={{color:"#888",fontSize:"13px",background:"rgba(255,255,255,0.05)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                {t.observacao && <span style={{color:"#666",fontSize:"12px",fontStyle:"italic"}}>"{t.observacao}"</span>}
                <button onClick={()=>removeTrade(t.id)} style={{marginLeft:"auto",background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"15px",padding:"2px 6px"}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Observacao */}
        <div style={{marginBottom:"20px"}}>
          <label style={{color:"#888",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"10px"}}>Observação geral do dia</label>
          <textarea style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"80px",boxSizing:"border-box",fontSize:"14px"}} placeholder="Como foi o dia? Setup, erros, aprendizados..." value={observacao} onChange={e=>setObservacao(e.target.value)} rows={3}/>
        </div>

        <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
          <button onClick={handleSave} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"12px 24px",fontWeight:"700",fontSize:"14px",cursor:"pointer"}}>Salvar dia</button>
          {msg && <span style={{color:msg.includes("✓")?"#00d4aa":"#ff6b6b",fontSize:"14px",fontWeight:"600"}}>{msg}</span>}
        </div>
      </div>

      {/* Filtro mes */}
      <div style={{display:"flex",gap:"8px",marginBottom:"18px",flexWrap:"wrap"}}>
        {allMonths.map(m => (
          <button key={m} onClick={()=>setSelMonth(m)} style={{padding:"6px 16px",borderRadius:"20px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"13px",background:selMonth===m?"#00d4aa":"rgba(255,255,255,0.05)",color:selMonth===m?"#000":"#888",fontFamily:"Inter,sans-serif"}}>{formatMonthLabel(m)}</button>
        ))}
      </div>

      {/* Lista dias */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {monthDays.map(([ds, entry]) => {
          const isToday = ds === today;
          const isOpen  = expanded === ds;
          const total   = (entry.totalB3||0)+(entry.totalForex||0);
          return (
            <div key={ds} style={{borderRadius:"14px",overflow:"hidden",border:"1px solid "+(isToday?"#00d4aa22":"#1a1a2e"),background:"#0d0d14"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 18px",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:ds)}>
                <div style={{minWidth:"100px"}}>
                  <p style={{margin:0,color:isToday?"#00d4aa":"#ccc",fontSize:"13px",fontWeight:"600"}}>{isToday?"Hoje":formatDateFull(ds)}</p>
                </div>
                <div style={{display:"flex",gap:"14px",flex:1,flexWrap:"wrap",alignItems:"center"}}>
                  {entry.numTrades !== undefined && <span style={{color:"#888",fontSize:"13px"}}>{entry.numTrades} trade{entry.numTrades!==1?"s":""}</span>}
                  {entry.winRate   !== undefined && <span style={{color:"#00d4aa",fontSize:"13px",fontWeight:"600"}}>{entry.winRate}% acerto</span>}
                  {entry.emocoes?.length > 0 && <span style={{color:EMOCAO_COLORS[entry.emocoes[0]]||"#888",fontSize:"13px"}}>{entry.emocoes[0]}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
                  {entry.totalPts !== undefined && <span style={{color:entry.totalPts>=0?"#00d4aa":"#ff4d4d",fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{entry.totalPts>=0?"+":""}{entry.totalPts} pts</span>}
                  <span style={{color:total>=0?"#00d4aa":"#ff4d4d",fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{total>=0?"+":""}R$ {Math.abs(total).toFixed(2)}</span>
                  <button onClick={e=>{e.stopPropagation();deleteEntry(ds);}} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:"14px",padding:"2px 6px"}}>✕</button>
                </div>
              </div>
              {isOpen && (
                <div style={{borderTop:"1px solid #1a1a2e",padding:"16px 18px"}}>
                  {entry.emocoes?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                        {entry.emocoes.map(em=><span key={em} style={{padding:"4px 12px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"1a",color:EMOCAO_COLORS[em]||"#888",fontSize:"13px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"44"}}>{em}</span>)}
                      </div>
                    </div>
                  )}
                  {entry.trades?.length>0 && (
                    <div style={{marginBottom:"14px"}}>
                      <p style={{margin:"0 0 8px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações</p>
                      {entry.trades.map((t,i)=>(
                        <div key={i} style={{display:"flex",gap:"10px",alignItems:"center",padding:"9px 12px",borderRadius:"8px",background:"rgba(255,255,255,0.02)",marginBottom:"5px"}}>
                          <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"12px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                          <span style={{color:"#aaa",fontSize:"13px"}}>{t.mercado}</span>
                          {t.pontos!==null&&t.pontos!==undefined&&<span style={{color:"#ccc",fontSize:"13px",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                          {t.resultado!==null&&t.resultado!==undefined&&<span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                          {t.estrategia&&<span style={{color:"#666",fontSize:"12px",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                          {t.observacao&&<p style={{margin:"5px 0 0",color:"#777",fontSize:"12px",fontStyle:"italic",paddingLeft:"4px"}}>"{t.observacao}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.observacao&&(
                    <div>
                      <p style={{margin:"0 0 6px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observações</p>
                      <p style={{margin:0,color:"#aaa",fontSize:"14px",lineHeight:"1.6",fontStyle:"italic"}}>{entry.observacao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {monthDays.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px",color:"#444",fontSize:"14px"}}>Nenhum registro em {formatMonthLabel(selMonth)}.</div>
        )}
      </div>
    </div>
  );
}
