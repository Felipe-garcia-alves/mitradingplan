import { useState } from "react";
import { Select } from "../components/ui";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EMOCAO_COLORS = {"Focado":"#2ee6a0","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
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

  const inp = {background:"#18241f",border:"1px solid #26352e",borderRadius:"8px",padding:"8px 12px",color:"#f0f0f0",fontSize:"13px",outline:"none",fontFamily:"var(--font-sans)"};

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:"28px"}}>
        <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Histórico</h1>
        <p style={{margin:"4px 0 0",color:"#666",fontSize:"13px"}}>Clique em um dia para ver detalhes ou editar</p>
      </div>

      {/* Nav mes */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <button onClick={prevMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{margin:0,color:"#f0f0f0",fontSize:"18px",fontWeight:"700"}}>{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px",alignItems:"center"}}>
        {[["todos","Todos"],["B3","B3"],["Forex","Forex"],["Cripto","Cripto"],["Americano","Americano"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroMercado(v)} style={{padding:"6px 14px",borderRadius:"20px",border:"1px solid "+(filtroMercado===v?"#2ee6a044":"#18241f"),cursor:"pointer",fontWeight:"600",fontSize:"12px",background:filtroMercado===v?"rgba(46,230,160,0.1)":"transparent",color:filtroMercado===v?"#2ee6a0":"#666",fontFamily:"var(--font-sans)",transition:"all 0.15s"}}>{l}</button>
        ))}
        <div style={{width:"1px",height:"20px",background:"#18241f",margin:"0 4px"}}/>
        <Select value={filtroEst} onChange={setFiltroEst} popWidth={220}
          style={{padding:"6px 12px",minHeight:"32px",borderRadius:"20px",fontSize:"12px",color:filtroEst==="todas"?"var(--text-3)":"#2ee6a0",border:"1px solid "+(filtroEst==="todas"?"var(--line)":"#2ee6a044"),background:filtroEst==="todas"?"transparent":"rgba(46,230,160,0.08)"}}
          options={[{value:"todas",label:"Todas estratégias"}, ...(estrategias||[]).map(e=>({value:e.nome,label:e.nome}))]}/>
      </div>

      {/* Calendar */}
      <div style={{background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"20px",marginBottom:"24px"}}>
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
              const tradesDodia = (e?.trades||[]).filter(t=>(filtroMercado==="todos"||t.mercado===filtroMercado)&&(filtroEst==="todas"||t.estrategia===filtroEst));
              const tot = e && tradesDodia.length > 0 ? tradesDodia.reduce((s,t)=>s+(t.resultado||0),0) : null;
              const hasTrades = tradesDodia.length > 0;
              const numTrades = tradesDodia.length;
              const winsDodia = tradesDodia.filter(t=>t.tipo==="WIN").length;
              const wrDodia = numTrades > 0 ? Math.round((winsDodia/numTrades)*100) : null;
              const isSel = sel===k;
              const bg = isSel ? (tot>=0?"rgba(46,230,160,0.2)":"rgba(255,84,112,0.2)") : hasTrades ? (tot>=0?"rgba(46,230,160,0.08)":"rgba(255,84,112,0.08)") : "rgba(255,255,255,0.01)";
              const border = isSel ? (tot>=0?"2px solid #2ee6a0":"2px solid #ff5470") : isToday?"2px solid #2ee6a044":hasTrades?(tot>=0?"1px solid #2ee6a022":"1px solid #ff547022"):"1px solid #18241f";
              return (
                <div key={ci} onClick={()=>{ setSel(isSel?null:k); setEditMode(false); }} style={{borderRadius:"12px",background:bg,border,padding:"10px 8px",cursor:hasTrades?"pointer":"default",transition:"all 0.15s",minHeight:"90px",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                  <p style={{margin:0,color:isToday?"#2ee6a0":hasTrades?"#f0f0f0":"#555",fontSize:"15px",fontWeight:isToday?"800":"700",textAlign:"center"}}>{d}</p>
                  {hasTrades && (
                    <div style={{textAlign:"center",width:"100%",display:"flex",flexDirection:"column",gap:"6px"}}>
                      <p style={{margin:0,color:"#888",fontSize:"11px",fontWeight:"500"}}>{numTrades} trade{numTrades!==1?"s":""}</p>
                      {wrDodia!==null&&<p style={{margin:0,color:wrDodia>=60?"#2ee6a0":wrDodia>=40?"#f59e0b":"#ff5470",fontSize:"11px",fontWeight:"700"}}>{wrDodia}% acerto</p>}
                      {tot!==null&&<p style={{margin:0,color:tot>=0?"#2ee6a0":"#ff5470",fontSize:"12px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{tot>=0?"+":""}R${Math.abs(tot)<1000?tot.toFixed(0):(tot/1000).toFixed(1)+"k"}</p>}
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
        <div style={{background:"var(--panel)",border:"1px solid #1b2823",borderRadius:"16px",padding:"24px"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 6px",color:"#666",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>{formatDateLong(sel)}</p>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {selEntry.totalPts!==undefined&&<div style={{background:"rgba(46,230,160,0.08)",border:"1px solid #2ee6a022",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos</p><p style={{margin:0,color:"#2ee6a0",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.totalPts>=0?"+":""}{selEntry.totalPts}</p></div>}
                {((selEntry.totalB3||0)+(selEntry.totalForex||0))!==0&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1b2823",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado</p><p style={{margin:0,color:((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"#2ee6a0":"#ff5470",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"+":""}R$ {Math.abs((selEntry.totalB3||0)+(selEntry.totalForex||0)).toFixed(2)}</p></div>}
                {selEntry.numTrades&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1b2823",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Trades</p><p style={{margin:0,color:"#f0f0f0",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.numTrades}</p></div>}
                {selEntry.winRate!==undefined&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1b2823",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Win Rate</p><p style={{margin:0,color:selEntry.winRate>=60?"#2ee6a0":"#f59e0b",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.winRate}%</p></div>}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",flexShrink:0}}>
              <button onClick={startEdit} style={{background:"rgba(0,153,255,0.1)",border:"1px solid #0099ff33",borderRadius:"8px",padding:"8px 14px",color:"#0099ff",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>✏️ Editar</button>
              <button onClick={handleDelete} style={{background:"rgba(255,84,112,0.1)",border:"1px solid #ff547033",borderRadius:"8px",padding:"8px 14px",color:"#ff5470",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>🗑 Excluir dia</button>
              <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"8px",width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#666"}}>✕</button>
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
                  <div key={i} style={{padding:"12px 16px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #18241f"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:t.observacao?"8px":"0"}}>
                      <span style={{color:"#666",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                      <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470"}}>{t.tipo}</span>
                      <span style={{color:"#888",fontSize:"12px"}}>{t.mercado}</span>
                      {t.estrategia&&<span style={{color:"#666",fontSize:"12px",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                      <div style={{marginLeft:"auto",display:"flex",gap:"12px"}}>
                        {t.pontos!=null&&<span style={{color:"#ccc",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                        {t.resultado!=null&&<span style={{color:t.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                      </div>
                    </div>
                    {t.observacao&&<p style={{margin:0,color:"#666",fontSize:"12px",fontStyle:"italic",paddingLeft:"32px"}}>"{t.observacao}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selEntry.observacao&&(
            <div style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #18241f"}}>
              <p style={{margin:"0 0 6px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observação geral</p>
              <p style={{margin:0,color:"#999",fontSize:"13px",lineHeight:"1.6",fontStyle:"italic"}}>{selEntry.observacao}</p>
            </div>
          )}
        </div>
      )}

      {/* Modo edição */}
      {sel && editEntry && editMode && (
        <div style={{background:"var(--panel)",border:"1px solid #0099ff33",borderRadius:"16px",padding:"24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 2px",color:"#0099ff",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Editando</p>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"16px",fontWeight:"700"}}>{formatDateLong(sel)}</p>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              {msg&&<span style={{color:"#2ee6a0",fontSize:"13px",fontWeight:"600",alignSelf:"center"}}>{msg}</span>}
              <button onClick={saveEdit} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"8px",padding:"9px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar</button>
              <button onClick={()=>setEditMode(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",borderRadius:"8px",padding:"9px 14px",color:"#888",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Cancelar</button>
            </div>
          </div>

          {/* Edit emocoes */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {EMOCOES_LIST.map(em=>{
                const sel2=(editEntry.emocoes||[]).includes(em);
                const cor=EMOCAO_COLORS[em]||"#888";
                return <button key={em} onClick={()=>toggleEmocaoEdit(em)} style={{padding:"5px 12px",borderRadius:"20px",border:"1px solid "+(sel2?cor+"66":"#26352e"),background:sel2?cor+"1a":"transparent",color:sel2?cor:"#666",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{em}</button>;
              })}
            </div>
          </div>

          {/* Edit trades */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações — clique no WIN/LOSS para alternar, ✕ para remover</p>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {(editEntry.trades||[]).map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #26352e"}}>
                  <span style={{color:"#666",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                  <button onClick={()=>toggleTradeType(i)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)"}}>{t.tipo}</button>
                  <span style={{color:"#888",fontSize:"12px"}}>{t.mercado}</span>
                  {t.estrategia&&<span style={{color:"#666",fontSize:"12px"}}>{t.estrategia}</span>}
                  <div style={{marginLeft:"auto",display:"flex",gap:"12px",alignItems:"center"}}>
                    {t.pontos!=null&&<span style={{color:"#ccc",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                    {t.resultado!=null&&<span style={{color:t.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                    <button onClick={()=>removeTradeFromEdit(i)} style={{background:"rgba(255,84,112,0.1)",border:"none",borderRadius:"6px",color:"#ff7a90",cursor:"pointer",padding:"4px 8px",fontSize:"12px"}}>✕</button>
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
