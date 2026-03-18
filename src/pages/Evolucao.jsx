import { useState, useMemo } from "react";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v, cur="R$") { return (v>=0?"+":"")+cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2}); }
function fmtPts(v) { return (v>=0?"+":"")+v.toFixed(1)+" pts"; }
function dayKey(d) { return d.toISOString().slice(0,10); }
function parseDate(s) { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d); }

function DateFilter({ inicio, fim, onChange }) {
  const [open, setOpen] = useState(false);
  const [editInicio, setEditInicio] = useState(inicio);
  const [editFim,    setEditFim]    = useState(fim);
  const fmt = (s) => { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; };

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"20px",padding:"8px 16px",color:"#aaa",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {fmt(inicio)} até {fmt(fim)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0d0d14",border:"1px solid #2a2a3a",borderRadius:"16px",padding:"16px",zIndex:100,minWidth:"280px",boxShadow:"0 20px 40px rgba(0,0,0,0.5)"}}>
          <p style={{margin:"0 0 12px",color:"#999",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Período</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <label style={{color:"#999",fontSize:"11px",display:"block",marginBottom:"5px"}}>Início</label>
              <input type="date" value={editInicio} onChange={e=>setEditInicio(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"8px",color:"#f0f0f0",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"Inter,sans-serif"}}/>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",display:"block",marginBottom:"5px"}}>Fim</label>
              <input type="date" value={editFim} onChange={e=>setEditFim(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"8px",color:"#f0f0f0",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"Inter,sans-serif"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            {[["7d","7 dias"],["1m","Este mês"],["3m","3 meses"],["1a","1 ano"]].map(([k,l])=>(
              <button key={k} onClick={()=>{
                const fim = new Date(); const ini = new Date();
                if(k==="7d") ini.setDate(fim.getDate()-7);
                else if(k==="1m") ini.setDate(1);
                else if(k==="3m") ini.setMonth(fim.getMonth()-3);
                else ini.setFullYear(fim.getFullYear()-1);
                setEditInicio(dayKey(ini)); setEditFim(dayKey(fim));
              }} style={{flex:1,padding:"6px",borderRadius:"6px",border:"1px solid #2a2a3a",background:"transparent",color:"#999",fontSize:"11px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>{ onChange(editInicio,editFim); setOpen(false); }} style={{width:"100%",marginTop:"10px",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"8px",padding:"9px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Aplicar</button>
        </div>
      )}
    </div>
  );
}

export default function Evolucao({ entries, compliance }) {
  const now     = new Date();
  const ini1m   = new Date(now.getFullYear(), now.getMonth(), 1);
  const [inicio, setInicio] = useState(dayKey(ini1m));
  const [fim,    setFim]    = useState(dayKey(now));

  const filtered = useMemo(() => {
    return Object.entries(entries).filter(([d]) => d >= inicio && d <= fim).sort(([a],[b])=>a.localeCompare(b));
  }, [entries, inicio, fim]);

  // Compliance (regras do mês atual)
  const now2 = new Date();
  const ym = now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
  const daysThisMonth  = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  const compliedDays   = daysThisMonth.filter(k=>(compliance||{})[k]===true).length;
  const compliancePct  = daysThisMonth.length>0 ? Math.round((compliedDays/daysThisMonth.length)*100) : null;
  const complianceColor= compliancePct===null?"#666":compliancePct>=80?"#00d4aa":compliancePct>=50?"#f59e0b":"#ff4d4d";

  // Aggregates
  const totalB3    = filtered.reduce((s,[,e])=>s+(e.totalB3||0), 0);
  const totalForex = filtered.reduce((s,[,e])=>s+(e.totalForex||0), 0);
  const totalPts   = filtered.reduce((s,[,e])=>s+(e.totalPts||0), 0);
  const totalResult= totalB3 + totalForex;
  const diasOp     = filtered.filter(([,e])=>e.numTrades>0).length;

  // Win rate
  const allTrades = filtered.flatMap(([,e])=>e.trades||[]);
  const wins      = allTrades.filter(t=>t.tipo==="WIN").length;
  const winRate   = allTrades.length > 0 ? Math.round((wins/allTrades.length)*100) : null;

  // Curva de capital
  let acc = 0;
  const capitalPoints = [
    { d:"inicio", val: 0 },
    ...filtered.map(([d,e]) => {
      acc += (e.totalB3||0)+(e.totalForex||0);
      return { d, val: parseFloat(acc.toFixed(2)) };
    })
  ];

  // Resultado diario (barras)
  const dailyBars = filtered.map(([d,e]) => ({
    d,
    val: (e.totalB3||0)+(e.totalForex||0),
    pts: e.totalPts||0
  }));

  // Estrategias
  const estratStats = {};
  allTrades.forEach(t => {
    const n = t.estrategia || "Sem nome";
    if (!estratStats[n]) estratStats[n] = { wins:0, total:0, resultado:0, pontos:0 };
    estratStats[n].total++;
    estratStats[n].resultado += t.resultado||0;
    estratStats[n].pontos    += t.pontos||0;
    if (t.tipo==="WIN") estratStats[n].wins++;
  });

  // Origem ganhos/perdas
  const ganhos  = allTrades.filter(t=>(t.resultado||0)>0);
  const perdas  = allTrades.filter(t=>(t.resultado||0)<0);
  const totGanho= ganhos.reduce((s,t)=>s+(t.resultado||0),0);
  const totPerda= perdas.reduce((s,t)=>s+(t.resultado||0),0);
  const gByEst  = {};
  ganhos.forEach(t=>{ const n=t.estrategia||"Sem nome"; if(!gByEst[n])gByEst[n]=0; gByEst[n]+=(t.resultado||0); });
  const pByEst  = {};
  perdas.forEach(t=>{ const n=t.estrategia||"Sem nome"; if(!pByEst[n])pByEst[n]=0; pByEst[n]+=(t.resultado||0); });

  // Media vencedora/perdedora
  const mediaVenc = ganhos.length>0 ? ganhos.reduce((s,t)=>s+(t.resultado||0),0)/ganhos.length : 0;
  const mediaPerd = perdas.length>0 ? Math.abs(perdas.reduce((s,t)=>s+(t.resultado||0),0)/perdas.length) : 0;
  const rr        = mediaPerd>0 ? (mediaVenc/mediaPerd).toFixed(2) : "—";

  // Chart helpers
  function LineChart({ points, color="#00d4aa" }) {
    if (points.length < 2) return <div style={{height:"120px",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#444",fontSize:"12px"}}>Registre operações para ver o gráfico</p></div>;
    const W=600,H=120,PL=8,PR=8,PT=8,PB=8;
    const vals=points.map(p=>p.val), minV=Math.min(0,...vals), maxV=Math.max(0,...vals), rng=maxV-minV||1;
    const x=(i)=>PL+(i/(points.length-1||1))*(W-PL-PR);
    const y=(v)=>PT+(1-(v-minV)/rng)*(H-PT-PB);
    const zero=y(0);
    const path=points.map((p,i)=>(i===0?"M":"L")+x(i).toFixed(1)+","+y(p.val).toFixed(1)).join(" ");
    const area=path+" L"+x(points.length-1).toFixed(1)+","+zero.toFixed(1)+" L"+PL+","+zero.toFixed(1)+" Z";
    const last=points[points.length-1]?.val||0;
    const lc=last>=0?"#00d4aa":"#ff4d4d";
    return (
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto",display:"block"}} preserveAspectRatio="none">
        <line x1={PL} y1={zero} x2={W-PR} y2={zero} stroke="#ffffff08" strokeWidth="1" strokeDasharray="4,4"/>
        <path d={area} fill={lc+"15"}/>
        <path d={path} fill="none" stroke={lc} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i)=>( i===0||i===points.length-1||i%Math.ceil(points.length/8)===0 ?
          <circle key={i} cx={x(i)} cy={y(p.val)} r="3" fill={p.val>=0?"#00d4aa":"#ff4d4d"} stroke="#0a0a0f" strokeWidth="1.5"/> : null
        ))}
      </svg>
    );
  }

  function BarChart({ bars }) {
    if (bars.length === 0) return <div style={{height:"120px",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#666",fontSize:"12px"}}>Sem dados no período</p></div>;
    const W=580, H=120, PT=8, PB=8, PL=8, PR=8;
    const innerH = H-PT-PB;
    const midY   = PT + innerH/2;
    const maxAbs = Math.max(1, ...bars.map(b=>Math.abs(b.val)));
    const n      = bars.length;
    const gap    = 3;
    const bw     = Math.max(4, Math.min(20, Math.floor((W-PL-PR-(n-1)*gap)/n)));
    const totalW = n*bw + (n-1)*gap;
    const startX = PL + (W-PL-PR-totalW)/2;
    return (
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto",display:"block"}}>
        <line x1={PL} y1={midY} x2={W-PR} y2={midY} stroke="#ffffff18" strokeWidth="1"/>
        {bars.map((b,i)=>{
          const x    = startX + i*(bw+gap);
          const barH = Math.max(2, (Math.abs(b.val)/maxAbs)*(innerH/2-2));
          const col  = b.val>=0 ? "#00d4aa" : "#ff4d4d";
          const barY = b.val>=0 ? midY-barH : midY;
          return <rect key={i} x={x} y={barY} width={bw} height={barH} fill={col} rx="2" opacity="0.9"/>;
        })}
      </svg>
    );
  }

  const colors = ["#00d4aa","#0099ff","#f59e0b","#a78bfa","#f472b6","#34d399","#fb923c"];

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      {/* Filter row */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"24px"}}>
        <DateFilter inicio={inicio} fim={fim} onChange={(i,f)=>{ setInicio(i); setFim(f); }}/>
      </div>

      {/* Disciplina - linha própria centralizada */}
      <div style={{display:"flex",justifyContent:"flex-start",alignItems:"center",gap:"16px",marginBottom:"28px"}}>
        <div style={{background:"#0d0d14",border:"2px solid "+(compliancePct===null?"#1a1a2e":complianceColor+"55"),borderRadius:"50%",width:"88px",height:"88px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
          {compliancePct!==null&&<div style={{position:"absolute",inset:0,background:"conic-gradient("+complianceColor+" "+compliancePct+"%, #1a1a2e "+compliancePct+"%)",borderRadius:"50%",opacity:0.25}}/>}
          <div style={{position:"absolute",inset:"8px",background:"#0d0d14",borderRadius:"50%"}}/>
          <div style={{position:"relative",textAlign:"center"}}>
            <p style={{margin:"0 0 1px",color:compliancePct===null?"#444":complianceColor,fontSize:"22px",fontWeight:"800",fontFamily:"monospace"}}>{compliancePct!==null?compliancePct+"%":"—"}</p>
            <p style={{margin:0,color:"#555",fontSize:"9px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Disciplina</p>
          </div>
        </div>
        <div>
          <p style={{margin:"0 0 3px",color:complianceColor,fontSize:"14px",fontWeight:"700"}}>{compliancePct!==null?compliancePct+"% de disciplina este mês":"Sem dados de disciplina"}</p>
          <p style={{margin:0,color:"#555",fontSize:"12px"}}>{compliedDays} de {daysThisMonth.length} dias seguindo as regras</p>
        </div>
      </div>

      {/* Top 3 cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"20px",marginBottom:"28px"}}>
        {/* Resultado Total */}
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#00d4aa,transparent)"}}/>
          <p style={{margin:"0 0 6px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado Total</p>
          <p style={{margin:"0 0 4px",color:totalResult>=0?"#00d4aa":"#ff4d4d",fontSize:"34px",fontWeight:"800",fontFamily:"monospace",letterSpacing:"-1px"}}>
            {totalResult>=0?"+":""}R$ {Math.abs(totalResult).toLocaleString("pt-BR",{minimumFractionDigits:2})}
          </p>
          <p style={{margin:0,color:"#888",fontSize:"12px",fontFamily:"monospace"}}>{totalPts>=0?"+":""}{totalPts.toFixed(1)} pts</p>
        </div>
        {/* Win Rate */}
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,"+(winRate===null?"#666":winRate>=60?"#00d4aa":winRate>=40?"#f59e0b":"#ff4d4d")+",transparent)"}}/>
          <p style={{margin:"0 0 6px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Win Rate</p>
          <p style={{margin:"0 0 4px",color:winRate===null?"#666":winRate>=60?"#00d4aa":winRate>=40?"#f59e0b":"#ff4d4d",fontSize:"34px",fontWeight:"800",fontFamily:"monospace"}}>
            {winRate !== null ? winRate+"%" : "—"}
          </p>
          <p style={{margin:0,color:"#888",fontSize:"12px"}}>{wins} de {allTrades.length} trades</p>
        </div>
        {/* Dias Operados */}
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,#f59e0b,transparent)"}}/>
          <p style={{margin:"0 0 6px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Dias Operados</p>
          <p style={{margin:"0 0 4px",color:"#f0f0f0",fontSize:"28px",fontWeight:"800",fontFamily:"monospace"}}>{diasOp}</p>
          <p style={{margin:0,color:"#888",fontSize:"13px"}}>{filtered.length} dias no período</p>
        </div>
      </div>

      {/* Curva de Capital + Resultado Diário */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",marginBottom:"28px"}}>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px"}}>
          <p style={{margin:"0 0 4px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Curva de Capital</p>
          <p style={{margin:"0 0 14px",color:totalResult>=0?"#00d4aa":"#ff4d4d",fontSize:"18px",fontWeight:"700",fontFamily:"monospace"}}>
            R$ {totalResult>=0?"+":""}{totalResult.toLocaleString("pt-BR",{minimumFractionDigits:2})}
          </p>
          <LineChart points={capitalPoints}/>
        </div>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px"}}>
          <p style={{margin:"0 0 4px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado Diário</p>
          <p style={{margin:"0 0 14px",color:"#999",fontSize:"12px"}}>{dailyBars.filter(b=>b.val>0).length} dias positivos · {dailyBars.filter(b=>b.val<0).length} negativos</p>
          <BarChart bars={dailyBars}/>
        </div>
      </div>

      {/* Origem ganhos e perdas */}
      {allTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px",marginBottom:"28px"}}>
          {/* Ganhos */}
          <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              <p style={{margin:0,color:"#00d4aa",fontSize:"12px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem do Ganho</p>
            </div>
            {Object.entries(gByEst).sort(([,a],[,b])=>b-a).map(([n,v],i)=>{
              const pct = totGanho>0 ? Math.round((v/totGanho)*100) : 0;
              return (
                <div key={n} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"6px",background:colors[i%colors.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:colors[i%colors.length],fontSize:"10px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                      <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                      <span style={{color:"#00d4aa",fontSize:"12px",fontWeight:"700",fontFamily:"monospace"}}>+R$ {v.toFixed(2)}</span>
                    </div>
                    <div style={{height:"3px",borderRadius:"2px",background:"#1a1a2e"}}>
                      <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:colors[i%colors.length]}}/>
                    </div>
                  </div>
                  <span style={{color:"#999",fontSize:"11px",minWidth:"30px",textAlign:"right"}}>{pct}%</span>
                </div>
              );
            })}
            {Object.keys(gByEst).length === 0 && <p style={{color:"#666",fontSize:"12px"}}>Nenhum ganho no período</p>}
          </div>
          {/* Perdas */}
          <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
              <p style={{margin:0,color:"#ff4d4d",fontSize:"12px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem da Perda</p>
            </div>
            {Object.entries(pByEst).sort(([,a],[,b])=>a-b).map(([n,v],i)=>{
              const pct = totPerda<0 ? Math.round((v/totPerda)*100) : 0;
              return (
                <div key={n} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"6px",background:"#ff4d4d22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{color:"#ff4d4d",fontSize:"10px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                      <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                      <span style={{color:"#ff4d4d",fontSize:"12px",fontWeight:"700",fontFamily:"monospace"}}>R$ {v.toFixed(2)}</span>
                    </div>
                    <div style={{height:"3px",borderRadius:"2px",background:"#1a1a2e"}}>
                      <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:"#ff4d4d"}}/>
                    </div>
                  </div>
                  <span style={{color:"#999",fontSize:"11px",minWidth:"30px",textAlign:"right"}}>{pct}%</span>
                </div>
              );
            })}
            {Object.keys(pByEst).length === 0 && <p style={{color:"#666",fontSize:"12px"}}>Nenhuma perda no período</p>}
          </div>
        </div>
      )}

      {/* Métricas por estratégia */}
      {Object.keys(estratStats).length > 0 && (
        <div style={{marginBottom:"28px"}}>
          <p style={{margin:"0 0 16px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Métricas por Estratégia</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"20px"}}>
            {Object.entries(estratStats).map(([n,s],i)=>{
              const ass = s.total>0 ? Math.round((s.wins/s.total)*100) : 0;
              const cor = colors[i%colors.length];
              return (
                <div key={n} style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"16px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,width:"3px",bottom:0,background:cor}}/>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"6px",background:cor+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:cor,fontSize:"9px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                    </div>
                    <span style={{color:"#ccc",fontSize:"13px",fontWeight:"700"}}>{n}</span>
                  </div>
                  <p style={{margin:"0 0 2px",color:s.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>
                    {s.resultado>=0?"+":""}R$ {Math.abs(s.resultado).toFixed(2)}
                  </p>
                  <p style={{margin:"0 0 8px",color:"#999",fontSize:"12px",fontFamily:"monospace"}}>{s.pontos>=0?"+":""}{s.pontos.toFixed(1)} pts</p>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px"}}>
                    <span style={{color:"#888"}}>Assertividade</span>
                    <span style={{color:ass>=60?"#00d4aa":ass>=40?"#f59e0b":"#ff4d4d",fontWeight:"700"}}>{ass}%</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginTop:"3px"}}>
                    <span style={{color:"#888"}}>{s.total} operações</span>
                    <span style={{color:"#999"}}>{s.wins}W / {s.total-s.wins}L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Médias */}
      {allTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"20px"}}>
          {[
            {label:"Média Vencedora",sub:"por trade",val:"R$ "+mediaVenc.toFixed(2),color:"#00d4aa",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>},
            {label:"Média Perdedora",sub:"por trade",val:"R$ "+mediaPerd.toFixed(2),color:"#ff4d4d",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>},
            {label:"Risco × Retorno",sub:"razão média",val:rr+":1",color:parseFloat(rr)>=1.5?"#00d4aa":parseFloat(rr)>=1?"#f59e0b":"#ff4d4d",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>},
          ].map((s,i)=>(
            <div key={i} style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"16px",display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"8px",background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:s.color}}>{s.icon}</div>
              <div>
                <p style={{margin:"0 0 2px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</p>
                <p style={{margin:"0 0 1px",color:s.color,fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{s.val}</p>
                <p style={{margin:0,color:"#666",fontSize:"11px"}}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 20px",background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",marginTop:"16px"}}>
          <p style={{color:"#666",fontSize:"14px",margin:0}}>Nenhum registro no período selecionado.</p>
          <p style={{color:"#222",fontSize:"12px",margin:"6px 0 0"}}>Registre operações no Diário para ver as métricas.</p>
        </div>
      )}

      {/* Diagnóstico IA */}
      {allTrades.length >= 3 && <DiagnosticoIA trades={allTrades} entries={filtered} totalResult={totalResult} winRate={winRate} mediaVenc={mediaVenc} mediaPerd={mediaPerd} rr={rr} estratStats={estratStats} diasOp={diasOp}/>}
    </div>
  );
}

const GEMINI_KEY = "AIzaSyC3-T9Yvo-kuZ8DHKbnsTk60BQeCf_oCR8";

function DiagnosticoIA({ trades, entries, totalResult, winRate, mediaVenc, mediaPerd, rr, estratStats, diasOp }) {
  const [loading, setLoading] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");
  const [erro, setErro] = useState("");

  async function gerarDiagnostico() {
    setLoading(true); setErro(""); setDiagnostico("");

    // Build data summary
    const emocaoStats = {};
    entries.forEach(([,e]) => {
      const tot = (e.totalB3||0)+(e.totalForex||0);
      (e.emocoes||[]).forEach(em => {
        if (!emocaoStats[em]) emocaoStats[em] = { dias:0, resultado:0 };
        emocaoStats[em].dias++;
        emocaoStats[em].resultado += tot;
      });
    });

    const estratResumo = Object.entries(estratStats).map(([n,s]) => {
      const ass = s.total>0 ? Math.round((s.wins/s.total)*100) : 0;
      return `${n}: ${s.total} trades, ${ass}% acerto, R$ ${s.resultado.toFixed(2)}`;
    }).join("
");

    const emocaoResumo = Object.entries(emocaoStats).map(([em,s]) => {
      const media = (s.resultado/s.dias).toFixed(2);
      return `${em}: ${s.dias} dias, resultado médio R$ ${media}`;
    }).join("
");

    const prompt = `Você é um coach especialista em trading brasileiro. Analise os dados abaixo e gere um diagnóstico personalizado, direto e útil em português. Seja específico, use os números reais, aponte padrões, forças e fraquezas. Máximo 300 palavras.

DADOS DO PERÍODO:
- Total de trades: ${trades.length}
- Dias operados: ${diasOp}
- Resultado total: R$ ${totalResult.toFixed(2)}
- Win Rate: ${winRate}%
- Média vencedora: R$ ${mediaVenc.toFixed(2)}
- Média perdedora: R$ ${mediaPerd.toFixed(2)}
- Risco/Retorno: ${rr}:1

DESEMPENHO POR ESTRATÉGIA:
${estratResumo}

EMOÇÕES vs RESULTADO:
${emocaoResumo}

Gere um diagnóstico com:
1. Ponto forte principal
2. Principal problema a corrigir
3. Recomendação prática e específica`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
          })
        }
      );
      const data = await res.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto) setDiagnostico(texto);
      else setErro("Não foi possível gerar o diagnóstico. Tente novamente.");
    } catch(e) {
      setErro("Erro de conexão. Verifique sua internet.");
    }
    setLoading(false);
  }

  return (
    <div style={{marginTop:"28px",background:"linear-gradient(135deg,rgba(0,212,170,0.05),rgba(0,153,255,0.05))",border:"1px solid #00d4aa33",borderRadius:"16px",padding:"24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div>
            <p style={{margin:"0 0 2px",color:"#f0f0f0",fontSize:"16px",fontWeight:"700"}}>Diagnóstico IA</p>
            <p style={{margin:0,color:"#666",fontSize:"12px"}}>Análise personalizada dos seus dados por IA</p>
          </div>
        </div>
        <button onClick={gerarDiagnostico} disabled={loading} style={{background:loading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#00d4aa,#00b894)",color:loading?"#555":"#000",border:"none",borderRadius:"10px",padding:"10px 20px",fontWeight:"700",fontSize:"13px",cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:"8px",transition:"all 0.2s"}}>
          {loading ? (
            <>
              <div style={{width:"14px",height:"14px",border:"2px solid #555",borderTop:"2px solid #00d4aa",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              Analisando...
            </>
          ) : (
            <>✨ {diagnostico?"Gerar novamente":"Gerar diagnóstico"}</>
          )}
        </button>
      </div>

      {!diagnostico && !erro && !loading && (
        <div style={{textAlign:"center",padding:"32px 20px",color:"#444",fontSize:"13px"}}>
          <p style={{margin:"0 0 6px",fontSize:"15px"}}>🧠</p>
          <p style={{margin:0}}>Clique em "Gerar diagnóstico" para receber uma análise personalizada dos seus trades, emoções e estratégias.</p>
        </div>
      )}

      {erro && (
        <div style={{padding:"14px",borderRadius:"10px",background:"rgba(255,77,77,0.08)",border:"1px solid #ff4d4d22",color:"#ff6b6b",fontSize:"13px"}}>
          {erro}
        </div>
      )}

      {diagnostico && (
        <div style={{padding:"20px",borderRadius:"12px",background:"rgba(0,0,0,0.3)",border:"1px solid #1a1a2e"}}>
          <p style={{margin:0,color:"#ddd",fontSize:"14px",lineHeight:"1.8",whiteSpace:"pre-wrap"}}>{diagnostico}</p>
        </div>
      )}
    </div>
  );
}
