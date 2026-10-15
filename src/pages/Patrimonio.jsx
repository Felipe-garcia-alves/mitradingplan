import { useState } from "react";
import { CountUp, ProjectionChart } from "../components/ui";
import { listaCarteiras, bancaCarteira, totalSaques, totalDepositos, curvaCarteira, resultadoDia } from "../lib/banca";
import { useCotacaoUSD, paraBRL } from "../lib/cambio";

function gerarProjecao(base, meses, taxa) {
  const rows=[]; let b=base;
  for(let i=1;i<=meses;i++){
    const meta=parseFloat((b*(1+taxa)).toFixed(2));
    rows.push({val:meta}); b=meta;
  }
  return rows;
}

function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

const kpiCard  = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px", minWidth:0, display:"flex", flexDirection:"column", gap:"8px" };
const kpiLabel = { margin:0, color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };
const kpiValue = { margin:0, fontSize:"clamp(17px,1.6vw,23px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" };
const kpiSub   = { margin:0, color:"var(--text-3)", fontSize:"11.5px" };

const fmtMoeda = (v, cur) => cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

function Legenda({ color, rotulo }) {
  return (
    <div style={{ display:"flex", gap:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
        <svg width="22" height="3"><line x1="0" y1="1.5" x2="22" y2="1.5" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></svg>
        <span style={{ color:"var(--text-2)", fontSize:"11.5px" }}>{rotulo}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
        <svg width="22" height="3"><line x1="0" y1="1.5" x2="22" y2="1.5" stroke={color} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="5,3"/></svg>
        <span style={{ color:"var(--text-3)", fontSize:"11.5px" }}>Projeção 8%/mês</span>
      </div>
    </div>
  );
}

// Cotação usada para levar as carteiras em $ para R$; clique para fixar outra
function Cotacao({ cot }) {
  const [editando, setEditando] = useState(false);
  const [txt, setTxt] = useState("");
  if (editando) {
    const salvar = () => { cot.setManual(txt); setEditando(false); };
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
        <span style={{ color:"var(--text-3)", fontSize:"12px" }}>US$ 1 = R$</span>
        <input autoFocus type="number" step="0.01" value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") salvar(); if(e.key==="Escape") setEditando(false); }}
          style={{ width:"70px", background:"rgba(255,255,255,0.05)", border:"1px solid var(--line-strong)", borderRadius:"8px", padding:"5px 8px", color:"var(--text)", fontSize:"13px", fontFamily:"var(--font-mono)", outline:"none" }}/>
        <button onClick={salvar} className="mtp-ctx-ghost" style={{ padding:"4px 8px" }}>ok</button>
        {cot.origem==="manual" && <button onClick={()=>{ cot.setManual(null); setEditando(false); }} className="mtp-ctx-ghost" style={{ padding:"4px 8px" }}>usar ao vivo</button>}
      </div>
    );
  }
  return (
    <button onClick={()=>{ setTxt(cot.valor ? cot.valor.toFixed(2) : ""); setEditando(true); }} title="Clique para usar outra cotação"
      style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid var(--line)", borderRadius:"20px", padding:"6px 12px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
      <i className="mtp-dot" style={{ background: cot.origem==="ao vivo" ? "var(--accent)" : cot.origem ? "var(--warn)" : "var(--neg)", color: cot.origem==="ao vivo" ? "var(--accent)" : "var(--warn)" }}/>
      <span style={{ color:"var(--text-2)", fontSize:"12px", fontFamily:"var(--font-mono)" }}>{cot.valor ? "US$ 1 = R$ "+cot.valor.toFixed(2).replace(".",",") : "informe a cotação do dólar"}</span>
      {cot.origem && <span style={{ color:"var(--text-3)", fontSize:"11px" }}>{cot.origem}</span>}
      <span style={{ color:"var(--text-3)", fontSize:"11px" }}>✎</span>
    </button>
  );
}

// ── Visão consolidada: soma de todas as carteiras em R$ ──────────
function PatrimonioTotal({ entries, config, carteiras, cot, onAbrir }) {
  const temDolar = carteiras.some(c => c.moeda !== "R$");
  const semCot = temDolar && !cot.valor;
  const linhas = carteiras.map(c => {
    const f = paraBRL(c.moeda, cot.valor);
    const atual = bancaCarteira(entries, config, c);
    const dep = totalDepositos(config, c.key), saq = totalSaques(config, c.key);
    const lucro = atual + saq - dep - c.inicial;
    return { c, f, atual, dep, saq, lucro, aplicado: c.inicial + dep, curva: curvaCarteira(entries, config, c) };
  });
  const conta = linhas.filter(l => l.f > 0);
  const total     = conta.reduce((s,l)=>s+l.atual*l.f, 0);
  const inicial   = conta.reduce((s,l)=>s+l.c.inicial*l.f, 0);
  const aplicado  = conta.reduce((s,l)=>s+l.aplicado*l.f, 0);
  const liquido   = conta.reduce((s,l)=>s+(l.c.inicial+l.dep-l.saq)*l.f, 0);
  const lucro     = conta.reduce((s,l)=>s+l.lucro*l.f, 0);
  const pctLucro  = aplicado>0 ? lucro/aplicado*100 : 0;
  const fmtR = v => fmtMoeda(v, "R$");

  // Curva somada: em cada data, o último valor conhecido de cada carteira
  const datas = [...new Set(conta.flatMap(l => l.curva.slice(1).map(p => p.d)))].sort();
  const pos = conta.map(() => 0);
  const real = [{ d:"início", val: parseFloat(inicial.toFixed(2)) }];
  datas.forEach(d => {
    let soma = 0;
    conta.forEach((l, k) => {
      while (pos[k]+1 < l.curva.length && l.curva[pos[k]+1].d <= d) pos[k]++;
      soma += l.curva[pos[k]].val * l.f;
    });
    real.push({ d, val: parseFloat(soma.toFixed(2)) });
  });
  const proj = [{ val: total }, ...gerarProjecao(total, 12, 0.08)];
  const projSerie = proj.map((p,i)=>({ label: i===0 ? "hoje" : "M"+i, val:p.val }));

  const ordenadas = [...conta].sort((a,b)=>b.atual*b.f - a.atual*a.f);

  return (
    <>
      {semCot && (
        <div style={{ padding:"11px 16px", borderRadius:"12px", background:"rgba(245,185,65,0.06)", border:"1px solid #f5b94133", marginBottom:"14px", color:"var(--text-2)", fontSize:"12.5px" }}>
          Não consegui buscar a cotação do dólar. Informe uma no topo para incluir as contas em $ na soma.
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"14px", marginBottom:"14px" }}>
        <div style={{ ...kpiCard, borderColor:"#2ee6a033" }}>
          <p style={kpiLabel}>Patrimônio total</p>
          <p style={{ ...kpiValue, color:"var(--accent)", textShadow:"0 0 22px #2ee6a044" }}><CountUp value={total} format={fmtR}/></p>
          <p style={kpiSub}>{conta.length} conta{conta.length!==1?"s":""}{temDolar && cot.valor ? " · em R$" : ""}</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Capital próprio</p>
          <p style={{ ...kpiValue, color:"var(--text-2)" }}><CountUp value={liquido} format={fmtR}/></p>
          <p style={kpiSub}>inicial + depósitos − saques</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Resultado em trades</p>
          <p style={{ ...kpiValue, color:lucro>=0?"var(--pos)":"var(--neg)" }}><CountUp value={lucro} format={v=>(v<0?"-":"+")+fmtR(v)}/></p>
          <p style={{ ...kpiSub, color:lucro>=0?"var(--pos)":"var(--neg)", fontFamily:"var(--font-mono)" }}>{lucro>=0?"↑ +":"↓ -"}{Math.abs(pctLucro).toFixed(1)}% sobre o aplicado</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Meta 12 meses</p>
          <p style={{ ...kpiValue, color:"var(--text)" }}><CountUp value={proj[12].val} format={fmtR}/></p>
          <p style={kpiSub}>projeção a 8% ao mês</p>
        </div>
      </div>

      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px 10px", marginBottom:"14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap", marginBottom:"10px" }}>
          <p className="mtp-card-title">Evolução & Projeção · todas as contas</p>
          <Legenda color="#2ee6a0" rotulo="Patrimônio real"/>
        </div>
        <ProjectionChart real={real} proj={projSerie} base={inicial} color="#2ee6a0" cur="R$"/>
        {temDolar && cot.valor && <p style={{ margin:"6px 0 4px", color:"var(--text-3)", fontSize:"11px" }}>Contas em dólar convertidas pela cotação atual em toda a curva.</p>}
      </div>

      {/* Composição */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px 8px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"14px", gap:"10px" }}>
          <p className="mtp-card-title">Composição</p>
          <span className="mtp-section-hint">clique para ver a conta</span>
        </div>
        {total > 0 && (
          <div style={{ display:"flex", height:"10px", borderRadius:"6px", overflow:"hidden", gap:"2px", marginBottom:"12px" }}>
            {ordenadas.map(l => (
              <div key={l.c.key} title={l.c.label} style={{ width:(l.atual*l.f/total*100)+"%", background:l.c.cor, boxShadow:"0 0 10px "+l.c.cor+"66" }}/>
            ))}
          </div>
        )}
        {ordenadas.map((l, i) => {
          const pct = total>0 ? l.atual*l.f/total*100 : 0;
          const pctL = l.aplicado>0 ? l.lucro/l.aplicado*100 : 0;
          return (
            <div key={l.c.key} className="mtp-click-row" onClick={()=>onAbrir(l.c.key)}
              style={{ display:"grid", gridTemplateColumns:"minmax(0,1.4fr) minmax(0,1fr) auto", alignItems:"center", gap:"14px", paddingTop:"11px", paddingBottom:"11px", borderBottom: i<ordenadas.length-1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                <i className="mtp-dot" style={{ background:l.c.cor, color:l.c.cor }}/>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"13.5px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.c.label}</p>
                  <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>
                    {fmtMoeda(l.atual, l.c.moeda)} · <span style={{ color:pctL>=0?"var(--pos)":"var(--neg)" }}>{pctL>=0?"+":""}{pctL.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
              <div style={{ height:"5px", borderRadius:"5px", background:"var(--line)", overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", borderRadius:"5px", background:l.c.cor }}/>
              </div>
              <div style={{ textAlign:"right", minWidth:"110px" }}>
                <p style={{ margin:0, color:"var(--text)", fontSize:"13.5px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{fmtR(l.atual*l.f)}</p>
                <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>{pct.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Uma carteira ─────────────────────────────────────────────────
function PatrimonioConta({ entries, config, cart }) {
  const cur     = cart.moeda;
  const color   = cart.cor;
  const bancaIn = cart.inicial;
  const bancaAt = bancaCarteira(entries, config, cart);  // já conta depósitos e saques
  const sacado  = totalSaques(config, cart.key);
  const depositado = totalDepositos(config, cart.key);

  const sortedDays = Object.entries(entries).sort(([a],[b])=>a.localeCompare(b));
  const realPoints = curvaCarteira(entries, config, cart);  // muda na data de cada depósito/saque
  const proj       = gerarProjecao(bancaAt, 12, 0.08);
  const projPoints = [{val:bancaAt},...proj];
  const projSerie  = projPoints.map((p,i)=>({ label: i===0 ? "hoje" : "M"+i, val:p.val }));
  const lucro      = bancaAt + sacado - depositado - bancaIn; // resultado de trading
  const pctLucro   = bancaIn+depositado>0 ? (lucro/(bancaIn+depositado))*100 : 0;
  const fmtC       = v => fmtMoeda(v, cur);
  const nomeMercado = cart.curto;

  // Operacoes perdedoras
  const perdedoras = sortedDays.map(([d,e])=>({d,val:resultadoDia(e,cart)})).filter(x=>x.val<0)
    .sort((a,b)=>a.val-b.val).slice(0,5);
  const piorAbs = perdedoras.length ? Math.abs(perdedoras[0].val) : 1;

  return (
    <>
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
          <p style={kpiSub}>{sortedDays.length} dias registrados{depositado>0 && <span style={{ color:"#7fd8ff" }}> · {fmtC(depositado)} depositado</span>}{sacado>0 && <span style={{ color:"#f5b941" }}> · {fmtC(sacado)} sacado</span>}</p>
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
          <Legenda color={color} rotulo="Banca real"/>
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
    </>
  );
}

export default function Patrimonio({ entries, config }) {
  const carteiras = listaCarteiras(config);
  const [cartKey, setCartKey] = useState("todas");
  const cot = useCotacaoUSD();
  const cart = carteiras.find(c => c.key === cartKey);
  const todas = !cart;
  const temDolar = carteiras.some(c => c.moeda !== "R$");

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:"16px", flexWrap:"wrap", marginBottom:"24px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Patrimônio</h1>
          <p style={{ margin:"4px 0 0", color:"#86978f", fontSize:"13px" }}>{todas ? "A soma de todas as suas contas" : "Evolução real dia a dia vs projeção"}</p>
        </div>
        <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center" }}>
          {todas && temDolar && <Cotacao cot={cot}/>}
          <button onClick={()=>setCartKey("todas")} className={"mtp-pill"+(todas?" active":"")} style={{"--pill":"#2ee6a0"}}>Todas</button>
          {carteiras.map(c=>(
            <button key={c.key} onClick={()=>setCartKey(c.key)} className={"mtp-pill"+(cartKey===c.key?" active":"")} style={{"--pill":c.cor}}>{c.curto}</button>
          ))}
        </div>
      </div>

      {todas
        ? <PatrimonioTotal entries={entries} config={config} carteiras={carteiras} cot={cot} onAbrir={setCartKey}/>
        : <PatrimonioConta entries={entries} config={config} cart={cart}/>}
    </div>
  );
}
