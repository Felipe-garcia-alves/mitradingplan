import { useState } from "react";
import { CountUp, ProjectionChart } from "../components/ui";
import { listaCarteiras, bancaCarteira, totalSaques, curvaCarteira, resultadoDia } from "../lib/banca";

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
  const carteiras = listaCarteiras(config);
  const [cartKey, setCartKey] = useState(carteiras[0].key);
  const cart    = carteiras.find(c => c.key === cartKey) || carteiras[0];

  const cur     = cart.moeda;
  const color   = cart.cor;
  const bancaIn = cart.inicial;
  const bancaAt = bancaCarteira(entries, config, cart);  // já desconta saques
  const sacado  = totalSaques(config, cart.key);

  const sortedDays = Object.entries(entries).sort(([a],[b])=>a.localeCompare(b));
  const realPoints = curvaCarteira(entries, config, cart);  // cai na data de cada saque
  const proj       = gerarProjecao(bancaAt, 12, 0.08);
  const projPoints = [{val:bancaAt},...proj];
  const projSerie  = projPoints.map((p,i)=>({ label: i===0 ? "hoje" : "M"+i, val:p.val }));
  const lucro      = bancaAt + sacado - bancaIn; // resultado de trading
  const pctLucro   = bancaIn>0 ? (lucro/bancaIn)*100 : 0;
  const fmtC       = v => cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const nomeMercado = cart.curto;

  // Operacoes perdedoras
  const perdedoras = sortedDays.map(([d,e])=>({d,val:resultadoDia(e,cart)})).filter(x=>x.val<0)
    .sort((a,b)=>a.val-b.val).slice(0,5);
  const piorAbs = perdedoras.length ? Math.abs(perdedoras[0].val) : 1;

  const kpiCard  = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px", minWidth:0, display:"flex", flexDirection:"column", gap:"8px" };
  const kpiLabel = { margin:0, color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };
  const kpiValue = { margin:0, fontSize:"clamp(17px,1.6vw,23px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" };
  const kpiSub   = { margin:0, color:"var(--text-3)", fontSize:"11.5px" };

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:"16px", flexWrap:"wrap", marginBottom:"24px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Patrimônio</h1>
          <p style={{ margin:"4px 0 0", color:"#666", fontSize:"13px" }}>Evolução real dia a dia vs projeção</p>
        </div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
          {carteiras.map(c=>(
            <button key={c.key} onClick={()=>setCartKey(c.key)} className={"mtp-pill"+(cart.key===c.key?" active":"")} style={{"--pill":c.cor}}>{c.curto}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"14px", marginBottom:"14px" }}>
        <div style={kpiCard}>
          <p style={kpiLabel}>Banca inicial</p>
          <p style={{ ...kpiValue, color:"var(--text-2)" }}>{fmtC(bancaIn)}</p>
          <p style={kpiSub}>ponto de partida</p>
        </div>
        <div style={{ ...kpiCard, borderColor:color+"33" }}>
          <p style={kpiLabel}>Banca real atual</p>
          <p style={{ ...kpiValue, color, textShadow:"0 0 22px "+color+"44" }}><CountUp value={bancaAt} format={fmtC}/></p>
          <p style={{ ...kpiSub, color:lucro>=0?"var(--pos)":"var(--neg)", fontFamily:"var(--font-mono)" }}>{lucro>=0?"↑ +":"↓ -"}{Math.abs(pctLucro).toFixed(1)}% em trades</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Resultado acumulado</p>
          <p style={{ ...kpiValue, color:lucro>=0?"var(--pos)":"var(--neg)" }}><CountUp value={lucro} format={v=>(v<0?"-":"+")+fmtC(v)}/></p>
          <p style={kpiSub}>{sortedDays.length} dias registrados{sacado>0 && <span style={{ color:"#f5b941" }}> · {fmtC(sacado)} sacado</span>}</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Meta 12 meses</p>
          <p style={{ ...kpiValue, color:"var(--text)" }}><CountUp value={projPoints[12].val} format={fmtC}/></p>
          <p style={kpiSub}>projeção a 8% ao mês</p>
        </div>
      </div>

      {/* Grafico */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px 10px", marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap", marginBottom:"10px" }}>
          <p className="mtp-card-title">Evolução & Projeção · {nomeMercado}</p>
          <div style={{ display:"flex", gap:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
              <svg width="22" height="3"><line x1="0" y1="1.5" x2="22" y2="1.5" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></svg>
              <span style={{ color:"var(--text-2)", fontSize:"11.5px" }}>Banca real</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
              <svg width="22" height="3"><line x1="0" y1="1.5" x2="22" y2="1.5" stroke={color} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5,3"/></svg>
              <span style={{ color:"var(--text-3)", fontSize:"11.5px" }}>Projeção 8%/mês</span>
            </div>
          </div>
        </div>
        <ProjectionChart real={realPoints} proj={projSerie} base={bancaIn} color={color} cur={cur}/>
      </div>

      {/* Piores operacoes */}
      {perdedoras.length > 0 && (
        <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"14px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5470" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <p className="mtp-card-title">Piores dias · {nomeMercado}</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {perdedoras.map((op,i)=>(
              <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 110px minmax(0,1fr) auto", alignItems:"center", gap:"14px" }}>
                <span style={{ width:"24px", height:"24px", borderRadius:"7px", background:"rgba(255,84,112,0.1)", border:"1px solid #ff547033", color:"#ff7a90", fontSize:"11px", fontWeight:"800", fontFamily:"var(--font-mono)", display:"flex", alignItems:"center", justifyContent:"center" }}>{i+1}</span>
                <span style={{ color:"var(--text-2)", fontSize:"13px", fontFamily:"var(--font-mono)" }}>{formatDateFull(op.d)}</span>
                <div style={{ height:"4px", borderRadius:"4px", background:"var(--line)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:(Math.abs(op.val)/piorAbs*100)+"%", borderRadius:"4px", background:"linear-gradient(90deg,#ff547055,#ff5470)" }}/>
                </div>
                <span style={{ color:"#ff5470", fontSize:"13.5px", fontWeight:"700", fontFamily:"var(--font-mono)", textAlign:"right" }}>-{fmtC(op.val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {realPoints.length <= 1 && (
        <div style={{ padding:"20px", borderRadius:"12px", background:"rgba(255,255,255,0.01)", border:"1px solid var(--line)", textAlign:"center" }}>
          <p style={{ margin:0, color:"var(--text-3)", fontSize:"13px" }}>Registre operações no Diário para a curva real aparecer.</p>
        </div>
      )}
    </div>
  );
}
