import { useState } from "react";
import { CountUp, Sparkline } from "../components/ui";
import { listaCarteiras, bancaCarteira, totalSaques, listaSaques, totalDepositos, listaDepositos, resultadoDia, curvaCarteira } from "../lib/banca";

const rotulo = { margin:0, color:"var(--text-3)", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

// ── Todas as contas lado a lado: quanto cada uma cresceu e como vai o mês ──
function ContasResumo({ entries, config, carteiras, taxa, selecionada, onSelecionar }) {
  const hoje = new Date();
  const mesAtual = hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  const linhas = carteiras.map(c => {
    const atual = bancaCarteira(entries, config, c);
    const dep = totalDepositos(config, c.key), saq = totalSaques(config, c.key);
    const lucro = atual + saq - dep - c.inicial;
    const aplicado = c.inicial + dep;
    const inicioMes = bancaCarteira(entries, config, c, { antes: mesAtual+"-01" });
    const resMes = Object.entries(entries).filter(([d]) => d.startsWith(mesAtual)).reduce((t,[,e]) => t + resultadoDia(e, c), 0);
    const metaMes = inicioMes * taxa / 100;
    return { c, atual, lucro, pct: aplicado>0 ? lucro/aplicado*100 : 0, resMes, metaMes, curva: curvaCarteira(entries, config, c).map(p=>p.val) };
  });
  const melhor = linhas.length > 1 ? linhas.reduce((a,b) => b.pct > a.pct ? b : a) : null;
  const fmtC = (v, cur) => cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

  return (
    <div style={{ marginBottom:"44px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"18px" }}>
        <p className="mtp-section-title">Crescimento das contas</p>
        <span className="mtp-section-hint">clique para ver o detalhe</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:"18px" }}>
        {linhas.map(l => {
          const sel = l.c.key === selecionada;
          const pos = l.pct >= 0;
          const progresso = l.metaMes>0 ? Math.max(0, Math.min(100, l.resMes/l.metaMes*100)) : 0;
          const bateu = l.metaMes>0 && l.resMes >= l.metaMes;
          return (
            <div key={l.c.key} onClick={()=>onSelecionar(l.c.key)}
              style={{ background:"var(--card)", border:"1px solid "+(sel ? l.c.cor+"66" : "var(--line)"), borderRadius:"18px", padding:"22px 24px", cursor:"pointer", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", gap:"18px", minWidth:0 }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+l.c.cor+(sel?"":"88")+",transparent 70%)" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                  <i className="mtp-dot" style={{ background:l.c.cor, color:l.c.cor }}/>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"15px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.c.label}</p>
                </div>
                {melhor === l && l.pct > 0 && <span style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", padding:"3px 9px", borderRadius:"20px", color:"#f5b941", border:"1px solid #f5b94144", background:"#f5b94112", whiteSpace:"nowrap" }}>★ melhor</span>}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:"12px" }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ ...rotulo, marginBottom:"6px" }}>Crescimento em trades</p>
                  <p style={{ margin:0, color:pos?"var(--pos)":"var(--neg)", fontSize:"30px", fontWeight:"700", fontFamily:"var(--font-mono)", letterSpacing:"-0.8px", lineHeight:1 }}>
                    <CountUp value={l.pct} format={v=>(v>=0?"+":"")+v.toFixed(1)+"%"}/>
                  </p>
                </div>
                <div style={{ width:"42%", height:"40px", opacity:0.7, flexShrink:0 }}>
                  <Sparkline values={l.curva} color={l.c.cor} width="100%" height="100%"/>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div>
                  <p style={rotulo}>Banca</p>
                  <p style={{ margin:"5px 0 0", color:"var(--text)", fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{fmtC(l.atual, l.c.moeda)}</p>
                </div>
                <div>
                  <p style={rotulo}>Lucro</p>
                  <p style={{ margin:"5px 0 0", color:pos?"var(--pos)":"var(--neg)", fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{pos?"+":"-"}{fmtC(l.lucro, l.c.moeda)}</p>
                </div>
              </div>
              <div style={{ paddingTop:"16px", borderTop:"1px solid var(--line)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"8px", gap:"8px" }}>
                  <p style={rotulo}>Este mês</p>
                  <span style={{ fontSize:"12px", fontFamily:"var(--font-mono)", color:"var(--text-3)" }}>
                    <span style={{ color:l.resMes>=0?"var(--pos)":"var(--neg)", fontWeight:"700" }}>{l.resMes>=0?"+":"-"}{fmtC(l.resMes, l.c.moeda)}</span>
                    {" / "}{bateu ? <span style={{ color:"var(--pos)" }}>meta ✓</span> : "meta "+fmtC(l.metaMes, l.c.moeda)}
                  </span>
                </div>
                <div style={{ height:"5px", borderRadius:"5px", background:"var(--line)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:progresso+"%", borderRadius:"5px", background:l.c.cor, boxShadow:"0 0 8px "+l.c.cor+"88" }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Crescimento({ entries, config }) {
  const carteiras = listaCarteiras(config);
  const [cartKey, setCartKey] = useState(carteiras[0].key);
  const [taxa,   setTaxa]   = useState(8);

  const cart    = carteiras.find(c => c.key === cartKey) || carteiras[0];
  const cur     = cart.moeda;
  const color   = cart.cor;
  const bancaIn = cart.inicial;
  const bancaAt = bancaCarteira(entries, config, cart);   // já conta depósitos e saques
  const sacado  = totalSaques(config, cart.key);
  const depositado = totalDepositos(config, cart.key);
  const projecao= gerarProjecao(bancaAt, 12, taxa/100);

  // Cada mês realizado tem a própria meta: banca no início do mês × taxa.
  // Compara com o resultado de trades do mês; saque/depósito mexem na banca, mas não são resultado.
  const porMes = {};
  Object.entries(entries).forEach(([d,e]) => {
    const v = resultadoDia(e, cart);
    if (!v) return;
    const k = monthKey(d);
    if (!porMes[k]) porMes[k] = { res:0, saq:0, dep:0 };
    porMes[k].res += v;
  });
  listaSaques(config, cart.key).forEach(sq => {
    const k = monthKey(sq.data);
    if (!porMes[k]) porMes[k] = { res:0, saq:0, dep:0 };
    porMes[k].saq += Number(sq.valor) || 0;
  });
  listaDepositos(config, cart.key).forEach(dp => {
    const k = monthKey(dp.data);
    if (!porMes[k]) porMes[k] = { res:0, saq:0, dep:0 };
    porMes[k].dep += Number(dp.valor) || 0;
  });
  const hoje     = new Date();
  const mesAtual = hoje.getFullYear()+"-"+String(hoje.getMonth()+1).padStart(2,"0");
  const realizados = [];
  let bancaMes = bancaIn;
  for (const k of Object.keys(porMes).sort()) {
    const { res, saq, dep } = porMes[k];
    const inicio    = bancaMes;
    const metaLucro = inicio * taxa/100;
    bancaMes = inicio + res + dep - saq;
    realizados.push({ mk:k, inicio, metaLucro, res, saq, dep, fim:bancaMes, bateu: res >= metaLucro, emAndamento: k === mesAtual });
  }
  const fechados  = realizados.filter(r => !r.emAndamento);
  // Ritmo real: rendimento médio (resultado ÷ banca de início) dos últimos 3 meses fechados
  const recentes  = fechados.slice(-3).filter(r => r.inicio > 0);
  const ritmo     = recentes.length ? recentes.reduce((t,r) => t + r.res/r.inicio, 0) / recentes.length : null;
  const projRitmo = ritmo !== null ? gerarProjecao(bancaAt, 12, ritmo) : null;
  const fmtPct    = v => (v>=0?"+":"")+(v*100).toFixed(1).replace(".",",")+"%";
  const batidos   = fechados.filter(r => r.bateu).length;
  const ultimos   = realizados.slice(-12);
  const nomeFuturo = i => { const d = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1); return MONTH_NAMES[d.getMonth()]+" "+d.getFullYear(); };

  const fmtC = v => cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const lucroTotal = bancaAt + sacado - depositado - bancaIn; // resultado de trading
  const metaFinal  = projecao[11]?.metaFinal ?? bancaAt;

  const kpiCard  = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"18px", padding:"22px 24px", minWidth:0, display:"flex", flexDirection:"column", gap:"10px" };
  const kpiValue = { margin:0, fontSize:"clamp(19px,1.8vw,26px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", letterSpacing:"-0.5px" };
  const kpiSub   = { margin:0, color:"var(--text-3)", fontSize:"12px", lineHeight:1.5 };
  const painel   = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"18px", padding:"8px 24px" };
  const maxProj  = Math.max(1, ...projecao.map(p => p.metaFinal), ...(projRitmo||[]).map(p => p.metaFinal));
  const corRitmo = "#7fd8ff";

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:"16px", flexWrap:"wrap", marginBottom:"32px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Crescimento</h1>
          <p style={{ margin:"6px 0 0", color:"#86978f", fontSize:"13px" }}>Quanto cada conta cresceu e para onde vai, mantendo a taxa mensal</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"4px 6px 4px 14px", borderRadius:"20px", border:"1px solid var(--line)" }}>
          <label style={{ color:"var(--text-3)", fontSize:"12px" }}>Taxa mensal</label>
          <input type="number" value={taxa} min="1" max="50" onChange={e=>setTaxa(Number(e.target.value))} style={{ width:"52px", background:"rgba(255,255,255,0.05)", border:"1px solid var(--line-strong)", borderRadius:"14px", padding:"4px 8px", color:"#f0f0f0", fontSize:"13px", fontWeight:"700", outline:"none", textAlign:"center", fontFamily:"var(--font-mono)" }}/>
          <span style={{ color:"var(--text-3)", fontSize:"12px", paddingRight:"6px" }}>%</span>
        </div>
      </div>

      {carteiras.length > 1 && <ContasResumo entries={entries} config={config} carteiras={carteiras} taxa={taxa} selecionada={cart.key} onSelecionar={setCartKey}/>}

      {/* Detalhe da conta escolhida */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap", marginBottom:"18px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <i className="mtp-dot" style={{ background:color, color }}/>
          <p className="mtp-section-title">Detalhe · {cart.label}</p>
        </div>
        {carteiras.length > 1 && (
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {carteiras.map(c=>(
              <button key={c.key} onClick={()=>setCartKey(c.key)} className={"mtp-pill"+(cart.key===c.key?" active":"")} style={{"--pill":c.cor}}>{c.curto}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"18px", marginBottom:"18px" }}>
        <div style={{ ...kpiCard, borderColor:color+"33" }}>
          <p style={rotulo}>Banca hoje</p>
          <p style={{ ...kpiValue, color, textShadow:"0 0 22px "+color+"44" }}><CountUp value={bancaAt} format={fmtC}/></p>
          <p style={kpiSub}>começou com {fmtC(bancaIn)}{depositado>0 && <span style={{ color:"#7fd8ff" }}> · +{fmtC(depositado)} depositado</span>}{sacado>0 && <span style={{ color:"#f5b941" }}> · −{fmtC(sacado)} sacado</span>}</p>
        </div>
        <div style={kpiCard}>
          <p style={rotulo}>Lucro em trades</p>
          <p style={{ ...kpiValue, color:lucroTotal>=0?"var(--pos)":"var(--neg)" }}><CountUp value={lucroTotal} format={v=>(v<0?"-":"+")+fmtC(v)}/></p>
          <p style={kpiSub}>só o que veio das operações</p>
        </div>
        <div style={kpiCard}>
          <p style={rotulo}>Metas batidas</p>
          <p style={{ ...kpiValue, color: fechados.length===0 ? "var(--text-3)" : batidos/fechados.length>=0.5 ? "var(--pos)" : "var(--neg)" }}>
            {fechados.length ? batidos+" de "+fechados.length : "—"}
          </p>
          <p style={kpiSub}>{fechados.length ? "meses fechados com "+taxa+"% ou mais" : "nenhum mês fechado ainda"}</p>
        </div>
        <div style={kpiCard}>
          <p style={rotulo}>Em 12 meses</p>
          <p style={{ ...kpiValue, color:"var(--text)" }}><CountUp value={metaFinal} format={fmtC}/></p>
          <p style={kpiSub}>{bancaAt>0 ? (metaFinal/bancaAt).toFixed(1)+"× a banca de hoje, a "+taxa+"% ao mês" : "—"}</p>
          {projRitmo && <p style={{ ...kpiSub, color:corRitmo }}>no seu ritmo ({fmtPct(ritmo)}/mês): <b style={{ fontFamily:"var(--font-mono)" }}>{projRitmo[11].metaFinal<0?"-":""}{fmtC(projRitmo[11].metaFinal)}</b></p>}
        </div>
      </div>

      {/* Meses realizados — uma linha por mês */}
      {ultimos.length > 0 && <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"44px 0 18px" }}>
          <p className="mtp-section-title">Meses realizados</p>
          <span className="mtp-section-hint">meta = banca no início do mês × {taxa}%</span>
        </div>
        <div style={painel}>
          {[...ultimos].reverse().map((r, i, arr) => {
            const pct = r.metaLucro>0 ? Math.max(0, Math.min(100, (r.res/r.metaLucro)*100)) : 0;
            const cor = r.emAndamento ? "#7fd8ff" : r.bateu ? "#2ee6a0" : "#ff5470";
            return (
              <div key={r.mk} className="mtp-linha-mes" style={{ borderBottom: i<arr.length-1 ? "1px solid var(--line)" : "none" }}>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"14px", fontWeight:"700" }}>{formatMonthLabel(r.mk)}</p>
                  <span style={{ display:"inline-block", marginTop:"6px", fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", padding:"2px 8px", borderRadius:"20px", color:cor, border:"1px solid "+cor+"44", background:cor+"12" }}>
                    {r.emAndamento ? "em andamento" : r.bateu ? "✓ meta batida" : "abaixo da meta"}
                  </span>
                </div>
                <div>
                  <p style={rotulo}>Resultado</p>
                  <p style={{ margin:"5px 0 0", color:r.res>=0?"var(--pos)":"var(--neg)", fontSize:"15px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{r.res>=0?"+":"-"}{fmtC(r.res)}</p>
                </div>
                <div>
                  <p style={rotulo}>Meta</p>
                  <p style={{ margin:"5px 0 0", color:"var(--text-2)", fontSize:"15px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>+{fmtC(r.metaLucro)}</p>
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ height:"6px", borderRadius:"6px", background:"var(--line)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:pct+"%", borderRadius:"6px", background:"linear-gradient(90deg,"+cor+"55,"+cor+")", boxShadow:"0 0 8px "+cor+"88" }}/>
                  </div>
                  <p style={{ margin:"8px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {fmtC(r.inicio)} → {fmtC(r.fim)}
                    {r.dep>0 && <span style={{ color:"#7fd8ff" }}> · +{fmtC(r.dep)}</span>}{r.saq>0 && <span style={{ color:"#f5b941" }}> · −{fmtC(r.saq)}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {/* Projeção — lista com barras */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", margin:"44px 0 18px" }}>
        <p className="mtp-section-title">Projeção · próximos 12 meses</p>
        <span className="mtp-section-hint">partindo de {fmtC(bancaAt)}</span>
      </div>
      <div style={{ display:"flex", gap:"22px", flexWrap:"wrap", alignItems:"center", marginBottom:"14px", fontSize:"12.5px", color:"var(--text-2)" }}>
        <span style={{ display:"flex", alignItems:"center", gap:"8px" }}><i style={{ width:"18px", height:"6px", borderRadius:"6px", background:color }}/>Meta · {taxa}% ao mês</span>
        {projRitmo
          ? <span style={{ display:"flex", alignItems:"center", gap:"8px" }}><i style={{ width:"18px", height:"6px", borderRadius:"6px", background:corRitmo }}/>No seu ritmo · {fmtPct(ritmo)} ao mês <span style={{ color:"var(--text-3)" }}>(média {recentes.length===1?"do último mês fechado":"dos últimos "+recentes.length+" meses fechados"})</span></span>
          : <span style={{ color:"var(--text-3)" }}>A linha "no seu ritmo" aparece quando houver um mês fechado.</span>}
      </div>
      <div style={painel}>
        <div className="mtp-linha-proj mtp-linha-proj-cab">
          <span/><span/><span/>
          <span style={{ ...rotulo, textAlign:"right" }}>Meta</span>
          <span style={{ ...rotulo, textAlign:"right", color: projRitmo ? corRitmo : "var(--text-3)" }}>No seu ritmo</span>
        </div>
        {projecao.map((p,i)=>{
          const r = projRitmo?.[i];
          const larg = v => Math.max(0, v/maxProj*100)+"%";
          return (
            <div key={i} className="mtp-linha-proj" style={{ borderTop:"1px solid var(--line)" }}>
              <span style={{ color:i===0?color:"var(--text-3)", fontSize:"12px", fontWeight:"800", fontFamily:"var(--font-mono)" }}>{String(i+1).padStart(2,"0")}</span>
              <span style={{ color:i===0?"var(--text)":"var(--text-2)", fontSize:"13.5px", fontWeight:"600", whiteSpace:"nowrap" }}>{nomeFuturo(i+1)}</span>
              <div style={{ display:"flex", flexDirection:"column", gap:"4px", minWidth:0 }}>
                <div style={{ height:"6px", borderRadius:"6px", background:"var(--line)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:larg(p.metaFinal), borderRadius:"6px", background:"linear-gradient(90deg,"+color+"33,"+color+")" }}/>
                </div>
                {r && (
                  <div style={{ height:"6px", borderRadius:"6px", background:"var(--line)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:larg(r.metaFinal), borderRadius:"6px", background:"linear-gradient(90deg,"+corRitmo+"33,"+corRitmo+")" }}/>
                  </div>
                )}
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ margin:0, color:"var(--text)", fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{fmtC(p.metaFinal)}</p>
                <p style={{ margin:"3px 0 0", color:"var(--text-3)", fontSize:"11px", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>+{fmtC(p.lucroMes)}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                {r ? <>
                  <p style={{ margin:0, color:corRitmo, fontSize:"14px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{r.metaFinal<0?"-":""}{fmtC(r.metaFinal)}</p>
                  <p style={{ margin:"3px 0 0", color:"var(--text-3)", fontSize:"11px", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{r.lucroMes>=0?"+":"-"}{fmtC(r.lucroMes)}</p>
                </> : <span style={{ color:"var(--text-3)" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
