// Mi Trading Plan - Evolucao
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
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }`}</style>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:99}}/>}
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:open?"rgba(0,212,170,0.08)":"rgba(255,255,255,0.04)",border:"1px solid "+(open?"#00d4aa44":"#2a2a3a"),borderRadius:"20px",padding:"8px 16px",color:open?"#00d4aa":"#aaa",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
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

export default function Evolucao({ entries, compliance, estrategias, setPagina }) {
  const now     = new Date();
  const ini1m   = new Date(now.getFullYear(), now.getMonth(), 1);
  const [inicio, setInicio] = useState(dayKey(ini1m));
  const [fim,    setFim]    = useState(dayKey(now));
  const [panelEst, setPanelEst] = useState(null);
  const [panelDrill, setPanelDrill] = useState(null);
  const [filtroMercado, setFiltroMercado] = useState("todos");
  const isMobile = window.innerWidth < 768;

  const filtered = useMemo(() => {
    return Object.entries(entries).filter(([d]) => d >= inicio && d <= fim).sort(([a],[b])=>a.localeCompare(b));
  }, [entries, inicio, fim]);

  // Compliance — média total de todos os dias salvos até hoje
  const now2 = new Date();
  const ym = now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
  const today2 = dayKey(now2);
  const daysThisMonth = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  // Card = média de TODOS os dias salvos no mês até hoje
  const allSavedVals = Object.entries(compliance||{})
    .filter(([k]) => k <= today2)
    .map(([,v]) => typeof v === "number" ? v : v === true ? 100 : null)
    .filter(v => v !== null);
  const compliancePct = allSavedVals.length > 0
    ? Math.round(allSavedVals.reduce((a,b)=>a+b,0)/allSavedVals.length)
    : null;
  const compliedDays = daysThisMonth.filter(k => {
    const v = (compliance||{})[k];
    return v === true || (typeof v === "number" && v >= 80);
  }).length;
  const complianceColor = compliancePct===null?"#666":compliancePct>=80?"#00d4aa":compliancePct>=50?"#f59e0b":"#ff4d4d";

  // Aggregates
  const totalB3    = filtroMercado==="todos"||filtroMercado==="B3"    ? filtered.reduce((s,[,e])=>s+(e.totalB3||0),    0) : 0;
  const totalForex = filtroMercado==="todos"||filtroMercado==="Forex"  ? filtered.reduce((s,[,e])=>s+(e.totalForex||0),  0) : 0;
  const totalCripto= filtroMercado==="todos"||filtroMercado==="Cripto" ? filtered.reduce((s,[,e])=>s+(e.totalCripto||0), 0) : 0;
  const totalPts   = filtered.reduce((s,[,e])=>s+(e.totalPts||0), 0);
  const totalResult= totalB3 + totalForex + totalCripto;
  const diasOp     = filtered.filter(([,e])=>e.numTrades>0).length;

  // Win rate
  const allTrades = filtered.flatMap(([,e])=>e.trades||[]).filter(t=>filtroMercado==="todos"||t.mercado===filtroMercado);
  const wins      = allTrades.filter(t=>t.tipo==="WIN").length;
  const winRate   = allTrades.length > 0 ? Math.round((wins/allTrades.length)*100) : null;

  // Curva de capital
  let acc = 0;
  const capitalPoints = [
    { d:"inicio", val: 0 },
    ...filtered.map(([d,e]) => {
      if(filtroMercado==="todos"||filtroMercado==="B3")     acc += e.totalB3||0;
      if(filtroMercado==="todos"||filtroMercado==="Forex")   acc += e.totalForex||0;
      if(filtroMercado==="todos"||filtroMercado==="Cripto")    acc += e.totalCripto||0;
      if(filtroMercado==="todos"||filtroMercado==="Americano") acc += e.totalAmericano||0;
      return { d, val: parseFloat(acc.toFixed(2)) };
    })
  ];

  // Resultado diario (barras)
  const dailyBars = filtered.map(([d,e]) => ({
    d,
    val: (filtroMercado==="todos"||filtroMercado==="B3"?e.totalB3||0:0)+(filtroMercado==="todos"||filtroMercado==="Forex"?e.totalForex||0:0)+(filtroMercado==="todos"||filtroMercado==="Cripto"?e.totalCripto||0:0)+(filtroMercado==="todos"||filtroMercado==="Americano"?e.totalAmericano||0:0),
    pts: e.totalPts||0
  }));

  // Estrategias — useMemo garante recompute quando entries mudar
  const estratStats = useMemo(() => {
    const stats = {};
    allTrades.forEach(t => {
      const n = t.estrategia || "Sem nome";
      if (!stats[n]) stats[n] = { wins:0, total:0, resultado:0, pontos:0 };
      stats[n].total++;
      stats[n].resultado += t.resultado||0;
      stats[n].pontos    += t.pontos||0;
      if (t.tipo==="WIN") stats[n].wins++;
    });
    return stats;
  }, [allTrades]);

  // Lookup de nome atual das estratégias (para refletir renomeações)
  const nomeAtual = useMemo(() => {
    const map = {};
    (estrategias||[]).forEach(e => { if(e.nome) map[e.nome] = e.nome; });
    return map;
  }, [estrategias]);

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
        <path d={path} fill="none" stroke={lc} strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i)=>( i===0||i===points.length-1||i%Math.ceil(points.length/8)===0 ?
          <circle key={i} cx={x(i)} cy={y(p.val)} r="2" fill={p.val>=0?"#27b589":"#c94a4a"} stroke="#0a0a0f" strokeWidth="1.5"><title>{p.d ? p.d+" — R$ "+p.val.toFixed(2) : "R$ "+p.val.toFixed(2)}</title></circle> : null
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"32px",gap:"12px",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:"6px"}}>
          {[["todos","Todos"],["B3","B3"],["Forex","Forex"],["Cripto","Cripto"],["Americano","Americano"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroMercado(v)} style={{padding:"7px 16px",borderRadius:"20px",border:"1px solid "+(filtroMercado===v?"#00d4aa44":"#1a1a2e"),cursor:"pointer",fontWeight:"600",fontSize:"12px",background:filtroMercado===v?"rgba(0,212,170,0.1)":"transparent",color:filtroMercado===v?"#00d4aa":"#666",fontFamily:"Inter,sans-serif",transition:"all 0.15s"}}>{l}</button>
          ))}
        </div>
        <DateFilter inicio={inicio} fim={fim} onChange={(i,f)=>{ setInicio(i); setFim(f); }}/>
      </div>

      {/* LINHA 1: Alerta full width */}
      <AlertasInteligentes trades={allTrades} entries={filtered} winRate={winRate} diasOp={diasOp}/>

      {/* LINHA 2: 4 KPIs — Disciplina primeiro */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 2fr 1fr 1fr",gap:"12px",marginBottom:"36px",marginTop:"32px"}}>
        {/* Disciplina — primeiro */}
        <div onClick={()=>setPagina&&setPagina("regras")} style={{background:"linear-gradient(145deg,#111119,#0a0a11)",border:"1.5px solid #252535",borderRadius:"16px",padding:"22px",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",gap:"14px",cursor:setPagina?"pointer":"default",transition:"all 0.2s",boxShadow:"0 1px 0 0 #2a2a3a inset, 0 -1px 0 0 #080810 inset, 2px 0 0 0 #1a1a28 inset"}}
          onMouseEnter={e=>{if(setPagina)e.currentTarget.style.borderColor=complianceColor+"44";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e2e";e.currentTarget.style.boxShadow="none";}}>
          
          <div style={{width:"80px",height:"80px",borderRadius:"50%",border:"2px solid "+(compliancePct===null?"#1a1a2e":complianceColor+"55"),background:"#0d0d14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",flexShrink:0}}>
            {compliancePct!==null&&<div style={{position:"absolute",inset:0,background:"conic-gradient("+complianceColor+" "+compliancePct+"%, #1a1a2e "+compliancePct+"%)",borderRadius:"50%",opacity:0.25}}/>}
            <div style={{position:"absolute",inset:"9px",background:"#0d0d14",borderRadius:"50%"}}/>
            <div style={{position:"relative",textAlign:"center"}}>
              <p style={{margin:0,color:compliancePct===null?"#444":complianceColor,fontSize:"17px",fontWeight:"800",fontFamily:"monospace"}}>{compliancePct!==null?compliancePct+"%":"—"}</p>
              <p style={{margin:0,color:"#555",fontSize:"7px",textTransform:"uppercase",letterSpacing:"0.5px"}}>disc.</p>
            </div>
          </div>
          <div>
            <p style={{margin:"0 0 3px",color:complianceColor,fontSize:"13px",fontWeight:"700"}}>{compliancePct!==null?compliancePct+"% de disciplina":"Sem dados"}</p>
            <p style={{margin:0,color:"#555",fontSize:"11px"}}>{allSavedVals.length>0?`média de ${allSavedVals.length} dia${allSavedVals.length!==1?"s":""}`:compliedDays+" de "+daysThisMonth.length+" dias"}</p>
          </div>
        </div>
        {/* Resultado Total hero */}
        <div onClick={()=>setPanelDrill("resultado")} style={{background:"linear-gradient(145deg,#111119,#0a0a11)",border:"1.5px solid #1e1e2e",borderRadius:"16px",padding:"24px 28px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"all 0.3s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#27b58966";e.currentTarget.style.boxShadow="0 0 20px #27b58912";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e2e";e.currentTarget.style.boxShadow="none";}}>
          
          <p style={{margin:"0 0 10px",color:"#666",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.8px"}}>Resultado Total</p>
          <p style={{margin:"0 0 4px",color:totalResult>=0?"#27b589":"#c94a4a",fontSize:"32px",fontWeight:"800",fontFamily:"monospace",letterSpacing:"-1px"}}>
            {totalResult>=0?"+":""}R$ {Math.abs(totalResult).toLocaleString("pt-BR",{minimumFractionDigits:2})}
          </p>
          <p style={{margin:"0 0 16px",color:"#444",fontSize:"13px",fontFamily:"monospace"}}>{totalPts>=0?"+":""}{totalPts.toFixed(1)} pts no período</p>
          <span style={{background:totalResult>=0?"rgba(0,212,170,0.12)":"rgba(255,77,77,0.12)",color:totalResult>=0?"#00d4aa":"#ff4d4d",fontSize:"11px",fontWeight:"700",padding:"4px 12px",borderRadius:"20px",border:"1px solid "+(totalResult>=0?"#00d4aa33":"#ff4d4d33")}}>
            {totalResult>=0?"↑ Positivo":"↓ Negativo"}
          </span>
          <span style={{position:"absolute",bottom:"12px",right:"14px",color:"#333",fontSize:"10px"}}>ver detalhes →</span>
        </div>
        {/* Win Rate */}
        <div onClick={()=>setPanelDrill("winrate")} style={{background:"linear-gradient(145deg,#111119,#0a0a11)",border:"1.5px solid #1e1e2e",borderRadius:"16px",padding:"22px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"all 0.3s"}}
          onMouseEnter={e=>{const wr=winRate>=60?"#27b589":winRate>=40?"#f59e0b":"#c94a4a";e.currentTarget.style.borderColor=wr+"66";e.currentTarget.style.boxShadow="0 0 20px "+wr+"12";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e2e";e.currentTarget.style.boxShadow="none";}}>
          
          <p style={{margin:"0 0 10px",color:"#666",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.8px"}}>Win Rate</p>
          <p style={{margin:"0 0 6px",color:winRate===null?"#666":winRate>=60?"#27b589":winRate>=40?"#f59e0b":"#c94a4a",fontSize:"28px",fontWeight:"800",fontFamily:"monospace"}}>
            {winRate !== null ? winRate+"%" : "—"}
          </p>
          <p style={{margin:0,color:"#444",fontSize:"12px"}}>{wins} de {allTrades.length} trades</p>
          <span style={{position:"absolute",bottom:"12px",right:"14px",color:"#333",fontSize:"10px"}}>ver trades →</span>
        </div>
        {/* Dias Operados */}
        {(()=>{
          const hoje = new Date();
          const ano = hoje.getFullYear();
          const mes = hoje.getMonth();
          const mesKey = ano+"-"+String(mes+1).padStart(2,"0");
          const diasOperadosSet = new Set(Object.keys(entries).filter(d=>d.startsWith(mesKey)&&(entries[d].numTrades||0)>0));
          const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
          const totalDias = new Date(ano, mes+1, 0).getDate();
          const celulas = [];
          for(let i=0;i<primeiroDiaSemana;i++) celulas.push(null);
          for(let d=1;d<=totalDias;d++) celulas.push(d);
          const semanas = [];
          for(let i=0;i<celulas.length;i+=7) semanas.push(celulas.slice(i,i+7));
          return (
            <div style={{background:"linear-gradient(145deg,#111119,#0a0a11)",border:"1.5px solid #252535",borderRadius:"16px",padding:"22px",position:"relative",overflow:"hidden",boxShadow:"0 1px 0 0 #2a2a3a inset, 0 -1px 0 0 #080810 inset, 2px 0 0 0 #1a1a28 inset"}}>
              
              <p style={{margin:"0 0 10px",color:"#666",fontSize:"13px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.8px"}}>Dias Operados</p>
              <p style={{margin:"0 0 10px",color:"#f0f0f0",fontSize:"28px",fontWeight:"800",fontFamily:"monospace"}}>{diasOp}</p>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {semanas.map((sem,si)=>(
                  <div key={si} style={{display:"flex",gap:"4px"}}>
                    {Array.from({length:7}).map((_,di)=>{
                      const cel = sem[di];
                      if(cel===undefined||cel===null) return <div key={di} style={{width:"8px",height:"8px"}}/>;
                      const dKey = ano+"-"+String(mes+1).padStart(2,"0")+"-"+String(cel).padStart(2,"0");
                      const operado = diasOperadosSet.has(dKey);
                      const isHoje = cel===hoje.getDate();
                      return <div key={di} style={{width:"8px",height:"8px",borderRadius:"50%",background:operado?"#00d4aa":isHoje?"#2a2a3a":"#1a1a2e",border:isHoje&&!operado?"1px solid #333":"none",transition:"background 0.2s"}}/>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* LINHA 3: Curva Capital (60%) + Origem Ganho + Origem Perda */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"5fr 3fr 3fr",gap:"16px",marginBottom:"36px"}}>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
          <p style={{margin:"0 0 4px",color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Curva de Capital</p>
          <p style={{margin:"0 0 14px",color:totalResult>=0?"#27b589":"#c94a4a",fontSize:"18px",fontWeight:"700",fontFamily:"monospace"}}>
            R$ {totalResult>=0?"+":""}{totalResult.toLocaleString("pt-BR",{minimumFractionDigits:2})}
          </p>
          <LineChart points={capitalPoints}/>
        </div>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <p style={{margin:0,color:"#00d4aa",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem do Ganho</p>
          </div>
          {Object.entries(gByEst).sort(([,a],[,b])=>b-a).map(([n,v],i)=>{
            const pct = totGanho>0 ? Math.round((v/totGanho)*100) : 0;
            return (
              <div key={n} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"6px",background:colors[i%colors.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:colors[i%colors.length],fontSize:"9px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                    <span style={{color:"#27b589",fontSize:"12px",fontWeight:"700",fontFamily:"monospace"}}>+R$ {v.toFixed(2)}</span>
                  </div>
                  <div style={{height:"3px",borderRadius:"2px",background:"#1a1a2e"}}>
                    <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:colors[i%colors.length]}}/>
                  </div>
                </div>
                <span style={{color:"#555",fontSize:"11px",minWidth:"28px",textAlign:"right"}}>{pct}%</span>
              </div>
            );
          })}
          {Object.keys(gByEst).length===0&&<p style={{color:"#444",fontSize:"12px"}}>Nenhum ganho</p>}
        </div>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <p style={{margin:0,color:"#ff4d4d",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem da Perda</p>
          </div>
          {Object.entries(pByEst).sort(([,a],[,b])=>a-b).map(([n,v],i)=>{
            const pct = totPerda<0 ? Math.round((v/totPerda)*100) : 0;
            return (
              <div key={n} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"6px",background:"#ff4d4d22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:"#ff4d4d",fontSize:"9px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                    <span style={{color:"#c94a4a",fontSize:"12px",fontWeight:"700",fontFamily:"monospace"}}>R$ {v.toFixed(2)}</span>
                  </div>
                  <div style={{height:"3px",borderRadius:"2px",background:"#1a1a2e"}}>
                    <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:"#ff4d4d"}}/>
                  </div>
                </div>
                <span style={{color:"#555",fontSize:"11px",minWidth:"28px",textAlign:"right"}}>{pct}%</span>
              </div>
            );
          })}
          {Object.keys(pByEst).length===0&&<p style={{color:"#444",fontSize:"12px"}}>Nenhuma perda</p>}
        </div>
      </div>

      {/* LINHA 4: Métricas por Estratégia full width */}
      {Object.keys(estratStats).length > 0 && (
        <div style={{marginBottom:"36px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
            <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Métricas por Estratégia</p>
            <span style={{color:"#333",fontSize:"11px"}}>clique para ver operações</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"14px"}}>
            {Object.entries(estratStats).map(([n,s],i)=>{
              const ass = s.total>0 ? Math.round((s.wins/s.total)*100) : 0;
              const cor = colors[i%colors.length];
              const mediaPts = s.total>0 ? (s.pontos/s.total).toFixed(1) : "0.0";
              const isSelected = panelEst === n;
              return (
                <div key={n} onClick={()=>setPanelEst(isSelected?null:n)}
                  style={{background:"#0d0d14",border:"1px solid "+(isSelected?cor+"66":"#1e1e2e"),borderRadius:"14px",padding:"18px",cursor:"pointer",transition:"all 0.2s",boxShadow:isSelected?"0 0 0 1px "+cor+"33":"none"}}
                  onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.borderColor=cor+"44";}}}
                  onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.borderColor="#1e1e2e";}}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
                    <div style={{padding:"4px 8px",borderRadius:"6px",background:cor+"22",border:"1px solid "+cor+"44",flexShrink:0}}>
                      <span style={{color:cor,fontSize:"11px",fontWeight:"800",letterSpacing:"0.5px"}}>{n.slice(0,3).toUpperCase()}</span>
                    </div>
                    <span style={{color:"#aaa",fontSize:"13px",fontWeight:"500",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeAtual[n]||n}</span>
                    {isSelected && <span style={{color:cor,fontSize:"11px"}}>▸</span>}
                  </div>
                  <p style={{margin:"0 0 3px",color:"#27b589",fontSize:"22px",fontWeight:"800",fontFamily:"monospace",letterSpacing:"-0.5px"}}>
                    {s.pontos>=0?"+":""}{s.pontos.toFixed(1)} pts
                  </p>
                  <p style={{margin:"0 0 14px",color:s.resultado>=0?"#27b589":"#c94a4a",fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>
                    {s.resultado>=0?"+":""}R$ {Math.abs(s.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2})}
                  </p>
                  <div style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"#555",flexWrap:"wrap"}}>
                    <span>Assertividade <span style={{color:ass>=60?"#27b589":ass>=40?"#f59e0b":"#c94a4a",fontWeight:"700"}}>{ass}%</span></span>
                    <span style={{color:"#2a2a3a"}}>·</span>
                    <span>{s.total} ops</span>
                    <span style={{color:"#2a2a3a"}}>·</span>
                    <span>{parseFloat(mediaPts)>=0?"+":""}{mediaPts} /op</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PAINEL LATERAL — operações da estratégia selecionada */}
      {panelEst && (() => {
        const cor = colors[Object.keys(estratStats).indexOf(panelEst) % colors.length];
        const ops = filtered.flatMap(([d,e])=>
          (e.trades||[]).filter(t=>t.estrategia===panelEst).map(t=>({...t,_date:d}))
        ).sort((a,b)=>b._date.localeCompare(a._date));
        const totalPtsEst = ops.reduce((s,t)=>s+(t.pontos||0),0);
        const totalResEst = ops.reduce((s,t)=>s+(t.resultado||0),0);
        const winsEst = ops.filter(t=>t.tipo==="WIN").length;
        return (
          <>
            {/* Overlay click-outside */}
            <div onClick={()=>setPanelEst(null)} style={{position:"fixed",inset:0,zIndex:399,background:"rgba(0,0,0,0.4)"}}/>
            <div style={{position:"fixed",top:0,right:0,bottom:0,width:"380px",background:"#0a0a12",borderLeft:"1px solid #1a1a2e",zIndex:400,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,0.6)",animation:"slideIn 0.25s ease"}}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            {/* Header */}
            <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{padding:"5px 10px",borderRadius:"7px",background:cor+"22",border:"1px solid "+cor+"44"}}>
                    <span style={{color:cor,fontSize:"12px",fontWeight:"800"}}>{panelEst.slice(0,3).toUpperCase()}</span>
                  </div>
                  <p style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{panelEst}</p>
                </div>
                <button onClick={()=>setPanelEst(null)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"20px",padding:"2px 6px",lineHeight:1}}>×</button>
              </div>
              {/* Stats resumo */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                  <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Pts</p>
                  <p style={{margin:0,color:"#00d4aa",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{totalPtsEst>=0?"+":""}{totalPtsEst.toFixed(0)}</p>
                </div>
                <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                  <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>R$</p>
                  <p style={{margin:0,color:totalResEst>=0?"#27b589":"#c94a4a",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{totalResEst>=0?"+":""}{ Math.abs(totalResEst).toFixed(0)}</p>
                </div>
                <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                  <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Acerto</p>
                  <p style={{margin:0,color:winsEst/ops.length>=0.6?"#27b589":"#f59e0b",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{ops.length>0?Math.round((winsEst/ops.length)*100):0}%</p>
                </div>
              </div>
            </div>
            {/* Lista de operações */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
              <p style={{margin:"0 0 12px",color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>{ops.length} operações no período</p>
              {ops.map((t,i)=>(
                <div key={i} style={{padding:"12px 14px",borderRadius:"10px",background:"#0d0d14",border:"1px solid #1a1a2e",marginBottom:"8px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{padding:"3px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                      <span style={{color:"#666",fontSize:"12px"}}>{t.mercado}</span>
                    </div>
                    <span style={{color:"#555",fontSize:"11px"}}>{t._date.split("-").reverse().join("/")}</span>
                  </div>
                  <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                    {t.pontos!=null&&<span style={{color:"#ccc",fontSize:"13px",fontFamily:"monospace",fontWeight:"600"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                    {t.resultado!=null&&<span style={{color:t.resultado>=0?"#27b589":"#c94a4a",fontSize:"13px",fontFamily:"monospace",fontWeight:"700"}}>{t.resultado>=0?"+":""}R$ {t.resultado.toFixed(2)}</span>}
                  </div>
                  {t.observacao&&<p style={{margin:"6px 0 0",color:"#555",fontSize:"12px",fontStyle:"italic"}}>"{t.observacao}"</p>}
                </div>
              ))}
              {ops.length===0&&<p style={{color:"#333",fontSize:"13px",textAlign:"center",marginTop:"40px"}}>Nenhuma operação no período selecionado.</p>}
            </div>
          </div>
          </>
        );
      })()}

      {/* LINHA 5: Médias */}
      {allTrades.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:"16px",marginBottom:"36px"}}>
          {[
            {label:"Média Vencedora",sub:"por trade",val:"R$ "+mediaVenc.toFixed(2),color:"#00d4aa",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>},
            {label:"Média Perdedora",sub:"por trade",val:"R$ "+mediaPerd.toFixed(2),color:"#ff4d4d",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>},
            {label:"Risco × Retorno",sub:"razão média",val:rr+":1",color:parseFloat(rr)>=1.5?"#00d4aa":parseFloat(rr)>=1?"#f59e0b":"#ff4d4d",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>},
          ].map((s,i)=>(
            <div key={i} style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px",display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{width:"38px",height:"38px",borderRadius:"10px",background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:s.color}}>{s.icon}</div>
              <div>
                <p style={{margin:"0 0 2px",color:"#666",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</p>
                <p style={{margin:"0 0 1px",color:s.color,fontSize:"20px",fontWeight:"800",fontFamily:"monospace"}}>{s.val}</p>
                <p style={{margin:0,color:"#444",fontSize:"11px"}}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 20px",background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",marginBottom:"36px"}}>
          <p style={{color:"#666",fontSize:"14px",margin:0}}>Nenhum registro no período selecionado.</p>
          <p style={{color:"#222",fontSize:"12px",margin:"6px 0 0"}}>Registre operações no Diário para ver as métricas.</p>
        </div>
      )}

      {/* ── SEÇÃO: CORRELAÇÃO EMOÇÃO × RESULTADO ── */}
      {allTrades.length >= 3 && (() => {
        const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
        const emocaoStats = {};
        filtered.forEach(([,e]) => {
          const tot = (e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0);
          const wr = e.winRate;
          (e.emocoes||[]).forEach(em => {
            if (!emocaoStats[em]) emocaoStats[em] = { resultado:0, dias:0, winRates:[] };
            emocaoStats[em].resultado += tot;
            emocaoStats[em].dias++;
            if (wr !== undefined) emocaoStats[em].winRates.push(wr);
          });
        });
        const emList = Object.entries(emocaoStats).sort(([,a],[,b])=>b.resultado-a.resultado);
        if (emList.length === 0) return null;
        const maxAbs = Math.max(1, ...emList.map(([,s])=>Math.abs(s.resultado)));
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Correlação Emoção × Resultado</p>
              <span style={{color:"#333",fontSize:"11px"}}>impacto no seu trading</span>
            </div>
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {emList.map(([em,s])=>{
                  const cor = EMOCAO_COLORS[em]||"#888";
                  const avgWR = s.winRates.length>0 ? Math.round(s.winRates.reduce((a,b)=>a+b,0)/s.winRates.length) : null;
                  const barW = Math.round((Math.abs(s.resultado)/maxAbs)*100);
                  const pos = s.resultado >= 0;
                  return (
                    <div key={em} style={{display:"flex",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"90px",flexShrink:0}}>
                        <span style={{fontSize:"12px",fontWeight:"700",color:cor}}>{em}</span>
                        <p style={{margin:0,color:"#444",fontSize:"10px"}}>{s.dias} dia{s.dias!==1?"s":""}{avgWR!==null?" · "+avgWR+"% wr":""}</p>
                      </div>
                      <div style={{flex:1,height:"3px",background:"#1a1a2e",borderRadius:"2px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:barW+"%",background:pos?"#27b589":"#c94a4a",borderRadius:"4px",transition:"width 0.3s"}}/>
                      </div>
                      <span style={{width:"80px",textAlign:"right",fontSize:"12px",fontWeight:"700",fontFamily:"monospace",color:pos?"#27b589":"#c94a4a",flexShrink:0}}>
                        {pos?"+":""}R$ {s.resultado.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEÇÃO: STREAK DE DISCIPLINA ── */}
      {(() => {
        const savedDays = Object.entries(compliance||{})
          .filter(([,v])=>typeof v==="number"||v===true)
          .sort(([a],[b])=>b.localeCompare(a));
        if (savedDays.length === 0) return null;
        let streak = 0, maxStreak = 0, curStreak = 0;
        const sortedAsc = [...savedDays].sort(([a],[b])=>a.localeCompare(b));
        let prevDate = null;
        sortedAsc.forEach(([k,v]) => {
          const pct = typeof v==="number" ? v : 100;
          const cur = new Date(k+"T12:00:00");
          if (prevDate) {
            const diff = (cur-prevDate)/(1000*60*60*24);
            if (diff === 1 && pct >= 80) curStreak++;
            else curStreak = pct >= 80 ? 1 : 0;
          } else {
            curStreak = pct >= 80 ? 1 : 0;
          }
          if (curStreak > maxStreak) maxStreak = curStreak;
          prevDate = cur;
        });
        streak = curStreak;
        const todayVal = (compliance||{})[dayKey(new Date())];
        const todayPct = typeof todayVal==="number" ? todayVal : todayVal===true ? 100 : 0;
        if (todayPct < 80) streak = 0;
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Streak de Disciplina</p>
              <span style={{color:"#333",fontSize:"11px"}}>dias consecutivos ≥80%</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"14px"}}>
              <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"20px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Streak Atual</p>
                <p style={{margin:0,color:streak>=7?"#27b589":streak>=3?"#f59e0b":"#c94a4a",fontSize:"36px",fontWeight:"800",fontFamily:"monospace"}}>{streak}</p>
                <p style={{margin:0,color:"#444",fontSize:"11px"}}>dias seguidos</p>
              </div>
              <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"20px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Recorde</p>
                <p style={{margin:0,color:"#f59e0b",fontSize:"36px",fontWeight:"800",fontFamily:"monospace"}}>{maxStreak}</p>
                <p style={{margin:0,color:"#444",fontSize:"11px"}}>dias seguidos</p>
              </div>
              <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"20px",textAlign:"center"}}>
                <p style={{margin:"0 0 4px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Dias Salvos</p>
                <p style={{margin:0,color:"#aaa",fontSize:"36px",fontWeight:"800",fontFamily:"monospace"}}>{savedDays.length}</p>
                <p style={{margin:0,color:"#444",fontSize:"11px"}}>total registrado</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEÇÃO: ANÁLISE POR HORÁRIO ── */}
      {allTrades.filter(t=>t.horario).length >= 3 && (() => {
        const horarioStats = {};
        allTrades.filter(t=>t.horario).forEach(t => {
          const hora = t.horario.slice(0,2)+"h";
          if (!horarioStats[hora]) horarioStats[hora] = {wins:0,total:0,resultado:0,pontos:0};
          horarioStats[hora].total++;
          horarioStats[hora].resultado += t.resultado||0;
          horarioStats[hora].pontos    += t.pontos||0;
          if (t.tipo==="WIN") horarioStats[hora].wins++;
        });
        const horaList = Object.entries(horarioStats).sort(([a],[b])=>a.localeCompare(b));
        const maxRes = Math.max(1, ...horaList.map(([,s])=>Math.abs(s.resultado)));
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Performance por Horário</p>
              <span style={{color:"#333",fontSize:"11px"}}>baseado nas operações registradas</span>
            </div>
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {horaList.map(([hora,s])=>{
                  const wr = Math.round((s.wins/s.total)*100);
                  const pos = s.resultado >= 0;
                  const barW = Math.round((Math.abs(s.resultado)/maxRes)*100);
                  const cor = wr>=60?"#27b589":wr>=40?"#f59e0b":"#c94a4a";
                  return (
                    <div key={hora} style={{display:"flex",alignItems:"center",gap:"12px"}}>
                      <span style={{width:"36px",color:"#aaa",fontSize:"12px",fontFamily:"monospace",fontWeight:"700",flexShrink:0}}>{hora}</span>
                      <div style={{width:"40px",textAlign:"center",flexShrink:0}}>
                        <span style={{fontSize:"11px",fontWeight:"700",color:cor}}>{wr}%</span>
                        <p style={{margin:0,color:"#444",fontSize:"9px"}}>{s.total} ops</p>
                      </div>
                      <div style={{flex:1,height:"3px",background:"#1a1a2e",borderRadius:"2px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:barW+"%",background:pos?"#27b589":"#c94a4a",borderRadius:"4px"}}/>
                      </div>
                      <span style={{width:"72px",textAlign:"right",fontSize:"12px",fontWeight:"700",fontFamily:"monospace",color:pos?"#27b589":"#c94a4a",flexShrink:0}}>
                        {pos?"+":""}R$ {s.resultado.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEÇÃO: CURVA DE CAPITAL POR ESTRATÉGIA ── */}
      {Object.keys(estratStats).length >= 2 && (() => {
        const colors2 = ["#00d4aa","#0099ff","#f59e0b","#a78bfa","#f472b6","#34d399","#fb923c"];
        const estratDays = {};
        filtered.forEach(([d,e]) => {
          (e.trades||[]).forEach(t => {
            const n = t.estrategia||"Sem nome";
            if (!estratDays[n]) estratDays[n] = {};
            if (!estratDays[n][d]) estratDays[n][d] = 0;
            estratDays[n][d] += (t.resultado||0);
          });
        });
        const allDates = [...new Set(filtered.map(([d])=>d))].sort();
        if (allDates.length < 2) return null;
        const estratNames = Object.keys(estratDays);
        const curves = estratNames.map((n,i) => {
          let acc = 0;
          const pts = allDates.map(d => { acc += estratDays[n][d]||0; return acc; });
          return { n, pts, color: colors2[i%colors2.length] };
        });
        const W=600, H=140, PT=10, PB=10, PL=10, PR=10;
        const allVals = curves.flatMap(c=>c.pts);
        const minV = Math.min(0,...allVals), maxV = Math.max(1,...allVals);
        const range = maxV-minV||1;
        const xStep = (W-PL-PR)/(allDates.length-1||1);
        const yScale = v => PT + (H-PT-PB)*(1-(v-minV)/range);
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Curva de Capital por Estratégia</p>
            </div>
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px"}}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block",marginTop:"12px",marginBottom:"14px"}}>
                <line x1={PL} y1={yScale(0)} x2={W-PR} y2={yScale(0)} stroke="#ffffff0a" strokeWidth="1"/>
                {curves.map(({n,pts,color})=>{
                  const path = pts.map((v,i)=>`${i===0?"M":"L"}${PL+i*xStep},${yScale(v)}`).join(" ");
                  return <path key={n} d={path} fill="none" stroke={color} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>;
                })}
              </svg>
              <div style={{display:"flex",flexWrap:"wrap",gap:"12px"}}>
                {curves.map(({n,pts,color})=>{
                  const last = pts[pts.length-1]||0;
                  return (
                    <div key={n} style={{display:"flex",alignItems:"center",gap:"6px",cursor:"pointer"}} onClick={()=>setPanelEst(n)}>
                      <div style={{width:"10px",height:"10px",borderRadius:"50%",background:color,flexShrink:0}}/>
                      <span style={{fontSize:"12px",color:"#aaa"}}>{n}</span>
                      <span style={{fontSize:"12px",fontWeight:"700",fontFamily:"monospace",color:last>=0?"#27b589":"#c94a4a"}}>{last>=0?"+":""}R${last.toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEÇÃO: SEQUÊNCIA WIN/LOSS POR ESTRATÉGIA ── */}
      {Object.keys(estratStats).length > 0 && (() => {
        const seqStats = {};
        Object.keys(estratStats).forEach(n => {
          const ops = filtered.flatMap(([,e])=>(e.trades||[]).filter(t=>t.estrategia===n));
          if (ops.length < 3) return;
          let maxWin=0,maxLoss=0,curWin=0,curLoss=0,curStreak=0,curType="";
          ops.forEach(t => {
            if (t.tipo==="WIN") { curWin++; curLoss=0; if(curWin>maxWin)maxWin=curWin; }
            else { curLoss++; curWin=0; if(curLoss>maxLoss)maxLoss=curLoss; }
          });
          // current streak
          for (let i=ops.length-1;i>=0;i--) {
            if (i===ops.length-1) { curType=ops[i].tipo; curStreak=1; }
            else if (ops[i].tipo===curType) curStreak++;
            else break;
          }
          seqStats[n] = { maxWin, maxLoss, curStreak, curType, total:ops.length };
        });
        const entries2 = Object.entries(seqStats);
        if (entries2.length === 0) return null;
        const colors2 = ["#00d4aa","#0099ff","#f59e0b","#a78bfa","#f472b6","#34d399","#fb923c"];
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Sequências WIN/LOSS por Estratégia</p>
              <span style={{color:"#333",fontSize:"11px"}}>detecta fases de cada setup</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"12px"}}>
              {entries2.map(([n,s],i)=>{
                const cor = colors2[i%colors2.length];
                const streakColor = s.curType==="WIN"?"#27b589":"#c94a4a";
                const alert = s.curLoss >= 3 || (s.curType==="LOSS" && s.curStreak>=2);
                return (
                  <div key={n} style={{background:"#0d0d14",border:"1px solid "+(alert?"#e0565633":"#1a1a2e"),borderRadius:"14px",padding:"16px",cursor:"pointer"}}
                    onClick={()=>setPanelEst(n)}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                      <div style={{padding:"3px 7px",borderRadius:"5px",background:cor+"22",border:"1px solid "+cor+"33"}}>
                        <span style={{color:cor,fontSize:"10px",fontWeight:"800"}}>{n.slice(0,3).toUpperCase()}</span>
                      </div>
                      <span style={{color:"#aaa",fontSize:"12px",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n}</span>
                      {alert && <span style={{fontSize:"10px",color:"#c94a4a"}}>⚠</span>}
                    </div>
                    <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                      <div style={{flex:1,textAlign:"center",background:"rgba(45,201,154,0.08)",borderRadius:"8px",padding:"8px 4px"}}>
                        <p style={{margin:0,color:"#27b589",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{s.maxWin}</p>
                        <p style={{margin:0,color:"#444",fontSize:"9px",textTransform:"uppercase"}}>Max WIN</p>
                      </div>
                      <div style={{flex:1,textAlign:"center",background:"rgba(224,86,86,0.08)",borderRadius:"8px",padding:"8px 4px"}}>
                        <p style={{margin:0,color:"#c94a4a",fontSize:"18px",fontWeight:"800",fontFamily:"monospace"}}>{s.maxLoss}</p>
                        <p style={{margin:0,color:"#444",fontSize:"9px",textTransform:"uppercase"}}>Max LOSS</p>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"11px",color:"#555"}}>Agora:</span>
                      <span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:streakColor+"18",color:streakColor}}>{s.curStreak}× {s.curType}</span>
                      {s.curType==="LOSS"&&s.curStreak>=2&&<span style={{fontSize:"10px",color:"#c94a4a"}}>— revisar setup</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* LINHA 6: Diagnóstico IA full width */}
      {allTrades.length >= 3 && <DiagnosticoIA trades={allTrades} entries={filtered} totalResult={totalResult} winRate={winRate} mediaVenc={mediaVenc} mediaPerd={mediaPerd} rr={rr} estratStats={estratStats} diasOp={diasOp}/>}

      {/* PAINEL DRILL-DOWN — WinRate ou Resultado */}
      {panelDrill && (() => {
        const isWR = panelDrill === "winrate";
        const title = isWR ? "Operações do Período" : "Resultado Detalhado";
        const tradesList = isWR
          ? [...allTrades].map((t,i)=>({...t,_idx:i}))
          : [...allTrades].map((t,i)=>({...t,_idx:i})).sort((a,b)=>(b.resultado||0)-(a.resultado||0));
        const EMOCAO_COLORS = {"Focado":"#27b589","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#c94a4a","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
        return (
          <>
            <div onClick={()=>setPanelDrill(null)} style={{position:"fixed",inset:0,zIndex:399,background:"rgba(0,0,0,0.4)"}}/>
            <div style={{position:"fixed",top:0,right:0,bottom:0,width:"400px",background:"#0a0a12",borderLeft:"1px solid #1a1a2e",zIndex:400,display:"flex",flexDirection:"column",boxShadow:"-8px 0 40px rgba(0,0,0,0.6)",animation:"slideIn 0.25s ease"}}>
              <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
              {/* Header */}
              <div style={{padding:"20px",borderBottom:"1px solid #1a1a2e",flexShrink:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                  <p style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{title}</p>
                  <button onClick={()=>setPanelDrill(null)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"20px",padding:"2px 6px",lineHeight:1}}>×</button>
                </div>
                {/* Resumo */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                  <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                    <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Total</p>
                    <p style={{margin:0,color:totalResult>=0?"#27b589":"#c94a4a",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{totalResult>=0?"+":""}R${Math.abs(totalResult).toFixed(0)}</p>
                  </div>
                  <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                    <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Win Rate</p>
                    <p style={{margin:0,color:winRate>=60?"#27b589":winRate>=40?"#f59e0b":"#c94a4a",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{winRate||0}%</p>
                  </div>
                  <div style={{background:"#12121e",borderRadius:"8px",padding:"10px 12px"}}>
                    <p style={{margin:"0 0 2px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Trades</p>
                    <p style={{margin:0,color:"#ccc",fontSize:"16px",fontWeight:"800",fontFamily:"monospace"}}>{allTrades.length}</p>
                  </div>
                </div>
              </div>
              {/* Filtro WIN/LOSS */}
              {isWR && (
                <div style={{padding:"12px 20px",borderBottom:"1px solid #1a1a2e",display:"flex",gap:"8px",flexShrink:0}}>
                  {["Todos","WIN","LOSS"].map(f=>(
                    <button key={f} onClick={()=>setPanelDrill(f==="Todos"?"winrate":f==="WIN"?"winrate-win":"winrate-loss")}
                      style={{padding:"5px 14px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"Inter,sans-serif",
                        background:panelDrill===("winrate"+(f==="WIN"?"-win":f==="LOSS"?"-loss":""))&&f!=="Todos"?"#2dc99a22":panelDrill==="winrate"&&f==="Todos"?"#1a1a2e22":"transparent",
                        color:f==="WIN"?"#27b589":f==="LOSS"?"#c94a4a":"#888"}}>
                      {f} {f==="WIN"?wins:f==="LOSS"?allTrades.length-wins:""}
                    </button>
                  ))}
                </div>
              )}
              {/* Lista */}
              <div style={{flex:1,overflowY:"auto",padding:"14px 20px"}}>
                {tradesList
                  .filter(t => panelDrill==="winrate-win"?t.tipo==="WIN":panelDrill==="winrate-loss"?t.tipo==="LOSS":true)
                  .map((t,i)=>(
                  <div key={i} style={{padding:"11px 14px",borderRadius:"10px",background:"#0d0d14",border:"1px solid #1a1a2e",marginBottom:"8px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:t.estrategia||t.observacao?"6px":"0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{padding:"3px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(45,201,154,0.15)":"rgba(224,86,86,0.15)",color:t.tipo==="WIN"?"#27b589":"#c94a4a"}}>{t.tipo}</span>
                        <span style={{color:"#555",fontSize:"12px"}}>{t.mercado}</span>
                        {t.estrategia&&<span style={{color:"#0099ff",fontSize:"11px",background:"rgba(0,153,255,0.1)",padding:"2px 7px",borderRadius:"4px",cursor:"pointer"}}
                          onClick={e=>{e.stopPropagation();setPanelDrill(null);setPanelEst(t.estrategia);}}>{t.estrategia}</span>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        {t.pontos!=null&&<p style={{margin:0,color:"#aaa",fontSize:"11px",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</p>}
                        {t.resultado!=null&&<p style={{margin:0,color:t.resultado>=0?"#27b589":"#c94a4a",fontSize:"13px",fontFamily:"monospace",fontWeight:"700"}}>{t.resultado>=0?"+":""}R$ {t.resultado.toFixed(2)}</p>}
                      </div>
                    </div>
                    {t.observacao&&<p style={{margin:0,color:"#444",fontSize:"11px",fontStyle:"italic"}}>"{t.observacao}"</p>}
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
function AlertasInteligentes({ trades, entries, winRate, diasOp }) {
  if (!trades || trades.length < 3) return null;

  const alertas = [];
  const today = new Date().toISOString().slice(0,10);

  // ── 1. OVERTRADING (max 5 trades/dia)
  const tradesHoje = entries.filter(([d])=>d===today).flatMap(([,e])=>e.trades||[]);
  if (tradesHoje.length >= 5) {
    alertas.push({ tipo:"critico", msg:`⛔ Overtrading: ${tradesHoje.length} trades hoje. Feche a plataforma — cada entrada extra é uma aposta.` });
  } else if (tradesHoje.length >= 4) {
    alertas.push({ tipo:"aviso", msg:`🔔 ${tradesHoje.length} trades hoje. Atenção ao limite diário.` });
  }

  // ── 2. WIN RATE abaixo do mínimo profissional
  if (winRate !== null && winRate < 40 && trades.length >= 5) {
    alertas.push({ tipo:"critico", msg:`⚠️ Win rate em ${winRate}% — abaixo do mínimo profissional (40%). Pare e revise o setup.` });
  } else if (winRate !== null && winRate < 50 && trades.length >= 8) {
    alertas.push({ tipo:"aviso", msg:`📉 Win rate em ${winRate}% — abaixo de 50%. Monitore de perto.` });
  }

  // ── 3. DRAWDOWN DIÁRIO — dias negativos consecutivos
  const sortedDays = [...entries].sort(([a],[b])=>b.localeCompare(a));
  let negStreak = 0;
  for (const [,e] of sortedDays) {
    const tot = (e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0)+(e.totalAmericano||0);
    if (tot < 0) negStreak++; else break;
  }
  if (negStreak >= 3) {
    alertas.push({ tipo:"critico", msg:`🔴 ${negStreak} dias negativos consecutivos — reduza o tamanho das posições ou pare por hoje.` });
  } else if (negStreak >= 2) {
    alertas.push({ tipo:"aviso", msg:`🟡 2 dias negativos seguidos — revisite o plano antes de operar amanhã.` });
  }

  // ── 4. ESTRATÉGIA COM BAIXA ASSERTIVIDADE
  const estStats = {};
  trades.forEach(t => {
    const n = t.estrategia||"Sem nome";
    if (!estStats[n]) estStats[n] = {wins:0,total:0,resultado:0};
    estStats[n].total++;
    estStats[n].resultado += t.resultado||0;
    if (t.tipo==="WIN") estStats[n].wins++;
  });
  Object.entries(estStats).forEach(([n,s]) => {
    if (s.total >= 3) {
      const ass = Math.round((s.wins/s.total)*100);
      if (ass < 35) alertas.push({ tipo:"critico", msg:`⛔ "${n}" com ${ass}% de acerto em ${s.total} ops — considere pausar este setup.` });
    }
  });

  // ── 5. RISCO × RETORNO NEGATIVO
  const wins = trades.filter(t=>t.tipo==="WIN" && t.resultado);
  const losses = trades.filter(t=>t.tipo==="LOSS" && t.resultado);
  if (wins.length >= 3 && losses.length >= 3) {
    const mediaW = wins.reduce((s,t)=>s+(t.resultado||0),0)/wins.length;
    const mediaL = Math.abs(losses.reduce((s,t)=>s+(t.resultado||0),0)/losses.length);
    const rr = mediaL > 0 ? (mediaW/mediaL) : 0;
    if (rr < 0.8) alertas.push({ tipo:"critico", msg:`📊 RR médio de ${rr.toFixed(2)}:1 — você está ganhando menos do que perdendo. Revise alvos e stops.` });
    else if (rr < 1.2) alertas.push({ tipo:"aviso", msg:`📊 RR médio de ${rr.toFixed(2)}:1 — próximo do ponto de equilíbrio. Mire acima de 1.5:1.` });
  }

  // ── 6. EMOÇÃO DE RISCO no último dia
  const emocaoRisco = ["Ansioso","Frustrado","Revanche","Impaciente","Eufórico"];
  const ultimoDia = [...entries].sort(([a],[b])=>b.localeCompare(a))[0];
  if (ultimoDia) {
    const ruins = (ultimoDia[1].emocoes||[]).filter(e=>emocaoRisco.includes(e));
    if (ruins.length > 0) alertas.push({ tipo:"aviso", msg:`🧠 Você registrou "${ruins[0]}" — emoções de risco aumentam erros em 60%. Seja extra cauteloso.` });
  }

  // ── 7. SEQUÊNCIA LOSS — 3+ stops seguidos
  const ultimos = trades.slice(-5);
  let lossSeq = 0;
  for (let i=ultimos.length-1;i>=0;i--) {
    if (ultimos[i].tipo==="LOSS") lossSeq++; else break;
  }
  if (lossSeq >= 3) alertas.push({ tipo:"critico", msg:`🛑 ${lossSeq} stops seguidos — protocolo de pausa obrigatório. Espere 15 min antes de qualquer entrada.` });

  // ── 8. MELHOR HORÁRIO IGNORADO (se tem dados de horário)
  const tradesComHorario = trades.filter(t=>t.horario);
  if (tradesComHorario.length >= 5) {
    const horStats = {};
    tradesComHorario.forEach(t => {
      const h = t.horario.slice(0,2);
      if (!horStats[h]) horStats[h] = {wins:0,total:0};
      horStats[h].total++;
      if (t.tipo==="WIN") horStats[h].wins++;
    });
    const melhorHora = Object.entries(horStats).filter(([,s])=>s.total>=2).sort(([,a],[,b])=>b.wins/b.total-a.wins/a.total)[0];
    const piorHora   = Object.entries(horStats).filter(([,s])=>s.total>=2).sort(([,a],[,b])=>a.wins/a.total-b.wins/b.total)[0];
    if (melhorHora && piorHora && melhorHora[0]!==piorHora[0]) {
      const mWR = Math.round((melhorHora[1].wins/melhorHora[1].total)*100);
      const pWR = Math.round((piorHora[1].wins/piorHora[1].total)*100);
      if (mWR - pWR >= 30) {
        alertas.push({ tipo:"ok", msg:`⏰ Melhor horário: ${melhorHora[0]}h (${mWR}% WR). Evite operar às ${piorHora[0]}h (${pWR}% WR).` });
      }
    }
  }

  // ── 9. CONSISTÊNCIA — dias operados vs dias do período
  if (diasOp >= 5) {
    const totalTrades = trades.length;
    const mediaTradesDia = (totalTrades/diasOp).toFixed(1);
    if (parseFloat(mediaTradesDia) > 6) {
      alertas.push({ tipo:"aviso", msg:`📈 Média de ${mediaTradesDia} trades/dia — traders consistentes operam entre 2 e 5 entradas por dia.` });
    }
  }

  // ── 10. RESULTADO POSITIVO — reforço comportamental
  if (alertas.length === 0 || alertas.every(a=>a.tipo==="ok")) {
    const totalRes = trades.reduce((s,t)=>s+(t.resultado||0),0);
    if (totalRes > 0 && winRate && winRate >= 60) {
      alertas.push({ tipo:"ok", msg:`✅ Excelente desempenho no período. Win rate de ${winRate}% com resultado positivo. Mantenha a disciplina.` });
    } else {
      alertas.push({ tipo:"ok", msg:`✅ Nenhum alerta crítico no momento. Continue seguindo o plano.` });
    }
  }

  const cores = { critico:"#c94a4a", aviso:"#f59e0b", ok:"#27b589" };

  return (
    <div style={{flex:1,background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"16px 18px",minWidth:"240px",marginBottom:"36px"}}>
      <p style={{margin:"0 0 12px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:"700"}}>Alertas Inteligentes</p>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {alertas.slice(0,5).map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"9px 12px",borderRadius:"8px",background:cores[a.tipo]+"0d",border:"1px solid "+cores[a.tipo]+"33"}}>
            <p style={{margin:0,color:"#f0f0f0",fontSize:"13px",lineHeight:"1.6"}}>{a.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;

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
    }).join("\n");

    const emocaoResumo = Object.entries(emocaoStats).map(([em,s]) => {
      const media = (s.resultado/s.dias).toFixed(2);
      return `${em}: ${s.dias} dias, resultado médio R$ ${media}`;
    }).join("\n");

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
      const key = GROQ_KEY;
      if (!key) { setErro("Chave API não configurada no Vercel."); setLoading(false); return; }
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 600
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(()=>({}));
        setErro("Erro " + res.status + ": " + (errData?.error?.message || "Tente novamente."));
        setLoading(false); return;
      }
      const data = await res.json();
      const texto = data?.choices?.[0]?.message?.content;
      if (texto) setDiagnostico(texto);
      else setErro("Resposta vazia. Tente novamente.");
    } catch(e) {
      setErro("Erro: " + e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{background:"linear-gradient(135deg,rgba(0,212,170,0.05),rgba(0,153,255,0.05))",border:"1px solid #00d4aa33",borderRadius:"16px",padding:"24px"}}>
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
