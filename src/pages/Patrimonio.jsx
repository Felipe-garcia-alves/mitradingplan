import { useState } from "react";

function gerarProjecao(base, meses, taxa) {
  const rows=[]; let b=base;
  for(let i=1;i<=meses;i++){
    const meta=parseFloat((b*(1+taxa)).toFixed(2));
    rows.push({val:meta}); b=meta;
  }
  return rows;
}

function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

export default function Patrimonio({ entries, config }) {
  const [market,  setMarket]  = useState("b3");
  const [tooltip, setTooltip] = useState(null);

  const bancaInicialB3    = config?.bancaB3    || 3000;
  const bancaInicialForex = config?.bancaForex || 200;
  const bancaRealB3       = Object.values(entries).reduce((s,e)=>s+(e.b3||0),    bancaInicialB3);
  const bancaRealForex    = Object.values(entries).reduce((s,e)=>s+(e.forex||0), bancaInicialForex);

  const cur     = market==="b3" ? "R$" : "$";
  const color   = market==="b3" ? "#00d4aa" : "#f59e0b";
  const bancaAt = market==="b3" ? bancaRealB3 : bancaRealForex;
  const bancaIn = market==="b3" ? bancaInicialB3 : bancaInicialForex;

  const sortedDays = Object.entries(entries).sort(([a],[b])=>a.localeCompare(b));
  let acc = bancaIn;
  const realPoints = [
    {d:"Inicio",val:bancaIn,label:"Inicio"},
    ...sortedDays.map(([d,e])=>{
      acc += market==="b3" ? (e.b3||0) : (e.forex||0);
      return {d, val:parseFloat(acc.toFixed(2)), label:formatDateFull(d)};
    })
  ];
  const proj       = gerarProjecao(bancaAt, 12, 0.08);
  const projPoints = [{val:bancaAt},...proj];

  const W=720,H=320,PL=72,PR=24,PT=20,PB=48,iW=W-PL-PR,iH=H-PT-PB;
  const allVals=[...realPoints.map(p=>p.val),...projPoints.map(p=>p.val)];
  const rawMin=Math.min(...allVals), rawMax=Math.max(...allVals);
  const pad=(rawMax-rawMin)*0.1||bancaIn*0.1;
  const yMin=rawMin-pad, yMax=rawMax+pad;
  const xR=(i)=>PL+(i/Math.max(realPoints.length-1,1))*iW;
  const xP=(i)=>PL+(i/12)*iW;
  const yS=(v)=>PT+(1-(v-yMin)/(yMax-yMin))*iH;
  const yTicks=Array.from({length:5},(_,i)=>yMin+(i/4)*(yMax-yMin));
  const fmtV=(v)=>v>=1000?cur+" "+(v/1000).toFixed(1)+"k":cur+" "+v.toFixed(0);
  const realPath=realPoints.map((p,i)=>(i===0?"M":"L")+xR(i).toFixed(1)+","+yS(p.val).toFixed(1)).join(" ");
  const projPath=projPoints.map((p,i)=>(i===0?"M":"L")+xP(i).toFixed(1)+","+yS(p.val).toFixed(1)).join(" ");
  const areaPath=realPoints.length>1?realPath+" L"+xR(realPoints.length-1).toFixed(1)+","+(PT+iH)+" L"+PL+","+(PT+iH)+" Z":"";
  const xLabels=["Hoje","M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];

  // Operacoes perdedoras
  const perdedoras = sortedDays.filter(([,e])=>(market==="b3"?(e.b3||0):(e.forex||0))<0)
    .map(([d,e])=>({d,val:market==="b3"?e.b3:e.forex}))
    .sort((a,b)=>a.val-b.val).slice(0,5);

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Curva de Patrimonio</h1>
        <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Evolucao real dia a dia vs projecao — passe o mouse nos pontos</p>
      </div>

      <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
        {["b3","forex"].map(m=>(
          <button key={m} onClick={()=>setMarket(m)} style={{ padding:"8px 18px", borderRadius:"8px", cursor:"pointer", fontWeight:"600", fontSize:"13px", border:"none", background:market===m?(m==="b3"?"#00d4aa":"#f59e0b"):"rgba(255,255,255,0.05)", color:market===m?"#000":"#777", fontFamily:"Inter,sans-serif" }}>
            {m==="b3"?"🇧🇷 Mini Indice":"🌍 Forex"}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display:"flex", gap:"20px", marginBottom:"12px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          <svg width="28" height="3"><line x1="0" y1="1.5" x2="28" y2="1.5" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></svg>
          <span style={{ color:"#aaa", fontSize:"12px" }}>Banca real</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          <svg width="28" height="3"><line x1="0" y1="1.5" x2="28" y2="1.5" stroke="#ffffff22" strokeWidth="2" strokeDasharray="5,3"/></svg>
          <span style={{ color:"#666", fontSize:"12px" }}>Projecao 8%/mes</span>
        </div>
      </div>

      {/* Grafico */}
      <div style={{ position:"relative", background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"8px", overflow:"hidden", marginBottom:"20px" }}>
        <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%", height:"auto", display:"block", cursor:"crosshair" }} onMouseLeave={()=>setTooltip(null)}>
          {yTicks.map((v,i)=>(
            <g key={i}>
              <line x1={PL} y1={yS(v)} x2={W-PR} y2={yS(v)} stroke="#ffffff07" strokeWidth="1"/>
              <text x={PL-6} y={yS(v)+4} textAnchor="end" fill="#888" fontSize="11" fontFamily="JetBrains Mono,monospace">{fmtV(v)}</text>
            </g>
          ))}
          {xLabels.map((lbl,i)=>(
            <g key={i}>
              <line x1={xP(i)} y1={PT} x2={xP(i)} y2={PT+iH} stroke="#ffffff05" strokeWidth="1"/>
              <text x={xP(i)} y={PT+iH+16} textAnchor="middle" fill="#888" fontSize="11" fontFamily="JetBrains Mono,monospace">{lbl}</text>
            </g>
          ))}
          <line x1={PL} y1={yS(bancaIn)} x2={W-PR} y2={yS(bancaIn)} stroke="#ffffff10" strokeWidth="1" strokeDasharray="2,6"/>
          {areaPath && <path d={areaPath} fill={color+"0d"}/>}
          <path d={projPath} fill="none" stroke="#ffffff20" strokeWidth="1.5" strokeDasharray="6,4" strokeLinejoin="round"/>
          {realPoints.length>1 && <path d={realPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
          {realPoints.map((p,i)=>(
            <circle key={i} cx={xR(i)} cy={yS(p.val)} r="4" fill={p.val>=bancaIn?color:"#ff4d4d"} stroke="#111118" strokeWidth="2" style={{ cursor:"pointer" }}
              onMouseEnter={ev=>{
                const rect=ev.currentTarget.closest("svg").getBoundingClientRect();
                const scale=rect.width/W;
                setTooltip({x:xR(i)*scale,y:yS(p.val)*scale,label:p.label,val:p.val,diff:parseFloat((p.val-bancaIn).toFixed(2))});
              }}
            />
          ))}
        </svg>
        {tooltip && (
          <div style={{ position:"absolute", left:tooltip.x+12, top:Math.max(8,tooltip.y-48), background:"#0d0d14", border:"1px solid "+color+"44", borderRadius:"10px", padding:"10px 14px", pointerEvents:"none", whiteSpace:"nowrap", zIndex:10 }}>
            <p style={{ margin:"0 0 2px", color:"#777", fontSize:"10px" }}>{tooltip.label}</p>
            <p style={{ margin:"0 0 2px", color, fontWeight:"700", fontSize:"14px", fontFamily:"JetBrains Mono,monospace" }}>{cur} {tooltip.val.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p style={{ margin:0, color:tooltip.diff>=0?"#00d4aa":"#ff4d4d", fontSize:"11px", fontFamily:"JetBrains Mono,monospace" }}>{tooltip.diff>=0?"+":""}{cur} {Math.abs(tooltip.diff).toFixed(2)} vs inicial</p>
          </div>
        )}
      </div>

      {/* Cards resumo */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"20px" }}>
        {[
          { label:"Banca inicial",    val:cur+" "+bancaIn.toLocaleString("pt-BR",{minimumFractionDigits:2}),         color:"#666" },
          { label:"Banca real atual", val:cur+" "+bancaAt.toLocaleString("pt-BR",{minimumFractionDigits:2}),         color },
          { label:"Meta 12 meses",    val:cur+" "+projPoints[12].val.toLocaleString("pt-BR",{minimumFractionDigits:2}), color:"#aaa" },
        ].map((s,i)=>(
          <div key={i} style={{ padding:"14px", borderRadius:"12px", background:"#111118", border:"1px solid #1a1a2e", textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{s.label}</p>
            <p style={{ margin:0, color:s.color, fontWeight:"700", fontSize:"14px", fontFamily:"JetBrains Mono,monospace" }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Piores operacoes */}
      {perdedoras.length > 0 && (
        <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"20px" }}>
          <p style={{ margin:"0 0 14px", color:"#ff4d4d", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>⚠️ Piores operacoes — {market==="b3"?"B3":"Forex"}</p>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {perdedoras.map((op,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:"8px", background:"rgba(255,77,77,0.04)", border:"1px solid #ff4d4d18" }}>
                <span style={{ color:"#888", fontSize:"13px" }}>{formatDateFull(op.d)}</span>
                <span style={{ color:"#ff4d4d", fontSize:"14px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{cur} {op.val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {realPoints.length <= 1 && (
        <div style={{ padding:"20px", borderRadius:"12px", background:"rgba(255,255,255,0.01)", border:"1px solid #1a1a2e", textAlign:"center" }}>
          <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Registre operacoes no Diario para a curva real aparecer.</p>
        </div>
      )}
    </div>
  );
}
