import { useState } from "react";

export default function Banca({ entries, config, saveConfig }) {
  const bancaInicialB3    = config?.bancaB3    || 3000;
  const bancaInicialForex = config?.bancaForex || 200;
  const bancaRealB3       = Object.values(entries).reduce((s,e)=>s+(e.b3||0),    bancaInicialB3);
  const bancaRealForex    = Object.values(entries).reduce((s,e)=>s+(e.forex||0), bancaInicialForex);
  const lucroB3           = bancaRealB3 - bancaInicialB3;
  const lucroForex        = bancaRealForex - bancaInicialForex;
  const hasData           = Object.keys(entries).length > 0;

  const [editando, setEditando] = useState(false);
  const [inputB3,  setInputB3]  = useState(String(bancaInicialB3));
  const [inputFx,  setInputFx]  = useState(String(bancaInicialForex));
  const [msg,      setMsg]      = useState("");

  async function salvar() {
    const b3    = parseFloat(inputB3) || 3000;
    const forex = parseFloat(inputFx) || 200;
    await saveConfig({ bancaB3: b3, bancaForex: forex });
    setEditando(false);
    setMsg("✓ Banca atualizada!"); setTimeout(()=>setMsg(""),2500);
  }

  const colB3="#00d4aa", colFx="#f59e0b", colStop="#ff4d4d";
  const inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid #3a3a4a", borderRadius:"10px", padding:"11px 13px", color:"#fff", fontSize:"16px", fontWeight:"700", outline:"none", boxSizing:"border-box", fontFamily:"JetBrains Mono,monospace" };

  function CardItem({ label, value, sub, color }) {
    return (
      <div style={{ padding:"14px 16px", borderRadius:"12px", background:"rgba(255,255,255,0.02)", border:"1px solid "+color+"22", marginBottom:"10px" }}>
        <p style={{ margin:"0 0 3px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>{label}</p>
        <p style={{ margin:"0 0 2px", color:color, fontSize:"20px", fontWeight:"700", fontFamily:"JetBrains Mono,monospace" }}>{value}</p>
        <p style={{ margin:0, color:"#999", fontSize:"11px" }}>{sub}</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Gestao de Banca</h1>
          <p style={{ margin:0, color:"#999", fontSize:"13px" }}>Referencias de risco calculadas sobre sua banca real</p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          {msg && <span style={{ color:"#00d4aa", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
          <button onClick={()=>{setInputB3(String(bancaInicialB3));setInputFx(String(bancaInicialForex));setEditando(!editando);}} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"8px 16px", color:"#888", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
            {editando?"✕ Cancelar":"✏️ Editar banca inicial"}
          </button>
        </div>
      </div>

      {/* Editor banca inicial */}
      {editando && (
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid #f59e0b33", borderRadius:"14px", padding:"22px", marginBottom:"20px" }}>
          <p style={{ margin:"0 0 16px", color:"#f59e0b", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>⚙️ Configurar Banca Inicial</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"16px" }}>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🇧🇷 Banca inicial B3 (R$)</label>
              <input type="number" value={inputB3} onChange={e=>setInputB3(e.target.value)} style={inp} placeholder="Ex: 3000"/>
            </div>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🌍 Banca inicial Forex ($)</label>
              <input type="number" value={inputFx} onChange={e=>setInputFx(e.target.value)} style={inp} placeholder="Ex: 200"/>
            </div>
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <button onClick={salvar} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
              💾 Salvar banca inicial
            </button>
            <p style={{ margin:0, color:"#999", fontSize:"12px" }}>Todos os calculos atualizam automaticamente.</p>
          </div>
        </div>
      )}

      {/* Cards lado a lado */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>

        {/* B3 */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"14px", paddingBottom:"10px", borderBottom:"2px solid "+colB3+"33" }}>
            <span style={{ fontSize:"18px" }}>🇧🇷</span>
            <span style={{ color:colB3, fontWeight:"700", fontSize:"15px" }}>Mini Indice B3</span>
          </div>
          <div style={{ padding:"18px", borderRadius:"14px", background:"rgba(0,212,170,0.06)", border:"1px solid "+colB3+"33", position:"relative", overflow:"hidden", marginBottom:"10px" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+colB3+",transparent)" }}/>
            <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>Banca atual</p>
            <p style={{ margin:"0 0 4px", color:colB3, fontSize:"24px", fontWeight:"800", fontFamily:"JetBrains Mono,monospace" }}>R$ {bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p style={{ margin:0, fontSize:"12px", color:lucroB3>=0?"#00d4aa88":"#ff4d4d88", fontFamily:"JetBrains Mono,monospace" }}>
              {hasData?(lucroB3>=0?"+":"")+"R$ "+Math.abs(lucroB3).toFixed(2)+" vs inicial":"Sem operacoes registradas"}
            </p>
          </div>
          <CardItem label="Risco por operacao" value={"R$ "+(bancaRealB3*0.01).toFixed(2)} sub="1% da banca" color={colB3}/>
          <CardItem label="Meta diaria"        value={"R$ "+(bancaRealB3*0.02).toFixed(2)} sub="2% — pode encerrar" color={colB3}/>
          <CardItem label="Stop diario"        value={"R$ "+(bancaRealB3*0.03).toFixed(2)} sub="3% — fecha o dia obrigatoriamente" color={colStop}/>
        </div>

        {/* Forex */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"14px", paddingBottom:"10px", borderBottom:"2px solid "+colFx+"33" }}>
            <span style={{ fontSize:"18px" }}>🌍</span>
            <span style={{ color:colFx, fontWeight:"700", fontSize:"15px" }}>Forex</span>
          </div>
          <div style={{ padding:"18px", borderRadius:"14px", background:"rgba(245,158,11,0.06)", border:"1px solid "+colFx+"33", position:"relative", overflow:"hidden", marginBottom:"10px" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+colFx+",transparent)" }}/>
            <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>Banca atual</p>
            <p style={{ margin:"0 0 4px", color:colFx, fontSize:"24px", fontWeight:"800", fontFamily:"JetBrains Mono,monospace" }}>$ {bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p style={{ margin:0, fontSize:"12px", color:lucroForex>=0?"#00d4aa88":"#ff4d4d88", fontFamily:"JetBrains Mono,monospace" }}>
              {hasData?(lucroForex>=0?"+":"")+"$ "+Math.abs(lucroForex).toFixed(2)+" vs inicial":"Sem operacoes registradas"}
            </p>
          </div>
          <CardItem label="Risco por operacao" value={"$ "+(bancaRealForex*0.01).toFixed(2)} sub="1% da banca" color={colFx}/>
          <CardItem label="Meta diaria"        value={"$ "+(bancaRealForex*0.02).toFixed(2)} sub="2% — pode encerrar" color={colFx}/>
          <CardItem label="Stop diario"        value={"$ "+(bancaRealForex*0.03).toFixed(2)} sub="3% — fecha o dia obrigatoriamente" color={colStop}/>
        </div>
      </div>

      {!hasData && <p style={{ margin:"20px 0 0", color:"#888", fontSize:"12px", textAlign:"center" }}>Registre operacoes no Diario para os valores atualizarem automaticamente.</p>}
    </div>
  );
}
