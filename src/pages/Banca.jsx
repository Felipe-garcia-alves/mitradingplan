import { useState } from "react";

const BANCOS_META = {
  B3:        { label:"Mini Índice B3",   emoji:"🇧🇷", moeda:"R$", cor:"#00d4aa", key:"bancaB3",        entry:"totalB3",        core:true  },
  Forex:     { label:"Forex",            emoji:"🌍",  moeda:"$",  cor:"#f59e0b", key:"bancaForex",     entry:"totalForex",     core:true  },
  Cripto:    { label:"Cripto",           emoji:"₿",   moeda:"$",  cor:"#a78bfa", key:"bancaCripto",    entry:"totalCripto",    core:false },
  Americano: { label:"Ações Americanas", emoji:"🇺🇸",  moeda:"$",  cor:"#60a5fa", key:"bancaAmericano", entry:"totalAmericano", core:false },
};

export default function Banca({ entries, config, saveConfig }) {
  const [editando,   setEditando]   = useState(false);
  const [inputs,     setInputs]     = useState({});
  const [showCriar,  setShowCriar]  = useState(false);
  const [novoTipo,   setNovoTipo]   = useState("");
  const [novoValor,  setNovoValor]  = useState("");
  const [msg,        setMsg]        = useState("");
  const hasData = Object.keys(entries).length > 0;

  const activeBancos    = Object.entries(BANCOS_META).filter(([, m]) => m.core || config?.[m.key] !== undefined);
  const availableBancos = Object.entries(BANCOS_META).filter(([, m]) => !m.core && config?.[m.key] === undefined);

  function getBancaInicial(meta) {
    if (meta.key === "bancaB3")    return config?.bancaB3    ?? 3000;
    if (meta.key === "bancaForex") return config?.bancaForex ?? 200;
    return config?.[meta.key] ?? 0;
  }

  function getBancaReal(meta) {
    const ini = getBancaInicial(meta);
    return Object.values(entries).reduce((s, e) => s + (e[meta.entry] || 0), ini);
  }

  async function salvarEdicao() {
    const nc = { ...config };
    activeBancos.forEach(([tipo, meta]) => {
      const v = parseFloat(inputs[tipo]);
      if (!isNaN(v)) nc[meta.key] = v;
    });
    await saveConfig(nc);
    setEditando(false);
    setMsg("✓ Banca atualizada!"); setTimeout(() => setMsg(""), 2500);
  }

  async function criarBanca() {
    if (!novoTipo || !novoValor) return;
    await saveConfig({ ...config, [BANCOS_META[novoTipo].key]: parseFloat(novoValor) });
    setShowCriar(false); setNovoTipo(""); setNovoValor("");
    setMsg("✓ Banca criada!"); setTimeout(() => setMsg(""), 2500);
  }

  async function deletarBanca(tipo) {
    const nc = { ...config };
    delete nc[BANCOS_META[tipo].key];
    await saveConfig(nc);
    setMsg("Banca removida."); setTimeout(() => setMsg(""), 2500);
  }

  const colStop = "#ff4d4d";
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
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Gestão de Banca</h1>
          <p style={{ margin:"4px 0 0", color:"#666", fontSize:"13px" }}>Referências de risco calculadas sobre sua banca real</p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
          {msg && <span style={{ color:"#00d4aa", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
          {availableBancos.length > 0 && (
            <button onClick={() => { setShowCriar(true); setNovoTipo(availableBancos[0][0]); }}
              style={{ background:"rgba(0,212,170,0.08)", border:"1px solid #00d4aa44", borderRadius:"8px", padding:"8px 16px", color:"#00d4aa", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"Inter,sans-serif", display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Criar Banca
            </button>
          )}
          <button onClick={() => {
            const init = {};
            activeBancos.forEach(([tipo, meta]) => { init[tipo] = String(getBancaInicial(meta)); });
            setInputs(init);
            setEditando(!editando);
          }} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"8px 16px", color:"#888", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
            {editando ? "✕ Cancelar" : "✏️ Editar banca inicial"}
          </button>
        </div>
      </div>

      {/* Modal Criar Banca */}
      {showCriar && (
        <>
          <div onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200 }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#0f0f18", border:"1px solid #2a2a3a", borderRadius:"20px", padding:"28px", zIndex:201, width:"380px", maxWidth:"92vw", boxShadow:"0 24px 60px rgba(0,0,0,0.8)" }}>
            <p style={{ margin:"0 0 4px", color:"#f0f0f0", fontSize:"16px", fontWeight:"800" }}>Criar Nova Banca</p>
            <p style={{ margin:"0 0 22px", color:"#555", fontSize:"12px" }}>Escolha o mercado e defina o capital inicial</p>
            <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
              {availableBancos.map(([tipo, meta]) => (
                <button key={tipo} onClick={() => setNovoTipo(tipo)}
                  style={{ padding:"10px 16px", borderRadius:"10px", border:"1px solid "+(novoTipo===tipo?meta.cor+"66":"#2a2a3a"), background:novoTipo===tipo?meta.cor+"15":"rgba(255,255,255,0.02)", color:novoTipo===tipo?meta.cor:"#777", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", transition:"all 0.15s" }}>
                  {meta.emoji} {meta.label}
                </button>
              ))}
            </div>
            {novoTipo && (
              <div style={{ marginBottom:"20px" }}>
                <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>
                  Capital inicial ({BANCOS_META[novoTipo].moeda})
                </label>
                <input type="number" value={novoValor} onChange={e => setNovoValor(e.target.value)}
                  placeholder={BANCOS_META[novoTipo].key==="bancaCripto"?"Ex: 500":"Ex: 1000"}
                  style={{ ...inp, borderColor:BANCOS_META[novoTipo].cor+"44" }} autoFocus/>
              </div>
            )}
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={criarBanca} disabled={!novoTipo || !novoValor}
                style={{ flex:1, background:novoTipo&&novoValor?"linear-gradient(135deg,"+(BANCOS_META[novoTipo]?.cor||"#00d4aa")+","+(BANCOS_META[novoTipo]?.cor||"#00d4aa")+"cc)":"#1a1a2e", color:novoTipo&&novoValor?"#000":"#444", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"700", fontSize:"13px", cursor:novoTipo&&novoValor?"pointer":"default" }}>
                Criar Banca
              </button>
              <button onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
                style={{ background:"transparent", color:"#666", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Editor banca inicial */}
      {editando && (
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid #f59e0b33", borderRadius:"14px", padding:"22px", marginBottom:"20px" }}>
          <p style={{ margin:"0 0 16px", color:"#f59e0b", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>⚙️ Configurar Banca Inicial</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"14px", marginBottom:"16px" }}>
            {activeBancos.map(([tipo, meta]) => (
              <div key={tipo}>
                <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>
                  {meta.emoji} {meta.label} ({meta.moeda})
                </label>
                <input type="number" value={inputs[tipo]||""} onChange={e => setInputs(p => ({ ...p, [tipo]:e.target.value }))} style={inp} placeholder={"Ex: "+getBancaInicial(meta)}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <button onClick={salvarEdicao} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
              💾 Salvar
            </button>
            <p style={{ margin:0, color:"#999", fontSize:"12px" }}>Todos os cálculos atualizam automaticamente.</p>
          </div>
        </div>
      )}

      {/* Grid de bancos */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:"16px" }}>
        {activeBancos.map(([tipo, meta]) => {
          const inicial = getBancaInicial(meta);
          const real    = getBancaReal(meta);
          const lucro   = real - inicial;
          const fmtV    = (v) => meta.moeda + " " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits:2 });
          return (
            <div key={tipo}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px", paddingBottom:"10px", borderBottom:"2px solid "+meta.cor+"33" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{ fontSize:"18px" }}>{meta.emoji}</span>
                  <span style={{ color:meta.cor, fontWeight:"700", fontSize:"15px" }}>{meta.label}</span>
                </div>
                {!meta.core && (
                  <button onClick={() => deletarBanca(tipo)}
                    style={{ background:"rgba(255,77,77,0.05)", border:"1px solid #ff4d4d22", borderRadius:"6px", padding:"3px 10px", color:"#ff4d4d88", cursor:"pointer", fontSize:"11px", fontWeight:"600" }}>
                    remover
                  </button>
                )}
              </div>
              <div style={{ padding:"18px", borderRadius:"14px", background:meta.cor+"0a", border:"1px solid "+meta.cor+"33", position:"relative", overflow:"hidden", marginBottom:"10px" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+meta.cor+",transparent)" }}/>
                <p style={{ margin:"0 0 4px", color:"#777", fontSize:"10px", textTransform:"uppercase", letterSpacing:"1px" }}>Banca atual</p>
                <p style={{ margin:"0 0 4px", color:meta.cor, fontSize:"24px", fontWeight:"800", fontFamily:"JetBrains Mono,monospace" }}>{fmtV(real)}</p>
                <p style={{ margin:0, fontSize:"12px", color:lucro>=0?"#00d4aa88":"#ff4d4d88", fontFamily:"JetBrains Mono,monospace" }}>
                  {hasData ? (lucro>=0?"+":"-")+fmtV(lucro)+" vs inicial" : "Sem operações registradas"}
                </p>
              </div>
              <CardItem label="Risco por operação" value={fmtV(real*0.01)} sub="1% da banca"                        color={meta.cor}/>
              <CardItem label="Meta diária"         value={fmtV(real*0.02)} sub="2% — pode encerrar"                color={meta.cor}/>
              <CardItem label="Stop diário"         value={fmtV(real*0.03)} sub="3% — fecha o dia obrigatoriamente" color={colStop}/>
            </div>
          );
        })}
      </div>

      {!hasData && <p style={{ margin:"20px 0 0", color:"#888", fontSize:"12px", textAlign:"center" }}>Registre operações no Diário para os valores atualizarem automaticamente.</p>}
    </div>
  );
}
