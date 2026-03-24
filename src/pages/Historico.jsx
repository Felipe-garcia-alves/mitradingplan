import { useState } from "react";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
const EMOCOES_LIST = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche"];

function dayKey(y,m,d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
function formatDateLong(s) { const p=s.split("-"); const d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",weekday:"long"}); }

export default function Historico({ entries, saveEntry, deleteEntry, estrategias }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [msg, setMsg] = useState("");
  const [filtroMercado, setFiltroMercado] = useState("todos");
  const [filtroEst, setFiltroEst] = useState("todas");

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const firstDay  = new Date(year,month,1).getDay();
  const daysInMon = new Date(year,month+1,0).getDate();
  const selEntry  = sel ? entries[sel] : null;

  // Build weeks
  const weeks = [];
  let week = { days:[], wins:0, losses:0 };
  for (let i=0;i<firstDay;i++) week.days.push(null);
  for (let d=1;d<=daysInMon;d++) {
    const k = dayKey(year,month,d);
    const e = entries[k];
    if (e) {
      const tot=(e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0)+(e.totalAmericano||0);
      if(tot>0) week.wins++; else if(tot<0) week.losses++;
    }
    week.days.push({d,k,e});
    if(week.days.length===7){ weeks.push(week); week={days:[],wins:0,losses:0}; }
  }
  if(week.days.length>0){ while(week.days.length<7) week.days.push(null); weeks.push(week); }

  // Edit functions
  function startEdit() {
    if (!selEntry) return;
    setEditEntry(JSON.parse(JSON.stringify(selEntry)));
    setEditMode(true);
  }

  function removeTradeFromEdit(idx) {
    const updated = {...editEntry};
    updated.trades = updated.trades.filter((_,i)=>i!==idx);
    // recalculate totals
    const totalB3    = updated.trades.filter(t=>t.mercado==="B3").reduce((s,t)=>s+(t.resultado||0),0);
    const totalForex = updated.trades.filter(t=>t.mercado==="Forex").reduce((s,t)=>s+(t.resultado||0),0);
    const totalPts   = updated.trades.reduce((s,t)=>s+(t.pontos||0),0);
    const wins       = updated.trades.filter(t=>t.tipo==="WIN").length;
    updated.totalB3    = totalB3 || undefined;
    updated.totalForex = totalForex || undefined;
    updated.totalPts   = totalPts;
    updated.numTrades  = updated.trades.length;
    updated.winRate    = updated.trades.length>0 ? Math.round((wins/updated.trades.length)*100) : undefined;
    setEditEntry(updated);
  }

  function toggleTradeType(idx) {
    const updated = {...editEntry, trades: [...editEntry.trades]};
    updated.trades[idx] = {...updated.trades[idx], tipo: updated.trades[idx].tipo==="WIN"?"LOSS":"WIN"};
    const wins = updated.trades.filter(t=>t.tipo==="WIN").length;
    updated.winRate = updated.trades.length>0 ? Math.round((wins/updated.trades.length)*100) : undefined;
    setEditEntry(updated);
  }

  function toggleEmocaoEdit(em) {
    const updated = {...editEntry};
    const ems = updated.emocoes||[];
    updated.emocoes = ems.includes(em) ? ems.filter(e=>e!==em) : [...ems, em];
    setEditEntry(updated);
  }

  async function saveEdit() {
    const data = {...editEntry};
    // Clean undefined
    Object.keys(data).forEach(k=>{ if(data[k]===undefined) delete data[k]; });
    await saveEntry(sel, data);
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2000);
    setEditMode(false);
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este dia?")) return;
    await deleteEntry(sel);
    setSel(null); setEditMode(false);
  }

  const inp = {background:"#1a1a2e",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"8px 12px",color:"#f0f0f0",fontSize:"13px",outline:"none",fontFamily:"Inter,sans-serif"};

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{marginBottom:"28px"}}>
        <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Histórico</h1>
        <p style={{margin:"4px 0 0",color:"#666",fontSize:"13px"}}>Clique em um dia para ver detalhes ou editar</p>
      </div>

      {/* Nav mes */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <button onClick={prevMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{margin:0,color:"#f0f0f0",fontSize:"18px",fontWeight:"700"}}>{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px",alignItems:"center"}}>
        {[["todos","Todos"],["B3","B3"],["Forex","Forex"],["Cripto","Cripto"],["Americano","Americano"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroMercado(v)} style={{padding:"6px 14px",borderRadius:"20px",border:"1px solid "+(filtroMercado===v?"#00d4aa44":"#1a1a2e"),cursor:"pointer",fontWeight:"600",fontSize:"12px",background:filtroMercado===v?"rgba(0,212,170,0.1)":"transparent",color:filtroMercado===v?"#00d4aa":"#666",fontFamily:"Inter,sans-serif",transition:"all 0.15s"}}>{l}</button>
        ))}
        <div style={{width:"1px",height:"20px",background:"#1a1a2e",margin:"0 4px"}}/>
        <select value={filtroEst} onChange={e=>setFiltroEst(e.target.value)} style={{...inp,padding:"5px 10px",fontSize:"12px",color:filtroEst==="todas"?"#666":"#00d4aa",border:"1px solid "+(filtroEst==="todas"?"#1a1a2e":"#00d4aa44")}}>
          <option value="todas">Todas estratégias</option>
          {(estrategias||[]).map(e=><option key={e.id} value={e.nome}>{e.nome}</option>)}
        </select>
      </div>

      {/* Calendar */}
      <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px",marginBottom:"24px"}}>
        {/* Header dias */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"8px",marginBottom:"12px"}}>
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>(
            <div key={d} style={{textAlign:"center",color:"#555",fontSize:"12px",fontWeight:"700",padding:"4px 0",letterSpacing:"0.5px"}}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((w,wi)=>(
          <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"8px",marginBottom:"8px"}}>
            {w.days.map((cell,ci)=>{
              if (!cell) return <div key={ci} style={{minHeight:"110px"}}/>;
              const {d,k,e} = cell;
              const isToday = d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
              const tot = e ? (e.totalB3||0)+(e.totalForex||0) : null;
              const hasTrades = e && e.numTrades>0;
              const isSel = sel===k;
              const bg = isSel ? (tot>=0?"rgba(0,212,170,0.2)":"rgba(255,77,77,0.2)") : hasTrades ? (tot>=0?"rgba(0,212,170,0.08)":"rgba(255,77,77,0.08)") : "rgba(255,255,255,0.01)";
              const border = isSel ? (tot>=0?"2px solid #00d4aa":"2px solid #ff4d4d") : isToday?"2px solid #00d4aa44":hasTrades?(tot>=0?"1px solid #00d4aa22":"1px solid #ff4d4d22"):"1px solid #1a1a2e";
              return (
                <div key={ci} onClick={()=>{ setSel(isSel?null:k); setEditMode(false); }} style={{borderRadius:"12px",background:bg,border,padding:"10px 8px",cursor:hasTrades?"pointer":"default",transition:"all 0.15s",minHeight:"90px",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                  <p style={{margin:0,color:isToday?"#00d4aa":hasTrades?"#f0f0f0":"#555",fontSize:"15px",fontWeight:isToday?"800":"700",textAlign:"center"}}>{d}</p>
                  {hasTrades && (
                    <div style={{textAlign:"center",width:"100%",display:"flex",flexDirection:"column",gap:"6px"}}>
                      <p style={{margin:0,color:"#888",fontSize:"11px",fontWeight:"500"}}>{e.numTrades} trade{e.numTrades!==1?"s":""}</p>
                      {e.winRate!==undefined&&<p style={{margin:0,color:e.winRate>=60?"#00d4aa":e.winRate>=40?"#f59e0b":"#ff4d4d",fontSize:"11px",fontWeight:"700"}}>{e.winRate}% acerto</p>}
                      {tot!==null&&<p style={{margin:0,color:tot>=0?"#00d4aa":"#ff4d4d",fontSize:"12px",fontWeight:"800",fontFamily:"monospace"}}>{tot>=0?"+":""}R${Math.abs(tot)<1000?tot.toFixed(0):(tot/1000).toFixed(1)+"k"}</p>}
                      {e.totalPts!==undefined&&<p style={{margin:0,color:"#888",fontSize:"11px",fontFamily:"monospace"}}>{e.totalPts>=0?"+":""}{e.totalPts}pts</p>}
                      {e.emocoes?.length>0&&<p style={{margin:0,color:EMOCAO_COLORS[e.emocoes[0]]||"#777",fontSize:"11px"}}>{e.emocoes[0]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Detalhe do dia */}
      {sel && selEntry && !editMode && (
        <div style={{background:"#0d0d14",border:"1px solid #1e1e2e",borderRadius:"16px",padding:"24px"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 6px",color:"#666",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>{formatDateLong(sel)}</p>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {selEntry.totalPts!==undefined&&<div style={{background:"rgba(0,212,170,0.08)",border:"1px solid #00d4aa22",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos</p><p style={{margin:0,color:"#00d4aa",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.totalPts>=0?"+":""}{selEntry.totalPts}</p></div>}
                {((selEntry.totalB3||0)+(selEntry.totalForex||0))!==0&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado</p><p style={{margin:0,color:((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"#00d4aa":"#ff4d4d",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"+":""}R$ {Math.abs((selEntry.totalB3||0)+(selEntry.totalForex||0)).toFixed(2)}</p></div>}
                {selEntry.numTrades&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Trades</p><p style={{margin:0,color:"#f0f0f0",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.numTrades}</p></div>}
                {selEntry.winRate!==undefined&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Win Rate</p><p style={{margin:0,color:selEntry.winRate>=60?"#00d4aa":"#f59e0b",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.winRate}%</p></div>}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",flexShrink:0}}>
              <button onClick={startEdit} style={{background:"rgba(0,153,255,0.1)",border:"1px solid #0099ff33",borderRadius:"8px",padding:"8px 14px",color:"#0099ff",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>✏️ Editar</button>
              <button onClick={handleDelete} style={{background:"rgba(255,77,77,0.1)",border:"1px solid #ff4d4d33",borderRadius:"8px",padding:"8px 14px",color:"#ff4d4d",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>🗑 Excluir dia</button>
              <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#666"}}>✕</button>
            </div>
          </div>

          {/* Emocoes */}
          {selEntry.emocoes?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 8px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {selEntry.emocoes.map(em=><span key={em} style={{padding:"4px 12px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"1a",color:EMOCAO_COLORS[em]||"#888",fontSize:"12px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"44"}}>{em}</span>)}
              </div>
            </div>
          )}

          {/* Trades */}
          {selEntry.trades?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 10px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações ({selEntry.trades.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {selEntry.trades.map((t,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:t.observacao?"8px":"0"}}>
                      <span style={{color:"#666",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                      <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                      <span style={{color:"#888",fontSize:"12px"}}>{t.mercado}</span>
                      {t.estrategia&&<span style={{color:"#666",fontSize:"12px",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                      <div style={{marginLeft:"auto",display:"flex",gap:"12px"}}>
                        {t.pontos!=null&&<span style={{color:"#ccc",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                        {t.resultado!=null&&<span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                      </div>
                    </div>
                    {t.observacao&&<p style={{margin:0,color:"#666",fontSize:"12px",fontStyle:"italic",paddingLeft:"32px"}}>"{t.observacao}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selEntry.observacao&&(
            <div style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 6px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observação geral</p>
              <p style={{margin:0,color:"#999",fontSize:"13px",lineHeight:"1.6",fontStyle:"italic"}}>{selEntry.observacao}</p>
            </div>
          )}
        </div>
      )}

      {/* Modo edição */}
      {sel && editEntry && editMode && (
        <div style={{background:"#0d0d14",border:"1px solid #0099ff33",borderRadius:"16px",padding:"24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 2px",color:"#0099ff",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Editando</p>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"16px",fontWeight:"700"}}>{formatDateLong(sel)}</p>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              {msg&&<span style={{color:"#00d4aa",fontSize:"13px",fontWeight:"600",alignSelf:"center"}}>{msg}</span>}
              <button onClick={saveEdit} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"8px",padding:"9px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar</button>
              <button onClick={()=>setEditMode(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"9px 14px",color:"#888",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Cancelar</button>
            </div>
          </div>

          {/* Edit emocoes */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {EMOCOES_LIST.map(em=>{
                const sel2=(editEntry.emocoes||[]).includes(em);
                const cor=EMOCAO_COLORS[em]||"#888";
                return <button key={em} onClick={()=>toggleEmocaoEdit(em)} style={{padding:"5px 12px",borderRadius:"20px",border:"1px solid "+(sel2?cor+"66":"#2a2a3a"),background:sel2?cor+"1a":"transparent",color:sel2?cor:"#666",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{em}</button>;
              })}
            </div>
          </div>

          {/* Edit trades */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações — clique no WIN/LOSS para alternar, ✕ para remover</p>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {(editEntry.trades||[]).map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #2a2a3a"}}>
                  <span style={{color:"#666",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                  <button onClick={()=>toggleTradeType(i)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d",border:"none",cursor:"pointer",fontFamily:"monospace"}}>{t.tipo}</button>
                  <span style={{color:"#888",fontSize:"12px"}}>{t.mercado}</span>
                  {t.estrategia&&<span style={{color:"#666",fontSize:"12px"}}>{t.estrategia}</span>}
                  <div style={{marginLeft:"auto",display:"flex",gap:"12px",alignItems:"center"}}>
                    {t.pontos!=null&&<span style={{color:"#ccc",fontSize:"13px",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                    {t.resultado!=null&&<span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                    <button onClick={()=>removeTradeFromEdit(i)} style={{background:"rgba(255,77,77,0.1)",border:"none",borderRadius:"6px",color:"#ff6b6b",cursor:"pointer",padding:"4px 8px",fontSize:"12px"}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit observacao */}
          <div>
            <p style={{margin:"0 0 8px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observação geral</p>
            <textarea value={editEntry.observacao||""} onChange={e=>setEditEntry(p=>({...p,observacao:e.target.value}))} style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"70px",boxSizing:"border-box"}} placeholder="Observações do dia..." rows={3}/>
          </div>
        </div>
      )}
    </div>
  );
}
