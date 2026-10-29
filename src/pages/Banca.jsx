import { useState } from "react";
import { CountUp, Sparkline, Modal } from "../components/ui";
import { listaCarteiras, mercadoAtivo, carteira, bancaCarteira, totalSaques, listaSaques, totalDepositos, listaDepositos, curvaCarteira, carteiraDoSaque } from "../lib/banca";
import { TIPOS_CONTA } from "../lib/contas";
import { alfa } from "../lib/cor.js";
import { numDigitado, soNumero, paraCampo } from "../lib/numeros";

function hojeISO() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function fmtData(s) { const p = s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

const BANCOS_META = {
  B3:        { label:"Mini Índice B3",   emoji:"🇧🇷", sigla:"B3", moeda:"R$", cor:"var(--accent)", key:"bancaB3",        entry:"totalB3",        core:true  },
  Forex:     { label:"Forex",            emoji:"🌍",  sigla:"FX", moeda:"$",  cor:"var(--warn)", key:"bancaForex",     entry:"totalForex",     core:true  },
  Cripto:    { label:"Cripto",           emoji:"₿",   sigla:"₿",  moeda:"$",  cor:"#a78bfa", key:"bancaCripto",    entry:"totalCripto",    core:false },
  Americano: { label:"Ações Americanas", emoji:"🇺🇸",  sigla:"US", moeda:"$",  cor:"#60a5fa", key:"bancaAmericano", entry:"totalAmericano", core:false },
};

const kpiLabel = { margin:0, color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };

// pct é o % da banca; onPct (opcional) deixa trocar o % clicando nele
function CardItem({ label, value, fmt, sub, color, pct, onPct, dica }) {
  const [editando, setEditando] = useState(false);
  const [txt, setTxt] = useState("");
  const pill = { color, background:alfa(color,"15"), border:"1px solid "+alfa(color,"33"), borderRadius:"20px", padding:"1px 8px", fontSize:"10.5px", fontWeight:"700", fontFamily:"var(--font-mono)" };
  function abrir() { setTxt(String(pct).replace(".", ",")); setEditando(true); }
  function salvar() {
    const v = numDigitado(txt);
    setEditando(false);
    if (v > 0 && v <= 100 && v !== pct) onPct(Math.round(v * 100) / 100);
  }
  return (
    <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px", minWidth:0, display:"flex", flexDirection:"column", justifyContent:"space-between", gap:"10px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", left:0, top:"18px", bottom:"18px", width:"3px", borderRadius:"0 3px 3px 0", background:color, boxShadow:"0 0 10px "+color }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
        <p style={kpiLabel}>{label}</p>
        {editando ? (
          <span style={{ ...pill, display:"inline-flex", alignItems:"center", padding:"0 8px" }}>
            <input autoFocus value={txt} inputMode="decimal" onChange={e=>setTxt(soNumero(e.target.value, { negativo:false }))}
              onBlur={salvar} onKeyDown={e=>{ if (e.key==="Enter") salvar(); if (e.key==="Escape") setEditando(false); }}
              style={{ width:"38px", background:"none", border:0, outline:"none", color, font:"inherit", textAlign:"right", padding:"2px 0" }}/>%
          </span>
        ) : onPct ? (
          <button type="button" onClick={abrir} title={"Clique para mudar o %"+(dica ? " · "+dica : "")} className="mtp-pct-edit" style={{ ...pill, cursor:"pointer" }}>
            {String(pct).replace(".", ",")}% <span style={{ opacity:.6 }}>✎</span>
          </button>
        ) : <span style={pill}>{pct}</span>}
      </div>
      <p style={{ margin:0, color, fontSize:"clamp(17px,1.5vw,22px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}><CountUp value={value} format={fmt}/></p>
      <p style={{ margin:0, color:"var(--text-3)", fontSize:"11.5px" }}>{sub}</p>
    </div>
  );
}

function Selo({ meta, size=34 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"10px", background:alfa(meta.cor,"18"), border:"1px solid "+alfa(meta.cor,"44"), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 0 18px -6px "+meta.cor }}>
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
  const [saque,      setSaque]      = useState({ tipo:"saque", cart:"B3", valor:"", data:hojeISO(), obs:"" });
  const [erroSaque,  setErroSaque]  = useState("");
  const hasData = Object.keys(entries).length > 0;

  const activeBancos    = Object.entries(BANCOS_META).filter(([tipo]) => mercadoAtivo(config, tipo));
  const availableBancos = Object.entries(BANCOS_META).filter(([tipo]) => !mercadoAtivo(config, tipo));
  const carteiras = listaCarteiras(config);

  function getBancaInicial(meta) {
    if (meta.key === "bancaB3")    return config?.bancaB3    ?? 3000;
    if (meta.key === "bancaForex") return config?.bancaForex ?? 200;
    return config?.[meta.key] ?? 0;
  }

  // Saque e depósito usam o mesmo modal; "tipo" decide para qual lista vai
  function abrirSaque(cartKey, tipo = "saque") {
    setSaque({ tipo, cart: cartKey || carteiras[0].key, valor:"", data:hojeISO(), obs:"" });
    setErroSaque("");
    setSaqueAberto(true);
  }

  async function registrarSaque() {
    const dep = saque.tipo === "deposito";
    const valor = numDigitado(saque.valor);
    const cart = carteira(config, saque.cart);
    if (!cart) { setErroSaque(dep ? "Escolha para onde vai o depósito." : "Escolha de onde sai o saque."); return; }
    if (!valor || valor <= 0) { setErroSaque("Informe um valor maior que zero."); return; }
    if (!saque.data) { setErroSaque(dep ? "Informe a data do depósito." : "Informe a data do saque."); return; }
    const disponivel = bancaCarteira(entries, config, cart);
    if (!dep && valor > disponivel + 0.005) { setErroSaque("O saque é maior que a banca disponível ("+cart.moeda+" "+disponivel.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+")."); return; }
    const novo = { id: crypto.randomUUID(), data: saque.data, valor: parseFloat(valor.toFixed(2)), carteira: cart.key, mercado: cart.mercado, obs: saque.obs.trim() };
    const lista = dep ? "depositos" : "saques";
    await saveConfig({ ...config, [lista]: [...(config?.[lista] || []), novo] });
    setSaqueAberto(false);
    setMsg(dep ? "✓ Depósito registrado!" : "✓ Saque registrado!"); setTimeout(() => setMsg(""), 2500);
  }

  async function removerMov(mov) {
    const dep = mov._tipo === "deposito";
    if (!window.confirm(dep ? "Remover este depósito? O valor sai da banca." : "Remover este saque? A banca volta a contar esse valor.")) return;
    const lista = dep ? "depositos" : "saques";
    await saveConfig({ ...config, [lista]: (config?.[lista] || []).filter(x => x.id !== mov.id) });
  }

  async function salvarEdicao() {
    const nc = { ...config };
    activeBancos.forEach(([tipo, meta]) => {
      const v = numDigitado(inputs[tipo]);
      if (v !== null && v >= 0) nc[meta.key] = v;
    });
    await saveConfig(nc);
    setEditando(false);
    setMsg("✓ Banca atualizada!"); setTimeout(() => setMsg(""), 2500);
  }

  async function criarBanca() {
    const valorNovo = numDigitado(novoValor);
    if (!novoTipo || valorNovo === null || valorNovo < 0) return;
    await saveConfig({ ...config, [BANCOS_META[novoTipo].key]: valorNovo, bancasExcluidas: (config?.bancasExcluidas || []).filter(x => x !== novoTipo) });
    setShowCriar(false); setNovoTipo(""); setNovoValor("");
    setMsg("✓ Banca criada!"); setTimeout(() => setMsg(""), 2500);
  }

  // % de risco/meta/stop: cada banca da Conta Principal guarda os seus em
  // config.limitesPorMercado; cada conta extra guarda nos próprios limites
  async function salvarLimite(cart, campo, valor) {
    const novos = { ...cart.limites, [campo]: valor };
    if (!cart.extra) return saveConfig({ ...config, limitesPorMercado: { ...(config?.limitesPorMercado || {}), [cart.mercado]: novos } });
    await saveConfig({ ...config, contas: (config?.contas || []).map(c => c.id === cart.contaId ? { ...c, limites: novos } : c) });
  }

  async function deletarBanca(tipo) {
    if (!window.confirm("Excluir a banca "+BANCOS_META[tipo].label+"? Os saques e depósitos dela são apagados. As operações continuam no Diário, e dá para recriar a banca depois em Adicionar banca.")) return;
    const nc = { ...config };
    delete nc[BANCOS_META[tipo].key];
    if (BANCOS_META[tipo].core) nc.bancasExcluidas = [...new Set([...(nc.bancasExcluidas || []), tipo])];
    nc.saques = (nc.saques || []).filter(x => carteiraDoSaque(x) !== tipo);
    nc.depositos = (nc.depositos || []).filter(x => carteiraDoSaque(x) !== tipo);
    await saveConfig(nc);
    setMsg("Banca removida."); setTimeout(() => setMsg(""), 2500);
  }

  const colStop = "var(--neg)";
  const inp = { width:"100%", background:"color-mix(in srgb, var(--ink) 7%, transparent)", border:"1px solid var(--line-strong)", borderRadius:"10px", padding:"11px 13px", color:"var(--text)", fontSize:"16px", fontWeight:"700", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-mono)" };


  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"var(--text)", letterSpacing:"-0.8px" }}>Gestão de Banca</h1>
          <p style={{ margin:"4px 0 0", color:"var(--text-mute)", fontSize:"13px" }}>Referências de risco calculadas sobre sua banca real</p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
          {msg && <span style={{ color:"var(--accent)", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
          <button onClick={() => abrirSaque(undefined, "deposito")}
            style={{ background:"color-mix(in srgb, var(--info) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--info) 26.7%, transparent)", borderRadius:"8px", padding:"8px 16px", color:"var(--info)", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="15" x2="12" y2="3"/><polyline points="7 8 12 3 17 8"/><path d="M4 19h16"/></svg>
            Depositar
          </button>
          <button onClick={() => abrirSaque()}
            style={{ background:"color-mix(in srgb, var(--warn) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)", borderRadius:"8px", padding:"8px 16px", color:"var(--warn)", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:"6px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7 10 12 15 17 10"/><path d="M4 19h16"/></svg>
            Registrar saque
          </button>
          {availableBancos.length > 0 && (
            <button onClick={() => { setShowCriar(true); setNovoTipo(availableBancos[0][0]); }}
              style={{ background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 26.7%, transparent)", borderRadius:"8px", padding:"8px 16px", color:"var(--accent)", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)", display:"flex", alignItems:"center", gap:"6px" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Criar Banca
            </button>
          )}
          <button onClick={() => {
            const init = {};
            activeBancos.forEach(([tipo, meta]) => { init[tipo] = paraCampo(getBancaInicial(meta)); });
            setInputs(init);
            setEditando(!editando);
          }} style={{ background:"color-mix(in srgb, var(--ink) 4%, transparent)", border:"1px solid var(--line-strong)", borderRadius:"8px", padding:"8px 16px", color:"var(--text-soft)", fontSize:"12px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
            {editando ? "✕ Cancelar" : "Editar banca inicial"}
          </button>
        </div>
      </div>

      {/* Modal Criar Banca */}
      {showCriar && (
        <>
          <div onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200 }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"var(--surface)", border:"1px solid var(--line-strong)", borderRadius:"20px", padding:"28px", zIndex:201, width:"380px", maxWidth:"92vw", boxShadow:"0 24px 60px color-mix(in srgb, var(--shade) 80%, transparent)" }}>
            <p style={{ margin:"0 0 4px", color:"var(--text)", fontSize:"16px", fontWeight:"800" }}>Criar Nova Banca</p>
            <p style={{ margin:"0 0 22px", color:"var(--text-3)", fontSize:"12px" }}>Escolha o mercado e defina o capital inicial</p>
            <div style={{ display:"flex", gap:"8px", marginBottom:"20px", flexWrap:"wrap" }}>
              {availableBancos.map(([tipo, meta]) => (
                <button key={tipo} onClick={() => setNovoTipo(tipo)}
                  style={{ padding:"10px 16px", borderRadius:"10px", border:"1px solid "+(novoTipo===tipo?alfa(meta.cor,"66"):"var(--line-strong)"), background:novoTipo===tipo?alfa(meta.cor,"15"):"color-mix(in srgb, var(--ink) 2%, transparent)", color:novoTipo===tipo?meta.cor:"var(--text-3)", fontSize:"13px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", transition:"all 0.15s" }}>
                  <Selo meta={meta} size={22}/> {meta.label}
                </button>
              ))}
            </div>
            {novoTipo && (
              <div style={{ marginBottom:"20px" }}>
                <label style={{ color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>
                  Capital inicial ({BANCOS_META[novoTipo].moeda})
                </label>
                <input type="text" inputMode="decimal" value={novoValor} onChange={e => setNovoValor(soNumero(e.target.value, { negativo:false }))}
                  placeholder={BANCOS_META[novoTipo].key==="bancaCripto"?"Ex: 500":"Ex: 1000"}
                  style={{ ...inp, borderColor:alfa(BANCOS_META[novoTipo].cor,"44") }} autoFocus/>
              </div>
            )}
            <div style={{ display:"flex", gap:"8px" }}>
              <button onClick={criarBanca} disabled={!novoTipo || !novoValor}
                style={{ flex:1, background:novoTipo&&novoValor?"linear-gradient(135deg,"+(BANCOS_META[novoTipo]?.cor||"#2ee6a0")+","+alfa(BANCOS_META[novoTipo]?.cor||"#2ee6a0","cc")+")":"var(--line)", color:novoTipo&&novoValor?"#000":"var(--text-5)", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"700", fontSize:"13px", cursor:novoTipo&&novoValor?"pointer":"default" }}>
                Criar Banca
              </button>
              <button onClick={() => { setShowCriar(false); setNovoTipo(""); setNovoValor(""); }}
                style={{ background:"transparent", color:"var(--text-mute)", border:"1px solid var(--line-strong)", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Editor banca inicial */}
      {editando && (
        <div style={{ background:"color-mix(in srgb, var(--warn-2) 6%, transparent)", border:"1px solid color-mix(in srgb, var(--warn-2) 20%, transparent)", borderRadius:"14px", padding:"22px", marginBottom:"20px" }}>
          <p style={{ margin:"0 0 16px", color:"var(--warn-2)", fontSize:"12px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>Configurar Banca Inicial</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"14px", marginBottom:"16px" }}>
            {activeBancos.map(([tipo, meta]) => (
              <div key={tipo}>
                <label style={{ color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>
                  {meta.label} ({meta.moeda})
                </label>
                <input type="text" inputMode="decimal" value={inputs[tipo]||""} onChange={e => setInputs(p => ({ ...p, [tipo]:soNumero(e.target.value, { negativo:false }) }))} style={inp} placeholder={"Ex: "+getBancaInicial(meta)}/>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <button onClick={salvarEdicao} style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
              Salvar
            </button>
            <p style={{ margin:0, color:"var(--text-mute)", fontSize:"12px" }}>Todos os cálculos atualizam automaticamente.</p>
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
          const depositado = totalDepositos(config, tipo);
          const lim     = meta.limites;
          const lucro   = real + sacado - depositado - inicial; // resultado de trading (saque/depósito não contam)
          const pctLucro = inicial+depositado>0 ? (lucro/(inicial+depositado))*100 : null;
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
                      {meta.extra && <span style={{ marginLeft:"8px", fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", color:meta.cor, border:"1px solid "+alfa(meta.cor,"44"), background:alfa(meta.cor,"12"), borderRadius:"20px", padding:"1px 8px", verticalAlign:"middle" }}>{TIPOS_CONTA[meta.tipo]?.label || "conta"} · {meta.mercado}</span>}
                    </p>
                    <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>inicial {fmtV(inicial)}{depositado>0 && <span style={{ color:"var(--info)" }}> · depositado {fmtV(depositado)}</span>}{sacado>0 && <span style={{ color:"var(--warn)" }}> · sacado {fmtV(sacado)}</span>}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={() => abrirSaque(tipo, "deposito")}
                  style={{ background:"transparent", border:"1px solid var(--line)", borderRadius:"8px", padding:"5px 12px", color:"var(--text-2)", cursor:"pointer", fontSize:"11.5px", fontWeight:"600", fontFamily:"var(--font-sans)" }}>
                  depositar
                </button>
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
                {!meta.extra && carteiras.length > 1 && (
                  <button onClick={() => deletarBanca(tipo)} title="Excluir esta banca"
                    style={{ background:"color-mix(in srgb, var(--neg) 5%, transparent)", border:"1px solid color-mix(in srgb, var(--neg) 13.3%, transparent)", borderRadius:"8px", padding:"5px 12px", color:"var(--neg-soft)", cursor:"pointer", fontSize:"11.5px", fontWeight:"600", fontFamily:"var(--font-sans)" }}>
                    remover
                  </button>
                )}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"14px" }}>
                {/* Banca atual (destaque) */}
                <div style={{ gridColumn:"span 2", background:"var(--card)", border:"1px solid "+alfa(meta.cor,"33"), borderRadius:"16px", padding:"20px 22px", position:"relative", overflow:"hidden", minHeight:"140px", display:"flex", flexDirection:"column", justifyContent:"space-between", gap:"10px" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+meta.cor+",transparent)" }}/>
                  <div style={{ position:"absolute", left:"40%", right:0, bottom:0, height:"70%", opacity:0.55, pointerEvents:"none", maskImage:"linear-gradient(90deg,transparent,#000 40%)", WebkitMaskImage:"linear-gradient(90deg,transparent,#000 40%)" }}>
                    <Sparkline values={curva} color={meta.cor} width="100%" height="100%"/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", position:"relative" }}>
                    <p style={kpiLabel}>Banca atual</p>
                    {temOps && pctLucro!==null && (
                      <span style={{ color:lucro>=0?"var(--pos)":"var(--neg)", background:lucro>=0?"color-mix(in srgb, var(--accent) 12%, transparent)":"color-mix(in srgb, var(--neg) 12%, transparent)", border:"1px solid "+(lucro>=0?"color-mix(in srgb, var(--accent) 20%, transparent)":"color-mix(in srgb, var(--neg) 20%, transparent)"), borderRadius:"20px", padding:"2px 9px", fontSize:"11px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>
                        {lucro>=0?"↑ +":"↓ "}{pctLucro.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p style={{ margin:0, color:meta.cor, fontSize:"clamp(24px,2.4vw,32px)", fontWeight:"700", fontFamily:"var(--font-mono)", letterSpacing:"-0.5px", position:"relative", textShadow:"0 0 24px "+alfa(meta.cor,"44") }}>
                    <CountUp value={real} format={fmtV}/>
                  </p>
                  <p style={{ margin:0, fontSize:"12px", color:lucro>=0?"var(--pos)":"var(--neg)", fontFamily:"var(--font-mono)", position:"relative" }}>
                    {temOps ? (lucro>=0?"+":"-")+fmtV(lucro)+" em trades"+(depositado>0?" · +"+fmtV(depositado)+" depositado":"")+(sacado>0?" · -"+fmtV(sacado)+" sacado":"") : "Sem operações registradas"}
                  </p>
                </div>
                {[
                  ["risco", "Risco / operação", "por entrada",                  meta.cor],
                  ["meta",  "Meta diária",      "bateu, pode encerrar",         meta.cor],
                  ["stop",  "Stop diário",      "fecha o dia obrigatoriamente", colStop],
                ].map(([campo, label, sub, cor]) => (
                  <CardItem key={campo} label={label} value={real*lim[campo]/100} fmt={fmtV} pct={lim[campo]} sub={sub} color={cor}
                    onPct={v=>salvarLimite(meta, campo, v)} dica={"só nesta banca"}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Histórico de depósitos e saques */}
      {(() => {
        const movs = [
          ...listaSaques(config).map(m => ({ ...m, _tipo:"saque" })),
          ...listaDepositos(config).map(m => ({ ...m, _tipo:"deposito" })),
        ].sort((a,b) => b.data.localeCompare(a.data));
        if (movs.length === 0) return null;
        return (
          <div style={{ marginTop:"32px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
              <p className="mtp-section-title">Depósitos e saques</p>
              <span className="mtp-section-hint">{movs.length} {movs.length===1?"movimentação":"movimentações"}</span>
            </div>
            <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"8px 20px" }}>
              {movs.map((sq, i) => {
                const meta = carteira(config, carteiraDoSaque(sq)) || { ...(BANCOS_META[sq.mercado] || BANCOS_META.B3), label: "Conta removida" };
                const dep = sq._tipo === "deposito";
                return (
                  <div key={sq._tipo+sq.id} style={{ display:"grid", gridTemplateColumns:"auto 96px minmax(0,1fr) auto auto", alignItems:"center", gap:"14px", padding:"12px 0", borderBottom: i<movs.length-1 ? "1px solid var(--line)" : "none" }}>
                    <Selo meta={meta} size={26}/>
                    <span style={{ color:"var(--text-2)", fontSize:"13px", fontFamily:"var(--font-mono)" }}>{fmtData(sq.data)}</span>
                    <span style={{ color:"var(--text-3)", fontSize:"12.5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      <span style={{ color: dep ? "var(--info)" : "var(--warn)", fontWeight:"700", marginRight:"8px" }}>{dep ? "Depósito" : "Saque"}</span>{sq.obs || meta.label}
                    </span>
                    <span style={{ color: dep ? "var(--info)" : "var(--warn)", fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{dep ? "+" : "-"}{meta.moeda} {Number(sq.valor).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    <button onClick={() => removerMov(sq)} aria-label={dep ? "Remover depósito" : "Remover saque"} style={{ background:"none", border:"none", color:"var(--text-3)", cursor:"pointer", fontSize:"14px", padding:"4px 6px" }}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Modal de depósito / saque */}
      {saqueAberto && (() => {
        const dep = saque.tipo === "deposito";
        const cor = dep ? "var(--info)" : "var(--warn)";
        return (
        <Modal onClose={() => setSaqueAberto(false)} width={440}>
          <div style={{ padding:"24px 26px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px" }}>
              <div style={{ width:"40px", height:"40px", borderRadius:"12px", background:alfa(cor,"1f"), border:"1px solid "+alfa(cor,"44"), display:"flex", alignItems:"center", justifyContent:"center" }}>
                {dep
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="15" x2="12" y2="3"/><polyline points="7 8 12 3 17 8"/><path d="M4 19h16"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="7 10 12 15 17 10"/><path d="M4 19h16"/></svg>}
              </div>
              <div>
                <p style={{ margin:0, color:"var(--text)", fontSize:"17px", fontWeight:"800" }}>{dep ? "Registrar depósito" : "Registrar saque"}</p>
                <p style={{ margin:0, color:"var(--text-3)", fontSize:"12px" }}>{dep ? "O valor entra na banca; não conta como lucro de trade." : "O valor sai da banca; seus resultados de trading não mudam."}</p>
              </div>
            </div>

            <div className="mtp-opcoes" style={{ display:"inline-flex" }}>
              <button onClick={() => { setSaque(p => ({ ...p, tipo:"deposito" })); setErroSaque(""); }} className={"mtp-opcao"+(dep?" ativo":"")} style={dep?{color:"var(--info)"}:undefined}>Depósito</button>
              <button onClick={() => { setSaque(p => ({ ...p, tipo:"saque" })); setErroSaque(""); }} className={"mtp-opcao"+(!dep?" ativo":"")} style={!dep?{color:"var(--warn)"}:undefined}>Saque</button>
            </div>

            <p style={{ ...kpiLabel, margin:"20px 0 8px" }}>{dep ? "Entra em" : "Sai de"}</p>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {carteiras.map(meta => (
                <button key={meta.key} onClick={() => setSaque(p => ({ ...p, cart:meta.key }))}
                  style={{ padding:"8px 12px", borderRadius:"10px", border:"1px solid "+(saque.cart===meta.key?alfa(meta.cor,"66"):"var(--line)"), background:saque.cart===meta.key?alfa(meta.cor,"15"):"transparent", color:saque.cart===meta.key?meta.cor:"var(--text-3)", fontSize:"12.5px", fontWeight:"700", cursor:"pointer", display:"flex", alignItems:"center", gap:"8px", fontFamily:"var(--font-sans)" }}>
                  <Selo meta={meta} size={22}/> {meta.label}
                </button>
              ))}
            </div>
            <p style={{ margin:"8px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>
              {dep ? "banca atual" : "disponível"} {carteira(config, saque.cart)?.moeda} {bancaCarteira(entries, config, carteira(config, saque.cart) || carteiras[0]).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </p>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"16px" }}>
              <div>
                <p style={{ ...kpiLabel, marginBottom:"8px" }}>Valor ({carteira(config, saque.cart)?.moeda})</p>
                <input type="text" inputMode="decimal" value={saque.valor} autoFocus onChange={e => setSaque(p => ({ ...p, valor:soNumero(e.target.value, { negativo:false }) }))} placeholder="0,00" style={{ ...inp, border:"1px solid var(--line-strong)" }}/>
              </div>
              <div>
                <p style={{ ...kpiLabel, marginBottom:"8px" }}>Data</p>
                <input type="date" value={saque.data} max={hojeISO()} onChange={e => setSaque(p => ({ ...p, data:e.target.value }))} style={{ ...inp, border:"1px solid var(--line-strong)", fontSize:"14px", colorScheme:"dark" }}/>
              </div>
            </div>
            <p style={{ ...kpiLabel, margin:"16px 0 8px" }}>Observação (opcional)</p>
            <input value={saque.obs} onChange={e => setSaque(p => ({ ...p, obs:e.target.value }))} placeholder={dep ? "Ex: aporte mensal" : "Ex: retirada mensal"} style={{ ...inp, border:"1px solid var(--line-strong)", fontSize:"14px", fontWeight:"500", fontFamily:"var(--font-sans)" }}/>

            {erroSaque && <p style={{ margin:"14px 0 0", color:"var(--neg-soft)", fontSize:"12.5px" }}>{erroSaque}</p>}

            <div style={{ display:"flex", gap:"10px", marginTop:"22px" }}>
              <button onClick={registrarSaque} style={{ flex:1, background: dep ? "linear-gradient(135deg,#7fd8ff,#3fb6e8)" : "linear-gradient(135deg,#f5b941,#e09a1f)", color: dep ? "#04141a" : "#1a1204", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"800", fontSize:"13px", cursor:"pointer" }}>{dep ? "Confirmar depósito" : "Confirmar saque"}</button>
              <button onClick={() => setSaqueAberto(false)} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
            </div>
          </div>
        </Modal>
        );
      })()}

      {!hasData && <p style={{ margin:"20px 0 0", color:"var(--text-soft)", fontSize:"12px", textAlign:"center" }}>Registre operações no Diário para os valores atualizarem automaticamente.</p>}
    </div>
  );
}
