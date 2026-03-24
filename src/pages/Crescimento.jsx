import { useState } from "react";

const MONTH_NAMES = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function monthKey(s) { return s.slice(0,7); }
function formatMonthLabel(s) { const p=s.split("-"); return MONTH_NAMES[parseInt(p[1])-1]+" "+p[0]; }

function gerarProjecao(base, meses, taxa) {
  const rows=[]; let b=base;
  for(let i=1;i<=meses;i++){
    const meta=parseFloat((b*(1+taxa)).toFixed(2));
    rows.push({mes:i,metaFinal:meta,lucroMes:parseFloat((meta-b).toFixed(2))});
    b=meta;
  }
  return rows;
}

export default function Crescimento({ entries, config }) {
  const [market, setMarket] = useState("b3");
  const bancaInicialCripto = 1000;
  const bancaInicialAmericano = 500;
  const [taxa,   setTaxa]   = useState(8);

  const bancaInicialB3    = config?.bancaB3    || 3000;
  const bancaInicialForex = config?.bancaForex || 200;
  const bancaRealB3       = Object.values(entries).reduce((s,e)=>s+(e.totalB3||0),    bancaInicialB3);
  const bancaRealForex    = Object.values(entries).reduce((s,e)=>s+(e.totalForex||0), bancaInicialForex);
  const bancaRealCripto   = Object.values(entries).reduce((s,e)=>s+(e.totalCripto||0), bancaInicialCripto);
  const bancaRealAmericano= Object.values(entries).reduce((s,e)=>s+(e.totalAmericano||0), bancaInicialAmericano);

  const cur     = market==="b3" ? "R$" : "$";
  const color   = market==="b3" ? "#00d4aa" : market==="forex" ? "#f59e0b" : market==="cripto" ? "#a78bfa" : "#34d399";
  const bancaAt = market==="b3" ? bancaRealB3 : market==="forex" ? bancaRealForex : market==="cripto" ? bancaRealCripto : bancaRealAmericano;
  const bancaIn = market==="b3" ? bancaInicialB3 : market==="forex" ? bancaInicialForex : market==="cripto" ? bancaInicialCripto : bancaInicialAmericano;
  const projecao= gerarProjecao(bancaAt, 12, taxa/100);

  const byMonth={};
  Object.entries(entries).forEach(([d,e])=>{
    const mk=monthKey(d);
    if(!byMonth[mk]) byMonth[mk]={b3:0,forex:0,cripto:0,americano:0};
    byMonth[mk].b3+=e.totalB3||0; byMonth[mk].forex+=e.totalForex||0; byMonth[mk].cripto+=e.totalCripto||0; byMonth[mk].americano+=e.totalAmericano||0;
  });
  let accB3=bancaInicialB3, accFx=bancaInicialForex, accCr=bancaInicialCripto, accAm=bancaInicialAmericano;
  const realRows=Object.keys(byMonth).sort().map(mk=>{
    accB3+=byMonth[mk].b3; accFx+=byMonth[mk].forex; accCr+=byMonth[mk].cripto||0; accAm+=byMonth[mk].americano||0;
    return {mk,bancaB3:parseFloat(accB3.toFixed(2)),bancaForex:parseFloat(accFx.toFixed(2)),bancaCripto:parseFloat(accCr.toFixed(2)),bancaAmericano:parseFloat(accAm.toFixed(2))};
  });

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Crescimento</h1>
        <p style={{ margin:"4px 0 0", color:"#666", fontSize:"13px" }}>Real vs projetado — calculado a partir da banca atual</p>
      </div>

      <div style={{ display:"flex", gap:"10px", marginBottom:"16px", alignItems:"center", flexWrap:"wrap" }}>
        {[["b3","B3"],["forex","Forex"],["cripto","Cripto"],["americano","Americano"]].map(([m,l])=>(
          <button key={m} onClick={()=>setMarket(m)} style={{ padding:"8px 18px", borderRadius:"8px", cursor:"pointer", fontWeight:"600", fontSize:"13px", border:"none", background:market===m?color:"rgba(255,255,255,0.05)", color:market===m?"#000":"#777", fontFamily:"Inter,sans-serif" }}>
            {l}
          </button>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginLeft:"auto" }}>
          <label style={{ color:"#777", fontSize:"12px" }}>Taxa mensal:</label>
          <input type="number" value={taxa} min="1" max="50" onChange={e=>setTaxa(Number(e.target.value))} style={{ width:"60px", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"6px 10px", color:"#f0f0f0", fontSize:"14px", fontWeight:"700", outline:"none", textAlign:"center", fontFamily:"JetBrains Mono,monospace" }}/>
          <span style={{ color:"#777", fontSize:"12px" }}>%</span>
        </div>
      </div>

      <div style={{ padding:"12px 16px", borderRadius:"10px", background:"rgba(0,212,170,0.05)", border:"1px solid #00d4aa18", marginBottom:"20px", display:"flex", gap:"8px", alignItems:"center" }}>
        <span>🔄</span>
        <p style={{ margin:0, color:"#00d4aa88", fontSize:"12px" }}>Projecao parte da <strong style={{ color:"#00d4aa" }}>banca real atual</strong> ({cur} {bancaAt.toLocaleString("pt-BR",{minimumFractionDigits:2})}) com {taxa}% ao mes.</p>
      </div>

      {/* Cards status */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"20px" }}>
        {[
          { label:"Banca inicial",    val:cur+" "+bancaIn.toLocaleString("pt-BR",{minimumFractionDigits:2}),         color:"#666" },
          { label:"Banca real hoje",  val:cur+" "+bancaAt.toLocaleString("pt-BR",{minimumFractionDigits:2}),         color },
          { label:"Meta 12 meses",    val:cur+" "+projecao[11]?.metaFinal.toLocaleString("pt-BR",{minimumFractionDigits:2}), color:"#aaa" },
        ].map((s,i)=>(
          <div key={i} style={{ padding:"14px", borderRadius:"12px", background:"#111118", border:"1px solid #1a1a2e", textAlign:"center" }}>
            <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{s.label}</p>
            <p style={{ margin:0, color:s.color, fontSize:i===1?"20px":"16px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Lista meses */}
      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {projecao.map((p,i)=>{
          const real      = realRows[i];
          const realBanca = market==="b3" ? real?.bancaB3 : market==="forex" ? real?.bancaForex : market==="cripto" ? real?.bancaCripto : real?.bancaAmericano;
          const delta     = realBanca!==undefined ? realBanca-p.metaFinal : null;
          const aheadRow  = delta!==null && delta>=0;
          return (
            <div key={i} style={{ borderRadius:"12px", padding:"14px 18px", background:"#111118", border:"1px solid "+(real?(aheadRow?"#00d4aa18":"#ff4d4d18"):"#1a1a2e"), opacity:!real?0.7:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ minWidth:"80px" }}>
                  <p style={{ margin:0, color:real?"#f0f0f0":"#666", fontSize:"13px", fontWeight:"600" }}>{real?formatMonthLabel(real.mk):"Mes "+(i+1)}</p>
                  {!real && <p style={{ margin:0, color:"#555", fontSize:"11px" }}>futuro</p>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 1px", color:"#555", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.8px" }}>Meta projetada</p>
                  <p style={{ margin:0, color:"#bbb", fontSize:"13px", fontFamily:"JetBrains Mono,monospace" }}>
                    {cur} {p.metaFinal.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                    <span style={{ color:"#555", fontSize:"11px", marginLeft:"6px" }}>(+{cur} {p.lucroMes.toFixed(2)})</span>
                  </p>
                </div>
                <div style={{ textAlign:"right" }}>
                  {real ? (
                    <>
                      <p style={{ margin:"0 0 1px", color:"#555", fontSize:"10px", textTransform:"uppercase", letterSpacing:"0.8px" }}>Real</p>
                      <p style={{ margin:0, color, fontSize:"14px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>
                        {cur} {realBanca.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                        <span style={{ color:aheadRow?"#00d4aa66":"#ff4d4d66", fontSize:"11px", marginLeft:"6px" }}>{aheadRow?"▲":"▼"}{Math.abs(delta).toFixed(2)}</span>
                      </p>
                    </>
                  ) : <p style={{ margin:0, color:"#444", fontSize:"12px" }}>—</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop:"16px", padding:"12px 16px", borderRadius:"10px", background:"rgba(255,255,255,0.01)", border:"1px solid #1a1a2e" }}>
        <p style={{ margin:0, color:"#555", fontSize:"12px", lineHeight:"1.6" }}>Projecao baseada em {taxa}% ao mes sobre a banca real atual. Atualiza automaticamente a cada registro no Diario.</p>
      </div>
    </div>
  );
}
