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
  const chartColor = bancaRealB3 >= bancaInicialB3 ? "#00d4aa" : "#ff4d4d";

  // Cards
  const cards = [
    { label:"Banca B3 Atual",    value:"R$ "+bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2}),  sub:fmtMoney(lucroB3,"R$")+" vs inicial",      color:"#00d4aa", icon:"🇧🇷" },
    { label:"Banca Forex Atual", value:"$ "+bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2}), sub:fmtMoney(lucroForex,"$")+" vs inicial",    color:"#f59e0b", icon:"🌍" },
    { label:"Resultado do Mes",  value:fmtMoney(mesB3+mesFx,""),                                              sub:diasPos+" dias positivos / "+diasNeg+" negativos", color:mesB3+mesFx>=0?"#00d4aa":"#ff4d4d", icon:"📅" },
    { label:"Win Rate",          value:winRate!==null?winRate+"%":"—",                                        sub:(diasPos+diasNeg)+" dias registrados",     color:winRate>=60?"#00d4aa":winRate>=40?"#f59e0b":"#ff4d4d", icon:"🏆" },
  ];

  const hoje = entries[today];
  const hojeTotal = hoje ? (hoje.b3||0)+(hoje.forex||0) : null;

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Dashboard</h1>
        <p style={{ margin:0, color:"#555", fontSize:"13px" }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</p>
      </div>

      {/* Hoje banner */}
      {hojeTotal !== null ? (
        <div style={{ background:hojeTotal>=0?"rgba(0,212,170,0.08)":"rgba(255,77,77,0.08)", border:"1px solid "+(hojeTotal>=0?"#00d4aa33":"#ff4d4d33"), borderRadius:"14px", padding:"16px 20px", marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:"0 0 2px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Resultado de Hoje</p>
            <p style={{ margin:0, color:hojeTotal>=0?"#00d4aa":"#ff4d4d", fontSize:"24px", fontWeight:"800", fontFamily:"JetBrains Mono,monospace" }}>{fmtMoney(hojeTotal,"")}</p>
          </div>
          {streak > 1 && <div style={{ textAlign:"right" }}><p style={{ margin:"0 0 2px", color:"#777", fontSize:"11px" }}>Sequencia positiva</p><p style={{ margin:0, color:"#f59e0b", fontSize:"20px", fontWeight:"700" }}>🔥 {streak} dias</p></div>}
        </div>
      ) : (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"16px 20px", marginBottom:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <p style={{ margin:0, color:"#666", fontSize:"13px" }}>Voce ainda nao registrou o resultado de hoje.</p>
          <button onClick={()=>setPagina("diario")} style={{ background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", border:"none", borderRadius:"8px", padding:"8px 16px", fontWeight:"700", fontSize:"12px", cursor:"pointer" }}>Registrar agora</button>
        </div>
      )}

      {/* Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
        {cards.map((c,i) => (
          <div key={i} style={{ background:"#111118", border:"1px solid "+c.color+"22", borderRadius:"14px", padding:"18px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+c.color+",transparent)" }}/>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <p style={{ margin:"0 0 6px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>{c.label}</p>
              <span style={{ fontSize:"18px" }}>{c.icon}</span>
            </div>
            <p style={{ margin:"0 0 4px", color:c.color, fontSize:"22px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{c.value}</p>
            <p style={{ margin:0, color:"#555", fontSize:"11px", fontFamily:"JetBrains Mono,monospace" }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Mini grafico B3 */}
      <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"20px", marginBottom:"20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
          <div>
            <p style={{ margin:"0 0 2px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Evolucao Banca B3</p>
            <p style={{ margin:0, color:"#00d4aa", fontSize:"18px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>R$ {bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
          </div>
          <button onClick={()=>setPagina("patrimonio")} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"6px 12px", color:"#777", fontSize:"11px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>Ver completo →</button>
        </div>
        {chartPts.length > 1 ? (
          <svg viewBox={"0 0 "+W+" "+H} style={{ width:"100%", height:"auto", display:"block" }} preserveAspectRatio="none">
            <path d={areaD} fill={chartColor+"18"}/>
            <path d={pathD} fill="none" stroke={chartColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        ) : (
          <div style={{ height:"70px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <p style={{ color:"#444", fontSize:"12px" }}>Registre operacoes para ver o grafico</p>
          </div>
        )}
      </div>

      {/* Limites do dia */}
      <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"20px" }}>
        <p style={{ margin:"0 0 14px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Limites do Dia — calculados sobre banca real</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {[
            { label:"Risco/op B3",    val:"R$ "+(bancaRealB3*0.01).toFixed(2),  color:"#00d4aa" },
            { label:"Risco/op Forex", val:"$ "+(bancaRealForex*0.01).toFixed(2), color:"#f59e0b" },
            { label:"Meta diaria B3", val:"R$ "+(bancaRealB3*0.02).toFixed(2),  color:"#00d4aa" },
            { label:"Meta diaria Fx", val:"$ "+(bancaRealForex*0.02).toFixed(2), color:"#f59e0b" },
            { label:"Stop diario B3", val:"R$ "+(bancaRealB3*0.03).toFixed(2),  color:"#ff4d4d" },
            { label:"Stop diario Fx", val:"$ "+(bancaRealForex*0.03).toFixed(2), color:"#ff4d4d" },
          ].map((item,i) => (
            <div key={i} style={{ padding:"12px 14px", borderRadius:"10px", background:"rgba(255,255,255,0.02)", border:"1px solid "+item.color+"18" }}>
              <p style={{ margin:"0 0 3px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{item.label}</p>
              <p style={{ margin:0, color:item.color, fontSize:"16px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{item.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
