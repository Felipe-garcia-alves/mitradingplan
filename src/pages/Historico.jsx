import { useState } from "react";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};

function dayKey(y,m,d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
function formatDateLong(s) { const p=s.split("-"); const d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",weekday:"long"}); }

export default function Historico({ entries }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);

  const firstDay  = new Date(year,month,1).getDay();
  const daysInMon = new Date(year,month+1,0).getDate();

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const selEntry = sel ? entries[sel] : null;

  // Week summaries
  const weeks = [];
  let week = { days:[], wins:0, losses:0 };
  const blanks = firstDay;
  for (let i=0;i<blanks;i++) week.days.push(null);
  for (let d=1;d<=daysInMon;d++) {
    const k = dayKey(year,month,d);
    const e = entries[k];
    if (e) {
      const tot = (e.totalB3||0)+(e.totalForex||0);
      if (tot>0) week.wins++; else if(tot<0) week.losses++;
    }
    week.days.push({d,k,e});
    if (week.days.length===7) { weeks.push(week); week={days:[],wins:0,losses:0}; }
  }
  if (week.days.length>0) { while(week.days.length<7) week.days.push(null); weeks.push(week); }

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{marginBottom:"24px"}}>
        <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>Histórico</h1>
        <p style={{margin:0,color:"#888",fontSize:"13px"}}>Clique em um dia para ver os detalhes</p>
      </div>

      {/* Nav mes */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <button onClick={prevMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{margin:0,color:"#f0f0f0",fontSize:"16px",fontWeight:"700"}}>{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Calendar */}
      <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"16px",marginBottom:"20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"36px repeat(7,1fr)",gap:"6px",marginBottom:"10px"}}>
          <div/>
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>(
            <div key={d} style={{textAlign:"center",color:"#666",fontSize:"11px",fontWeight:"600",padding:"4px 0"}}>{d}</div>
          ))}
        </div>
        {weeks.map((w,wi)=>(
          <div key={wi} style={{display:"grid",gridTemplateColumns:"36px repeat(7,1fr)",gap:"6px",marginBottom:"6px",alignItems:"start"}}>
            <div style={{fontSize:"10px",color:"#2a2a3a",textAlign:"center",paddingRight:"4px"}}>
              {w.wins>0&&<span style={{color:"#00d4aa44",fontSize:"9px",display:"block"}}>{w.wins>0?"+"+w.wins:""}</span>}
              {w.losses>0&&<span style={{color:"#ff4d4d44",fontSize:"9px",display:"block"}}>{w.losses>0?"-"+w.losses:""}</span>}
            </div>
            {w.days.map((cell,ci)=>{
              if (!cell) return <div key={ci}/>;
              const {d,k,e} = cell;
              const today = new Date(); const isToday = d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
              const tot = e ? (e.totalB3||0)+(e.totalForex||0) : null;
              const hasTrades = e && e.numTrades>0;
              const bg = hasTrades ? (tot>=0?"rgba(0,212,170,0.12)":"rgba(255,77,77,0.12)") : "rgba(255,255,255,0.02)";
              const border = isToday?"2px solid #00d4aa44":hasTrades?(tot>=0?"1px solid #00d4aa22":"1px solid #ff4d4d22"):"1px solid #1a1a2e";
              return (
                <div key={ci} onClick={()=>hasTrades&&setSel(sel===k?null:k)} style={{borderRadius:"12px",background:bg,border,padding:"10px 6px",cursor:hasTrades?"pointer":"default",transition:"all 0.15s",minHeight:"90px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",gap:"3px"}}>
                  <p style={{margin:0,color:isToday?"#00d4aa":hasTrades?"#f0f0f0":"#555",fontSize:"15px",fontWeight:isToday?"800":"600",textAlign:"center"}}>{d}</p>
                  {hasTrades && (
                    <div style={{textAlign:"center",width:"100%"}}>
                      {e.numTrades>0&&<p style={{margin:"2px 0 1px",color:"#777",fontSize:"10px"}}>{e.numTrades} trade{e.numTrades!==1?"s":""}</p>}
                      {e.winRate!==undefined&&<p style={{margin:"0 0 1px",color:e.winRate>=60?"#00d4aa":e.winRate>=40?"#f59e0b":"#ff4d4d",fontSize:"10px",fontWeight:"700"}}>{e.winRate}%</p>}
                      {tot!==null&&<p style={{margin:0,color:tot>=0?"#00d4aa":"#ff4d4d",fontSize:"12px",fontWeight:"800",fontFamily:"monospace"}}>{tot>=0?"+":""}R${Math.abs(tot)<1000?tot.toFixed(0):(tot/1000).toFixed(1)+"k"}</p>}
                      {e.emocoes?.length>0&&<p style={{margin:"2px 0 0",color:"#555",fontSize:"9px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"90%"}}>{e.emocoes[0]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal dia selecionado */}
      {sel && selEntry && (
        <div style={{background:"#0d0d14",border:"1px solid #1e1e2e",borderRadius:"14px",padding:"22px",animation:"fadeIn 0.2s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"18px"}}>
            <div>
              <p style={{margin:"0 0 2px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>{formatDateLong(sel)}</p>
              <div style={{display:"flex",gap:"12px",alignItems:"center",marginTop:"6px",flexWrap:"wrap"}}>
                {selEntry.totalPts!==undefined&&<div style={{background:"rgba(0,212,170,0.1)",border:"1px solid #00d4aa22",borderRadius:"8px",padding:"6px 12px",textAlign:"center"}}><p style={{margin:"0 0 1px",color:"#888",fontSize:"9px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos</p><p style={{margin:0,color:"#00d4aa",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.totalPts>=0?"+":""}{selEntry.totalPts}</p></div>}
                {(selEntry.totalB3||selEntry.totalForex)&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"6px 12px",textAlign:"center"}}><p style={{margin:"0 0 1px",color:"#888",fontSize:"9px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado R$</p><p style={{margin:0,color:((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"#00d4aa":"#ff4d4d",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{((selEntry.totalB3||0)+(selEntry.totalForex||0))>=0?"+":" "}R$ {Math.abs((selEntry.totalB3||0)+(selEntry.totalForex||0)).toFixed(2)}</p></div>}
                {selEntry.numTrades&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"6px 12px",textAlign:"center"}}><p style={{margin:"0 0 1px",color:"#888",fontSize:"9px",textTransform:"uppercase",letterSpacing:"1px"}}>Trades</p><p style={{margin:0,color:"#f0f0f0",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.numTrades}</p></div>}
                {selEntry.winRate!==undefined&&<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"6px 12px",textAlign:"center"}}><p style={{margin:"0 0 1px",color:"#888",fontSize:"9px",textTransform:"uppercase",letterSpacing:"1px"}}>Exec.</p><p style={{margin:0,color:selEntry.winRate>=60?"#00d4aa":"#f59e0b",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{selEntry.winRate}%</p></div>}
              </div>
            </div>
            <button onClick={()=>setSel(null)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"32px",height:"32px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#999",flexShrink:0}}>✕</button>
          </div>

          {selEntry.emocoes?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 8px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções Registradas</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                {selEntry.emocoes.map(em=><span key={em} style={{padding:"3px 10px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"1a",color:EMOCAO_COLORS[em]||"#888",fontSize:"12px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"44"}}>{em}</span>)}
              </div>
            </div>
          )}

          {selEntry.trades?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 10px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações ({selEntry.trades.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {selEntry.trades.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
                    <span style={{color:"#888",fontSize:"11px",minWidth:"20px"}}>#{i+1}</span>
                    <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                    <span style={{color:"#777",fontSize:"12px"}}>{t.mercado}</span>
                    {t.estrategia&&<span style={{color:"#999",fontSize:"12px",padding:"2px 8px",background:"rgba(255,255,255,0.04)",borderRadius:"4px"}}>{t.estrategia}</span>}
                    <div style={{marginLeft:"auto",display:"flex",gap:"12px",alignItems:"center"}}>
                      {t.pontos!==null&&t.pontos!==undefined&&<span style={{color:"#bbb",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                      {t.resultado!==null&&t.resultado!==undefined&&<span style={{color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selEntry.observacao&&(
            <div style={{padding:"14px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 6px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Observações do Aluno</p>
              <p style={{margin:0,color:"#888",fontSize:"13px",lineHeight:"1.6",fontStyle:"italic"}}>{selEntry.observacao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
