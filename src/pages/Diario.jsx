import { useState } from "react";

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
const MONTH_NAMES = ["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function formatMonthLabel(s) { const p=s.split("-"); return MONTH_NAMES[parseInt(p[1])-1]+" "+p[0]; }
function numColor(v) { return v===0||!v?"#777":v>0?"#00d4aa":"#ff4d4d"; }

export default function Diario({ entries, saveEntry, deleteEntry }) {
  const today    = todayKey();
  const curMonth = monthKey(today);
  const [selMonth, setSelMonth] = useState(curMonth);
  const [form, setForm]         = useState({ b3:"", forex:"", motivo:"", nota:"", mercado:"ambos" });
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg]           = useState("");

  async function handleSave() {
    const b3Val    = form.b3    !== "" ? parseFloat(form.b3)    : undefined;
    const fxVal    = form.forex !== "" ? parseFloat(form.forex) : undefined;
    if (b3Val === undefined && fxVal === undefined) { setMsg("❌ Informe ao menos um resultado."); return; }
    await saveEntry(today, { b3:b3Val, forex:fxVal, motivo:form.motivo, nota:form.nota });
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2500);
  }

  function exportCSV() {
    const header = "Data,B3 (R$),Forex ($),Total,Motivo,Nota";
    const rows = Object.entries(entries).sort(([a],[b])=>a.localeCompare(b)).map(([d,e]) => {
      const esc = s => '"'+(s||"").replace(/"/g,'""')+'"';
      return [formatDateFull(d), e.b3?.toFixed(2)||"", e.forex?.toFixed(2)||"", ((e.b3||0)+(e.forex||0)).toFixed(2), esc(e.motivo), esc(e.nota)].join(",");
    });
    const blob = new Blob(["\uFEFF"+[header,...rows].join("\n")],{type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download="diario_"+new Date().getFullYear()+".csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const allMonths   = [...new Set(Object.keys(entries).map(monthKey))].sort().reverse();
  if (!allMonths.includes(curMonth)) allMonths.unshift(curMonth);
  const monthDays   = Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>b.localeCompare(a));
  const totB3       = monthDays.reduce((s,[,e])=>s+(e.b3||0),0);
  const totFx       = monthDays.reduce((s,[,e])=>s+(e.forex||0),0);
  const diasPos     = monthDays.filter(([,e])=>(e.b3||0)+(e.forex||0)>0).length;
  const diasNeg     = monthDays.filter(([,e])=>(e.b3||0)+(e.forex||0)<0).length;
  const todayEntry  = entries[today];

  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Diario de Operacoes</h1>
          <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Registre e acompanhe seus resultados diarios</p>
        </div>
        {Object.keys(entries).length > 0 && (
          <button onClick={exportCSV} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"8px 14px", color:"#777", fontSize:"12px", cursor:"pointer", fontFamily:"Inter,sans-serif", fontWeight:"600" }}>⬇ Exportar CSV</button>
        )}
      </div>

      {/* Formulario hoje */}
      <div style={{ background:"#111118", border:"1px solid "+(todayEntry?"#00d4aa22":"#1a1a2e"), borderRadius:"14px", padding:"22px", marginBottom:"20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
          <div>
            <p style={{ margin:"0 0 2px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Registrar hoje</p>
            <p style={{ margin:0, color:"#f0f0f0", fontSize:"15px", fontWeight:"600" }}>{formatDateFull(today)}</p>
          </div>
          {todayEntry && <span style={{ background:"rgba(0,212,170,0.1)", color:"#00d4aa", padding:"4px 12px", borderRadius:"20px", fontSize:"11px", fontWeight:"600" }}>✓ Registrado hoje</span>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🇧🇷 Mini Indice (R$)</label>
            <input style={inp} type="number" placeholder="Ex: 150 ou -90" value={form.b3} onChange={e=>setForm(f=>({...f,b3:e.target.value}))}/>
          </div>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🌍 Forex ($)</label>
            <input style={inp} type="number" placeholder="Ex: 5 ou -2.5" value={form.forex} onChange={e=>setForm(f=>({...f,forex:e.target.value}))}/>
          </div>
        </div>

        <div style={{ marginBottom:"12px" }}>
          <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>📌 Setup / Motivo da entrada</label>
          <textarea style={{ ...inp, resize:"vertical", lineHeight:"1.6", minHeight:"70px" }} placeholder="Qual foi o setup? Por que entrou? O que observou no mercado..." value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={3}/>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>💬 Nota do dia / Emocoes</label>
          <input style={inp} type="text" placeholder="Como foi a disciplina? Seguiu as regras? Emocoes..." value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))}/>
        </div>

        <div style={{ display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={handleSave} style={{ background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
            💾 Salvar dia
          </button>
          {msg && <span style={{ color:msg.includes("✓")?"#00d4aa":"#ff6b6b", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
        </div>
      </div>

      {/* Filtro de mes */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"16px", flexWrap:"wrap" }}>
        {allMonths.map(m => (
          <button key={m} onClick={()=>setSelMonth(m)} style={{ padding:"5px 14px", borderRadius:"20px", border:"none", cursor:"pointer", fontWeight:"600", fontSize:"12px", background:selMonth===m?"#00d4aa":"rgba(255,255,255,0.05)", color:selMonth===m?"#000":"#666", fontFamily:"Inter,sans-serif" }}>
            {formatMonthLabel(m)}
          </button>
        ))}
      </div>

      {/* Resumo do mes */}
      {monthDays.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px", marginBottom:"16px" }}>
          {[
            { label:"Total B3",   val:(totB3>=0?"+":"")+"R$ "+Math.abs(totB3).toFixed(2),   color:numColor(totB3) },
            { label:"Total Forex",val:(totFx>=0?"+":"")+"$ "+Math.abs(totFx).toFixed(2),     color:numColor(totFx) },
            { label:"Dias +",     val:diasPos,                                                color:"#00d4aa" },
            { label:"Dias -",     val:diasNeg,                                                color:diasNeg>0?"#ff4d4d":"#555" },
          ].map((s,i) => (
            <div key={i} style={{ padding:"12px", borderRadius:"10px", background:"#111118", border:"1px solid #1a1a2e", textAlign:"center" }}>
              <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{s.label}</p>
              <p style={{ margin:0, color:s.color, fontWeight:"700", fontSize:"15px", fontFamily:"JetBrains Mono,monospace" }}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de dias */}
      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
        {monthDays.map(([ds, entry]) => {
          const total   = (entry.b3||0)+(entry.forex||0);
          const isToday = ds === today;
          const isOpen  = expanded === ds;
          const hasDetail = entry.motivo || entry.nota;
          return (
            <div key={ds} style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid "+(isToday?"#00d4aa22":"#1a1a2e"), background:isToday?"rgba(0,212,170,0.03)":"#111118" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"13px 16px", cursor:hasDetail?"pointer":"default" }} onClick={()=>hasDetail&&setExpanded(isOpen?null:ds)}>
                <div style={{ minWidth:"70px" }}>
                  <p style={{ margin:0, color:isToday?"#00d4aa":"#aaa", fontSize:"12px", fontWeight:"600" }}>{isToday?"Hoje":formatDateFull(ds)}</p>
                </div>
                <div style={{ display:"flex", gap:"14px", flex:1, flexWrap:"wrap", alignItems:"center" }}>
                  {entry.b3 !== undefined && <span style={{ color:numColor(entry.b3), fontSize:"13px", fontFamily:"JetBrains Mono,monospace", fontWeight:"600" }}>🇧🇷 {entry.b3>=0?"+":""}R$ {entry.b3?.toFixed(2)}</span>}
                  {entry.forex !== undefined && <span style={{ color:numColor(entry.forex), fontSize:"13px", fontFamily:"JetBrains Mono,monospace", fontWeight:"600" }}>🌍 {entry.forex>=0?"+":""}$ {entry.forex?.toFixed(2)}</span>}
                  {hasDetail && <span style={{ color:"#444", fontSize:"11px" }}>{isOpen?"▲":"▼"}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>
                  <span style={{ color:numColor(total), fontSize:"14px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{total>=0?"+":""}{total.toFixed(2)}</span>
                  <button onClick={e=>{e.stopPropagation();deleteEntry(ds);}} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:"13px", padding:"2px 6px", borderRadius:"4px" }}>✕</button>
                </div>
              </div>
              {isOpen && hasDetail && (
                <div style={{ borderTop:"1px solid #1a1a2e", padding:"14px 16px", display:"flex", flexDirection:"column", gap:"10px" }}>
                  {entry.motivo && <div><p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>📌 Setup / Motivo</p><p style={{ margin:0, color:"#bbb", fontSize:"13px", lineHeight:"1.6" }}>{entry.motivo}</p></div>}
                  {entry.nota   && <div><p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>💬 Nota</p><p style={{ margin:0, color:"#888", fontSize:"13px", fontStyle:"italic" }}>{entry.nota}</p></div>}
                </div>
              )}
            </div>
          );
        })}
        {monthDays.length === 0 && (
          <div style={{ textAlign:"center", padding:"48px 20px", color:"#555", fontSize:"13px" }}>
            Nenhum registro em {formatMonthLabel(selMonth)}.<br/>
            <span style={{ fontSize:"12px", color:"#444" }}>Registre seu primeiro resultado acima.</span>
          </div>
        )}
      </div>
    </div>
  );
}
