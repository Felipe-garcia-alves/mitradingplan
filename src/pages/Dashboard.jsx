import { alfa } from "../lib/cor.js";
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function fmtMoney(v, cur) { return (v>=0?"+":"")+cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2}); }

export default function Dashboard({ entries, config, setPagina }) {
  const bancaInicialB3    = config?.bancaB3    || 3000;
  const bancaInicialForex = config?.bancaForex || 200;
  const bancaRealB3       = Object.values(entries).reduce((s,e)=>s+(e.b3||0),    bancaInicialB3);
  const bancaRealForex    = Object.values(entries).reduce((s,e)=>s+(e.forex||0), bancaInicialForex);
  const lucroB3           = bancaRealB3 - bancaInicialB3;
  const lucroForex        = bancaRealForex - bancaInicialForex;

  const today   = todayKey();
  const curMon  = monthKey(today);
  const allDays = Object.entries(entries).sort(([a],[b])=>a.localeCompare(b));

  // Stats do mes atual
  const mesDays = allDays.filter(([d])=>monthKey(d)===curMon);
  const mesB3   = mesDays.reduce((s,[,e])=>s+(e.b3||0),0);
  const mesFx   = mesDays.reduce((s,[,e])=>s+(e.forex||0),0);
  const diasPos = mesDays.filter(([,e])=>(e.b3||0)+(e.forex||0)>0).length;
  const diasNeg = mesDays.filter(([,e])=>(e.b3||0)+(e.forex||0)<0).length;
  const winRate = (diasPos+diasNeg)>0 ? Math.round((diasPos/(diasPos+diasNeg))*100) : null;

  // Sequencia atual
  let streak = 0;
  for (let i=allDays.length-1; i>=0; i--) {
    const v = (allDays[i][1].b3||0)+(allDays[i][1].forex||0);
    if (v > 0) streak++; else break;
  }

  // Mini grafico dos ultimos 10 dias
  const last10 = allDays.slice(-10);
  let acc = bancaInicialB3;
  const chartPts = [{ val:bancaInicialB3 }, ...last10.map(([,e])=>{ acc+=(e.b3||0); return { val:parseFloat(acc.toFixed(2)) }; })];
  const minV = Math.min(...chartPts.map(p=>p.val));
  const maxV = Math.max(...chartPts.map(p=>p.val));
  const rng  = maxV - minV || 1;
  const W=300, H=70, PL=8, PR=8, PT=8, PB=8;
  const xi = (i) => PL + (i/(chartPts.length-1||1))*(W-PL-PR);
  const yi = (v) => PT + (1-(v-minV)/rng)*(H-PT-PB);
  const pathD = chartPts.map((p,i)=>(i===0?"M":"L")+xi(i).toFixed(1)+","+yi(p.val).toFixed(1)).join(" ");
  const areaD = pathD+" L"+xi(chartPts.length-1).toFixed(1)+","+(H-PB)+" L"+PL+","+(H-PB)+" Z";
  const chartColor = bancaRealB3 >= bancaInicialB3 ? "var(--accent)" : "var(--neg)";

  // Cards
  const cards = [
    { label:"Banca B3 Atual",    value:"R$ "+bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2}),  sub:fmtMoney(lucroB3,"R$")+" vs inicial",      color:"var(--accent)", icon:"🇧🇷" },
    { label:"Banca Forex Atual", value:"$ "+bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2}), sub:fmtMoney(lucroForex,"$")+" vs inicial",    color:"var(--warn-2)", icon:"🌍" },
    { label:"Resultado do Mes",  value:fmtMoney(mesB3+mesFx,""),                                              sub:diasPos+" dias positivos / "+diasNeg+" negativos", color:mesB3+mesFx>=0?"var(--accent)":"var(--neg)", icon:"📅" },
    { label:"Win Rate",          value:winRate!==null?winRate+"%":"—",                                        sub:(diasPos+diasNeg)+" dias registrados",     color:winRate>=60?"var(--accent)":winRate>=40?"var(--warn-2)":"var(--neg)", icon:"🏆" },
  ];

  const hoje = entries[today];
  const hojeTotal = hoje ? (hoje.b3||0)+(hoje.forex||0) : null;

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"var(--text)", letterSpacing:"-0.5px" }}>Dashboard</h1>
        <p style={{ margin:0, color:"var(--text-3)", fontSize:"13px" }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p>
      </div>

      {/* Hoje banner */}
      {hojeTotal !== null ? (
        <div style={{ background:hojeTotal>=0?"color-mix(in srgb, var(--accent) 8%, transparent)":"color-mix(in srgb, var(--neg) 8%, transparent)", border:"1px solid "+(hojeTotal>=0?"color-mix(in srgb, var(--accent) 20%, transparent)":"color-mix(in srgb, var(--neg) 20%, transparent)"), borderRadius:"14px", padding:"16px 20px", marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:"0 0 2px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Resultado de Hoje</p>
            <p style={{ margin:0, color:hojeTotal>=0?"var(--accent)":"var(--neg)", fontSize:"24px", fontWeight:"800", fontFamily:"var(--font-mono)" }}>{fmtMoney(hojeTotal,"")}</p>
          </div>
          {streak > 1 && <div style={{ textAlign:"right" }}><p style={{ margin:"0 0 2px", color:"var(--text-mute)", fontSize:"11px" }}>Sequencia positiva</p><p style={{ margin:0, color:"var(--warn-2)", fontSize:"20px", fontWeight:"700" }}>🔥 {streak} dias</p></div>}
        </div>
      ) : (
        <div style={{ background:"color-mix(in srgb, var(--ink) 2%, transparent)", border:"1px solid var(--line)", borderRadius:"14px", padding:"16px 20px", marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ margin:0, color:"var(--text-mute)", fontSize:"13px" }}>Voce ainda nao registrou o resultado de hoje.</p>
          <button onClick={()=>setPagina("diario")} style={{ background:"linear-gradient(135deg,#2ee6a0,#1fc98a)", color:"#000", border:"none", borderRadius:"8px", padding:"8px 16px", fontWeight:"700", fontSize:"12px", cursor:"pointer" }}>Registrar agora</button>
        </div>
      )}

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
        {cards.map((c,i) => (
          <div key={i} style={{ background:"var(--card)", border:"1px solid "+alfa(c.color,"22"), borderRadius:"14px", padding:"18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+c.color+",transparent)" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <p style={{ margin:"0 0 6px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>{c.label}</p>
              <span style={{ fontSize:"18px" }}>{c.icon}</span>
            </div>
            <p style={{ margin:"0 0 4px", color:c.color, fontSize:"22px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{c.value}</p>
            <p style={{ margin:0, color:"var(--text-3)", fontSize:"11px", fontFamily:"var(--font-mono)" }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Mini grafico B3 */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"14px", padding:"20px", marginBottom:"20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
          <div>
            <p style={{ margin:"0 0 2px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Evolucao Banca B3</p>
            <p style={{ margin:0, color:"var(--accent)", fontSize:"18px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>R$ {bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
          </div>
          <button onClick={()=>setPagina("patrimonio")} style={{ background:"color-mix(in srgb, var(--ink) 4%, transparent)", border:"1px solid var(--line-strong)", borderRadius:"8px", padding:"6px 12px", color:"var(--text-mute)", fontSize:"11px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Ver completo →</button>
        </div>
        {chartPts.length > 1 ? (
          <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%", height:"auto", display:"block" }} preserveAspectRatio="none">
            <path d={areaD} fill={alfa(chartColor,"18")}/>
            <path d={pathD} fill="none" stroke={chartColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        ) : (
          <div style={{ height:"70px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ color:"var(--text-4)", fontSize:"12px" }}>Registre operacoes para ver o grafico</p>
          </div>
        )}
      </div>

      {/* Limites do dia */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"14px", padding:"20px" }}>
        <p style={{ margin:"0 0 14px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Limites do Dia — calculados sobre banca real</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[
            { label:"Risco/op B3",    val:"R$ "+(bancaRealB3*0.01).toFixed(2),  color:"var(--accent)" },
            { label:"Risco/op Forex", val:"$ "+(bancaRealForex*0.01).toFixed(2), color:"var(--warn-2)" },
            { label:"Meta diaria B3", val:"R$ "+(bancaRealB3*0.02).toFixed(2),  color:"var(--accent)" },
            { label:"Meta diaria Fx", val:"$ "+(bancaRealForex*0.02).toFixed(2), color:"var(--warn-2)" },
            { label:"Stop diario B3", val:"R$ "+(bancaRealB3*0.03).toFixed(2),  color:"var(--neg)" },
            { label:"Stop diario Fx", val:"$ "+(bancaRealForex*0.03).toFixed(2), color:"var(--neg)" },
          ].map((item,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"color-mix(in srgb, var(--ink) 2%, transparent)", border:"1px solid "+alfa(item.color,"18") }}>
              <p style={{ margin:"0 0 3px", color:"var(--text-mute)", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{item.label}</p>
              <p style={{ margin:0, color:item.color, fontSize:"16px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
