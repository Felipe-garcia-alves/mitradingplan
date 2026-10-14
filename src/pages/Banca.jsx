import { useState } from "react";
import { CountUp, Sparkline, Modal } from "../components/ui";
import { listaCarteiras, carteira, bancaCarteira, totalSaques, listaSaques, curvaCarteira, carteiraDoSaque } from "../lib/banca";
import { TIPOS_CONTA } from "../lib/contas";

function hojeISO() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function fmtData(s) { const p = s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

const BANCOS_META = {
  B3:        { label:"Mini Índice B3",   emoji:"🇧🇷", sigla:"B3", moeda:"R$", cor:"#2ee6a0", key:"bancaB3",        entry:"totalB3",        core:true  },
  Forex:     { label:"Forex",            emoji:"🌍",  sigla:"FX", moeda:"$",  cor:"#f5b941", key:"bancaForex",     entry:"totalForex",     core:true  },
  Cripto:    { label:"Cripto",           emoji:"₿",   sigla:"₿",  moeda:"$",  cor:"#a78bfa", key:"bancaCripto",    entry:"totalCripto",    core:false },
  Americano: { label:"Ações Americanas", emoji:"🇺🇸",  sigla:"US", moeda:"$",  cor:"#60a5fa", key:"bancaAmericano", entry:"totalAmericano", core:false },
};

const kpiLabel = { margin:0, color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };

function CardItem({ label, value, fmt, sub, color, pct }) {
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px", minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between", gap:"10px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, top:"18px", bottom:"18px", width:"3px", borderRadius:"0 3px 3px 0", background:color, boxShadow:"0 0 10px "+color }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
        <p style={kpiLabel}>{label}</p>
        <span style={{ color, background:color+"15", border:"1px solid "+color+"33", borderRadius:"20px", padding:"1px 8px", fontSize:"10.5px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{pct}</span>
      </div>
      <p style={{ margin:0, color, fontSize:"clamp(17px,1.5vw,22px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}><CountUp value={value} format={fmt}/></p>
      <p style={{ margin:0, color:"var(--text-3)", fontSize:"11.5px" }}>{sub}</p>
    </div>
  );
}

function Selo({ meta, size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"10px", background:meta.cor+"18", border:"1px solid "+meta.cor+"44", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 0 18px -6px "+meta.cor }}>
      <span style={{ color:meta.cor, fontSize:size<30?"9.5px":"12px", fontWeight:"800", fontFamily:"var(--font-mono)" }}>{meta.sigla}</span>
    </div>
  );
}

export default function Banca({ entries, config, saveConfig, setPagina }) {
  const [editando,   setEditando]   = useState(false);
  const [inputs,     setInputs]     = useState({});
  const [showCriar,  setShowCriar]  = useState(false);
  const [novoTipo,   setNovoTipo]   = useState("");
  const [novoValor,  setNovoValor]  = useState("");
  const [msg,        setMsg]        = useState("");
  const [saqueAberto, setSaqueAberto] = useState(false);
  const [saque,      setSaque]      = useState({ cart:"B3", valor:"", data:hojeISO(), obs:"" });
  const [erroSaque,  setErroSaque]  = useState("");
  const hasData = Object.keys(entries).length > 0;

  const activeBancos    = Object.entries(BANCOS_META).filter(([, m]) => m.core || config?.[m.key] !== undefined);
  const availableBancos = Object.entries(BANCOS_META).filter(([, m]) => !m.core && config?.[m.key] === undefined);
  const carteiras = listaCarteiras(config);

  function getBancaInicial(meta) {
    if (meta.key === "bancaB3")    return config?.bancaB3    ?? 3000;
    if (meta.key === "bancaForex") return config?.bancaForex ?? 200;
    return config?.[meta.key] ?? 0;
  }

  function abrirSaque(cartKey) {
    setSaque({ cart: cartKey || carteiras[0].key, valor:"", data:hojeISO(), obs:"" });
    setErroSaque("");
    setSaqueAberto(true);
  }

  async function registrarSaque() {
    const valor = parseFloat(String(saque.valor).replace(",", "."));
    const cart = carteira(config, saque.cart);
    if (!cart) { setErroSaque("Escolha de onde sai o saque."); return; }
    if (!valor || valor <= 0) { setErroSaque("Informe um valor maior que zero."); return; }
    if (!saque.data) { setErroSaque("Informe a data do saque."); return; }
    const disponivel = bancaCarteira(entries, config, cart);
    if (valor > disponivel + 0.005) { setErroSaque("O saque é maior que a banca disponível ("+cart.moeda+" "+disponivel.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+")."); return; }
    const novo = { id: crypto.randomUUID(), data: saque.data, valor: parseFloat(valor.toFixed(2)), carteira: cart.key, mercado: cart.mercado, obs: saque.obs.trim() };
    await saveConfig({ ...config, saques: [...(config?.saques || []), novo] });
    setSaqueAberto(false);
    setMsg("✓ Saque registrado!"); setTimeout(() => setMsg(""), 2500);
  }

  async function removerSaque(id) {
    if (!window.confirm("Remover este saque? A banca volta a contar esse valor.")) return;
    await saveConfig({ ...config, saques: (config?.saques || []).filter(x => x.id !== id) });
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
    nc.saques = (nc.saques || []).filter(x => carteiraDoSaque(x) !== tipo);
    await saveConfig(nc);
    setMsg("Banca removida."); setTimeout(() => setMsg(""), 2500);
  }

  const colStop = "#ff5470";
  const inp = { width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid #3a3a4a", borderRadius:"10px", padding:"11px 13px", color:"#fff", fontSize:"16px", fontWeight:"700", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-mono)" };


  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Gestão de Banca</h1>
          <p style={{ margin:"4px 0 0", color:"#666", fontSize:"13px" }}>Referências de risco calculadas sobre sua banca real</p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
          {msg && <span style={{ color:"#2ee6a0", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
          <button onClick={() => abrirSaque()}
            style={{ background:"rgba(245,185,65,0.08)", border:"1px solid #f5b94144", borderRadius:"8px", padding:"8px 16px", color:"#f5b941", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7 10 12 15 17 10"/><path d="M4 19h16"/></svg>
            Registrar saque
          </button>
          {availableBancos.length > 0 && (
            <button onClick={() => { setShowCriar(true); setNovoTipo(availableBancos[0][0]); }}
              style={{ background:"rgba(46,230,160,0.08)", border:"1px solid #2ee6a044", borderRadius:"8px", padding:"8px 16px", color:"#2ee6a0", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Criar Banca
            </button>
          )}
          <button onClick={() => {
            const init = {};
            activeBancos.forEach(([tipo, meta]) => { init[tipo] = String(getBancaInicial(meta)); });
            setInputs(init);
            setEditando(!editando);
          }} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #26352e", borderRadius:"8px", padding:"8px 16px", color:"#888", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
            {editando ? "✕ Cancelar" : "Editar banca inicial"}
          </button>
        </div>
      </div>

      {/* Modal Criar Banca */}
      {showCriar && (
        <>
          <div onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200 }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#0c1411", border:"1px solid #26352e", borderRadius:"20px", padding:"28px", zIndex:201, width:"380px", maxWidth:"92vw", boxShadow:"0 24px 60px rgba(0,0,0,0.8)" }}>
            <p style={{ margin:"0 0 4px", color:"#f0f0f0", fontSize:"16px", fontWeight:"800" }}>Criar Nova Banca</p>
            <p style={{ margin:"0 0 22px", color:"#555", fontSize:"12px" }}>Escolha o mercado e defina o capital inicial</p>
            <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
              {availableBancos.map(([tipo, meta]) => (
                <button key={tipo} onClick={() => setNovoTipo(tipo)}
                  style={{ padding:"10px 16px", borderRadius:"10px", border:"1px solid "+(novoTipo===tipo?meta.cor+"66":"#26352e"), background:novoTipo===tipo?meta.cor+"15":"rgba(255,255,255,0.02)", color:novoTipo===tipo?meta.cor:"#777", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", transition:"all 0.15s" }}>
                  <Selo meta={meta} size={22}/> {meta.label}
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
                style={{ flex:1, background:novoTipo&&novoValor?"linear-gradient(135deg,"+(BANCOS_META[novoTipo]?.cor||"#2ee6a0")+","+(BANCOS_META[novoTipo]?.cor||"#2ee6a0")+"cc)":"#18241f", color:novoTipo&&novoValor?"#000":"#444", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"700", fontSize:"13px", cursor:novoTipo&&novoValor?"pointer":"default" }}>
                Criar Banca
              </button>
              <button onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
                style={{ background:"transparent", color:"#666", border:"1px solid #26352e", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Editor banca inicial */}
      {editando && (
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid #f59e0b33", borderRadius:"14px", padding:"22px", marginBottom:"20px" }}>
          <p style={{ margin:"0 0 16px", color:"#f59e0b", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>Configurar Banca Inicial</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"14px", marginBottom:"16px" }}>
            {activeBancos.map(([tipo, meta]) => (
              <div key={tipo}>
                <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>
                  {meta.label} ({meta.moeda})
                </label>
                <input type="number" value={inputs[tipo]||""} onChange={e => setInputs(p => ({ ...p, [tipo]:e.target.value }))} style={inp} placeholder={"Ex: "+getBancaInicial(meta)}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <button onClick={salvarEdicao} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
              Salvar
            </button>
            <p style={{ margin:0, color:"#999", fontSize:"12px" }}>Todos os cálculos atualizam automaticamente.</p>
          </div>
        </div>
      )}

      {/* Bancos — um bloco por carteira (Conta Principal × mercado, e cada conta extra) */}
      <div style={{ display:"flex", flexDirection:"column", gap:"28px" }}>
        {carteiras.map(meta => {
          const tipo    = meta.key;
          const inicial = meta.inicial;
          const real    = bancaCarteira(entries, config, meta);
          const sacado  = totalSaques(config, tipo);
          const lim     = meta.limites;
          const lucro   = real + sacado - inicial; // resultado de trading (saque não é prejuízo)
          const pctLucro = inicial>0 ? (lucro/inicial)*100 : null;
          const fmtV    = (v) => meta.moeda + " " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
          // evolução da banca dia a dia
          const curva = curvaCarteira(entries, config, meta).map(p => p.val);
          const temOps = curva.length > 1;
          return (
            <div key={tipo}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <Selo meta={meta}/>
                  <div>
                    <p className="mtp-section-title" style={{ fontSize:"15px" }}>
                      {meta.label}
                      {meta.extra && <span style={{ marginLeft:"8px", fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", color:meta.cor, border:"1px solid "+meta.cor+"44", background:meta.cor+"12", borderRadius:"20px", padding:"1px 8px", verticalAlign:"middle" }}>{TIPOS_CONTA[meta.tipo]?.label || "conta"} · {meta.mercado}</span>}
                    </p>
                    <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>inicial {fmtV(inicial)}{sacado>0 && <span style={{ color:"#f5b941" }}> · sacado {fmtV(sacado)}</span>}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={() => abrirSaque(tipo)}
                  style={{ background:"transparent", border:"1px solid var(--line)", borderRadius:"8px", padding:"5px 12px", color:"var(--text-2)", cursor:"pointer", fontSize:"11.5px", fontWeight:"600", fontFamily:"var(--font-sans)" }}>
                  sacar
                </button>
                {meta.extra && setPagina && (
                  <button onClick={() => setPagina("config")}
                    style={{ background:"transparent", border:"1px solid var(--line)", borderRadius:"8px", padding:"5px 12px", color:"var(--text-2)", cursor:"pointer", fontSize:"11.5px", fontWeight:"600", fontFamily:"var(--font-sans)" }}>
                    editar conta
                  </button>
                )}
                {!meta.extra && !BANCOS_META[tipo]?.core && (
                  <button onClick={() => deletarBanca(tipo)}
                    style={{ background:"rgba(255,84,112,0.05)", border:"1px solid #ff547022", borderRadius:"8px", padding:"5px 12px", color:"#ff7a90", cursor:"pointer", fontSize:"11.5px", fontWeight:"600", fontFamily:"var(--font-sans)" }}>
                    remover
                  </button>
                )}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"14px" }}>
                {/* Banca atual (destaque) */}
                <div style={{ gridColumn:"span 2", background:"var(--card)", border:"1px solid "+meta.cor+"33", borderRadius:"16px", padding:"20px 22px", position:"relative", overflow:"hidden", minHeight:"140px", display:"flex", flexDirection:"column", justifyContent:"space-between", gap:"10px" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+meta.cor+",transparent)" }}/>
                  <div style={{ position:"absolute", left:"40%", right:0, bottom:0, height:"70%", opacity:0.55, pointerEvents:"none", maskImage:"linear-gradient(90deg,transparent,#000 40%)", WebkitMaskImage:"linear-gradient(90deg,transparent,#000 40%)" }}>
                    <Sparkline values={curva} color={meta.cor} width="100%" height="100%"/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative" }}>
                    <p style={kpiLabel}>Banca atual</p>
                    {temOps && pctLucro!==null && (
                      <span style={{ color:lucro>=0?"var(--pos)":"var(--neg)", background:lucro>=0?"rgba(46,230,160,0.12)":"rgba(255,84,112,0.12)", border:"1px solid "+(lucro>=0?"#2ee6a033":"#ff547033"), borderRadius:"20px", padding:"2px 9px", fontSize:"11px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>
                        {lucro>=0?"↑ +":"↓ "}{pctLucro.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p style={{ margin:0, color:meta.cor, fontSize:"clamp(24px,2.4vw,32px)", fontWeight:"700", fontFamily:"var(--font-mono)", letterSpacing:"-0.5px", position:"relative", textShadow:"0 0 24px "+meta.cor+"44" }}>
                    <CountUp value={real} format={fmtV}/>
                  </p>
                  <p style={{ margin:0, fontSize:"12px", color:lucro>=0?"var(--pos)":"var(--neg)", fontFamily:"var(--font-mono)", position:"relative" }}>
                    {temOps ? (lucro>=0?"+":"-")+fmtV(lucro)+" em trades"+(sacado>0?" · -"+fmtV(sacado)+" sacado":"") : "Sem operações registradas"}
                  </p>
                </div>
                <CardItem label="Risco / operação" value={real*lim.risco/100} fmt={fmtV} pct={lim.risco+"%"} sub="por entrada"                    color={meta.cor}/>
                <CardItem label="Meta diária"      value={real*lim.meta/100}  fmt={fmtV} pct={lim.meta+"%"}  sub="bateu, pode encerrar"           color={meta.cor}/>
                <CardItem label="Stop diário"      value={real*lim.stop/100}  fmt={fmtV} pct={lim.stop+"%"}  sub="fecha o dia obrigatoriamente"  color={colStop}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico de saques */}
      {listaSaques(config).length > 0 && (
        <div style={{ marginTop:"32px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
            <p className="mtp-section-title">Histórico de saques</p>
            <span className="mtp-section-hint">{listaSaques(config).length} {listaSaques(config).length===1?"saque":"saques"}</span>
          </div>
          <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"8px 20px" }}>
            {[...listaSaques(config)].sort((a,b)=>b.data.localeCompare(a.data)).map((sq, i, arr) => {
              const meta = carteira(config, carteiraDoSaque(sq)) || { ...(BANCOS_META[sq.mercado] || BANCOS_META.B3), label: "Conta removida" };
              return (
                <div key={sq.id} style={{ display:"grid", gridTemplateColumns:"auto 96px minmax(0,1fr) auto auto", alignItems:"center", gap:"14px", padding:"12px 0", borderBottom: i<arr.length-1 ? "1px solid var(--line)" : "none" }}>
                  <Selo meta={meta} size={26}/>
                  <span style={{ color:"var(--text-2)", fontSize:"13px", fontFamily:"var(--font-mono)" }}>{fmtData(sq.data)}</span>
                  <span style={{ color:"var(--text-3)", fontSize:"12.5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sq.obs || meta.label}</span>
                  <span style={{ color:"#f5b941", fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>-{meta.moeda} {Number(sq.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                  <button onClick={() => removerSaque(sq.id)} aria-label="Remover saque" style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:"14px", padding:"4px 6px" }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de saque */}
      {saqueAberto && (
        <Modal onClose={() => setSaqueAberto(false)} width={440}>
          <div style={{ padding:"24px 26px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"6px" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"12px", background:"rgba(245,185,65,0.12)", border:"1px solid #f5b94144", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5b941" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7 10 12 15 17 10"/><path d="M4 19h16"/></svg>
              </div>
              <div>
                <p style={{ margin:0, color:"var(--text)", fontSize:"17px", fontWeight:"800" }}>Registrar saque</p>
                <p style={{ margin:0, color:"var(--text-3)", fontSize:"12px" }}>O valor sai da banca; seus resultados de trading não mudam.</p>
              </div>
            </div>

            <p style={{ ...kpiLabel, margin:"20px 0 8px" }}>Sai de</p>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {carteiras.map(meta => (
                <button key={meta.key} onClick={() => setSaque(p => ({ ...p, cart:meta.key }))}
                  style={{ padding:"8px 12px", borderRadius:"10px", border:"1px solid "+(saque.cart===meta.key?meta.cor+"66":"var(--line)"), background:saque.cart===meta.key?meta.cor+"15":"transparent", color:saque.cart===meta.key?meta.cor:"var(--text-3)", fontSize:"12.5px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", fontFamily:"var(--font-sans)" }}>
                  <Selo meta={meta} size={22}/> {meta.label}
                </button>
              ))}
            </div>
            <p style={{ margin:"8px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>
              disponível {carteira(config, saque.cart)?.moeda} {bancaCarteira(entries, config, carteira(config, saque.cart) || carteiras[0]).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"16px" }}>
              <div>
                <p style={{ ...kpiLabel, marginBottom:"8px" }}>Valor ({carteira(config, saque.cart)?.moeda})</p>
                <input type="number" min="0" step="0.01" value={saque.valor} autoFocus onChange={e => setSaque(p => ({ ...p, valor:e.target.value }))} placeholder="0,00" style={{ ...inp, border:"1px solid var(--line-strong)" }}/>
              </div>
              <div>
                <p style={{ ...kpiLabel, marginBottom:"8px" }}>Data</p>
                <input type="date" value={saque.data} max={hojeISO()} onChange={e => setSaque(p => ({ ...p, data:e.target.value }))} style={{ ...inp, border:"1px solid var(--line-strong)", fontSize:"14px", colorScheme:"dark" }}/>
              </div>
            </div>
            <p style={{ ...kpiLabel, margin:"16px 0 8px" }}>Observação (opcional)</p>
            <input value={saque.obs} onChange={e => setSaque(p => ({ ...p, obs:e.target.value }))} placeholder="Ex: retirada mensal" style={{ ...inp, border:"1px solid var(--line-strong)", fontSize:"14px", fontWeight:"500", fontFamily:"var(--font-sans)" }}/>

            {erroSaque && <p style={{ margin:"14px 0 0", color:"#ff7a90", fontSize:"12.5px" }}>{erroSaque}</p>}

            <div style={{ display:"flex", gap:"10px", marginTop:"22px" }}>
              <button onClick={registrarSaque} style={{ flex:1, background:"linear-gradient(135deg,#f5b941,#e09a1f)", color:"#1a1204", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"800", fontSize:"13px", cursor:"pointer" }}>Confirmar saque</button>
              <button onClick={() => setSaqueAberto(false)} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {!hasData && <p style={{ margin:"20px 0 0", color:"#888", fontSize:"12px", textAlign:"center" }}>Registre operações no Diário para os valores atualizarem automaticamente.</p>}
    </div>
  );
}
