import { useState } from "react";
import { CountUp, Sparkline } from "../components/ui";
import { listaCarteiras, bancaCarteira, totalSaques, listaSaques, totalDepositos, listaDepositos, resultadoDia, curvaCarteira } from "../lib/banca";

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
    <div style={{ marginBottom:"32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <p className="mtp-section-title">Crescimento das contas</p>
        <span className="mtp-section-hint">clique para ver o detalhe</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"14px" }}>
        {linhas.map(l => {
          const sel = l.c.key === selecionada;
          const pos = l.pct >= 0;
          const progresso = l.metaMes>0 ? Math.max(0, Math.min(100, l.resMes/l.metaMes*100)) : 0;
          const bateu = l.metaMes>0 && l.resMes >= l.metaMes;
          return (
            <div key={l.c.key} onClick={()=>onSelecionar(l.c.key)}
              style={{ background:"var(--card)", border:"1px solid "+(sel ? l.c.cor+"66" : "var(--line)"), borderRadius:"16px", padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden", display:"flex", flexDirection:"column", gap:"10px", minWidth:0 }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+l.c.cor+(sel?"":"88")+",transparent 70%)" }}/>
              <div style={{ position:"absolute", right:0, bottom:0, width:"55%", height:"52px", opacity:0.45, pointerEvents:"none", maskImage:"linear-gradient(90deg,transparent,#000 40%)", WebkitMaskImage:"linear-gradient(90deg,transparent,#000 40%)" }}>
                <Sparkline values={l.curva} color={l.c.cor} width="100%" height="100%"/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", minWidth:0 }}>
                  <i className="mtp-dot" style={{ background:l.c.cor, color:l.c.cor }}/>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"13.5px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.c.label}</p>
                </div>
                {melhor === l && l.pct > 0 && <span style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", padding:"2px 8px", borderRadius:"20px", color:"#f5b941", border:"1px solid #f5b94144", background:"#f5b94112", whiteSpace:"nowrap" }}>★ melhor</span>}
              </div>
              <div style={{ position:"relative" }}>
                <p style={{ margin:0, color:pos?"var(--pos)":"var(--neg)", fontSize:"24px", fontWeight:"700", fontFamily:"var(--font-mono)", letterSpacing:"-0.5px" }}>
                  <CountUp value={l.pct} format={v=>(v>=0?"+":"")+v.toFixed(1)+"%"}/>
                </p>
                <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>
                  {fmtC(l.atual, l.c.moeda)} · <span style={{ color:pos?"var(--pos)":"var(--neg)" }}>{pos?"+":"-"}{fmtC(l.lucro, l.c.moeda)}</span>
                </p>
              </div>
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px", fontSize:"11px", fontFamily:"var(--font-mono)" }}>
                  <span style={{ color:"var(--text-3)" }}>mês: <span style={{ color:l.resMes>=0?"var(--pos)":"var(--neg)" }}>{l.resMes>=0?"+":"-"}{fmtC(l.resMes, l.c.moeda)}</span></span>
                  <span style={{ color: bateu ? "var(--pos)" : "var(--text-3)" }}>{bateu ? "✓ meta" : "meta "+fmtC(l.metaMes, l.c.moeda)}</span>
                </div>
                <div style={{ height:"4px", borderRadius:"4px", background:"var(--line)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:progresso+"%", borderRadius:"4px", background:l.c.cor, boxShadow:"0 0 8px "+l.c.cor+"88" }}/>
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
  const batidos   = fechados.filter(r => r.bateu).length;
  const ultimos   = realizados.slice(-12);
  const nomeFuturo = i => { const d = new Date(hoje.getFullYear(), hoje.getMonth()+i, 1); return MONTH_NAMES[d.getMonth()]+" "+d.getFullYear(); };

  const fmtC = v => cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const lucroTotal = bancaAt + sacado - depositado - bancaIn; // resultado de trading
  const metaFinal  = projecao[11]?.metaFinal ?? bancaAt;

  const kpiCard  = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"18px 20px", minWidth:0, display:"flex", flexDirection:"column", gap:"8px" };
  const kpiLabel = { margin:0, color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.2px" };
  const kpiValue = { margin:0, fontSize:"clamp(17px,1.6vw,23px)", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" };
  const kpiSub   = { margin:0, color:"var(--text-3)", fontSize:"11.5px" };

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:"16px", flexWrap:"wrap", marginBottom:"24px" }}>
        <div>
          <h1 style={{ margin:0, fontSize:"28px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.8px" }}>Crescimento</h1>
          <p style={{ margin:"4px 0 0", color:"#86978f", fontSize:"13px" }}>Real vs projetado — calculado a partir da banca atual</p>
        </div>
        <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
          {carteiras.map(c=>(
            <button key={c.key} onClick={()=>setCartKey(c.key)} className={"mtp-pill"+(cart.key===c.key?" active":"")} style={{"--pill":c.cor}}>{c.curto}</button>
          ))}
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginLeft:"10px", padding:"4px 6px 4px 14px", borderRadius:"20px", border:"1px solid var(--line)" }}>
            <label style={{ color:"var(--text-3)", fontSize:"12px" }}>Taxa mensal</label>
            <input type="number" value={taxa} min="1" max="50" onChange={e=>setTaxa(Number(e.target.value))} style={{ width:"52px", background:"rgba(255,255,255,0.05)", border:"1px solid var(--line-strong)", borderRadius:"14px", padding:"4px 8px", color:"#f0f0f0", fontSize:"13px", fontWeight:"700", outline:"none", textAlign:"center", fontFamily:"var(--font-mono)" }}/>
            <span style={{ color:"var(--text-3)", fontSize:"12px", paddingRight:"6px" }}>%</span>
          </div>
        </div>
      </div>

      {carteiras.length > 1 && <ContasResumo entries={entries} config={config} carteiras={carteiras} taxa={taxa} selecionada={cart.key} onSelecionar={setCartKey}/>}

      {carteiras.length > 1 && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px" }}>
          <i className="mtp-dot" style={{ background:color, color }}/>
          <p className="mtp-section-title">Detalhe · {cart.label}</p>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:"14px", marginBottom:"14px" }}>
        <div style={kpiCard}>
          <p style={kpiLabel}>Banca inicial</p>
          <p style={{ ...kpiValue, color:"var(--text-2)" }}>{fmtC(bancaIn)}</p>
          <p style={kpiSub}>ponto de partida</p>
        </div>
        <div style={{ ...kpiCard, borderColor:color+"33" }}>
          <p style={kpiLabel}>Banca real hoje</p>
          <p style={{ ...kpiValue, color, textShadow:"0 0 22px "+color+"44" }}><CountUp value={bancaAt} format={fmtC}/></p>
          <p style={{ ...kpiSub, color:lucroTotal>=0?"var(--pos)":"var(--neg)", fontFamily:"var(--font-mono)" }}>{lucroTotal>=0?"+":"-"}{fmtC(lucroTotal)} em trades{depositado>0 && <span style={{ color:"#7fd8ff" }}> · +{fmtC(depositado)} depositado</span>}{sacado>0 && <span style={{ color:"#f5b941" }}> · -{fmtC(sacado)} sacado</span>}</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Metas batidas</p>
          <p style={{ ...kpiValue, color: fechados.length===0 ? "var(--text-3)" : batidos/fechados.length>=0.5 ? "var(--pos)" : "var(--neg)" }}>
            {fechados.length ? batidos+" / "+fechados.length : "—"}
          </p>
          <p style={kpiSub}>{fechados.length ? "meses fechados com "+taxa+"% ou mais" : "nenhum mês fechado ainda"}</p>
        </div>
        <div style={kpiCard}>
          <p style={kpiLabel}>Meta 12 meses</p>
          <p style={{ ...kpiValue, color:"var(--text)" }}><CountUp value={metaFinal} format={fmtC}/></p>
          <p style={kpiSub}>{bancaAt>0 ? (metaFinal/bancaAt).toFixed(1)+"x a banca atual" : "—"}</p>
        </div>
      </div>

      <div style={{ padding:"11px 16px", borderRadius:"12px", background:"rgba(46,230,160,0.05)", border:"1px solid #2ee6a022", marginBottom:"28px", display:"flex", gap:"10px", alignItems:"center" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2ee6a0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        <p style={{ margin:0, color:"var(--text-2)", fontSize:"12.5px" }}>Projeção parte da <strong style={{ color:"#2ee6a0" }}>banca real atual</strong> ({fmtC(bancaAt)}) com {taxa}% ao mês. Atualiza automaticamente a cada registro no Diário.</p>
      </div>

      {/* Meses realizados */}
      {ultimos.length > 0 && <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
          <p className="mtp-section-title">Meses realizados</p>
          <span className="mtp-section-hint">meta = banca no início do mês × {taxa}%</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:"14px", marginBottom:"32px" }}>
          {ultimos.map(r => {
            const pct = r.metaLucro>0 ? Math.max(0, Math.min(100, (r.res/r.metaLucro)*100)) : 0;
            const cor = r.emAndamento ? "#7fd8ff" : r.bateu ? "#2ee6a0" : "#ff5470";
            return (
              <div key={r.mk} style={{ background:"var(--card)", border:"1px solid "+cor+"33", borderRadius:"16px", padding:"16px 18px", display:"flex", flexDirection:"column", gap:"12px", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,"+cor+",transparent 70%)" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"13.5px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{formatMonthLabel(r.mk)}</p>
                  <span style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", padding:"2px 8px", borderRadius:"20px", color:cor, border:"1px solid "+cor+"44", background:cor+"12", whiteSpace:"nowrap" }}>
                    {r.emAndamento ? "em andamento" : r.bateu ? "✓ meta batida" : "✗ abaixo"}
                  </span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                  <div>
                    <p style={{ ...kpiLabel, fontSize:"10px" }}>Resultado</p>
                    <p style={{ margin:"4px 0 0", color:r.res>=0?"var(--pos)":"var(--neg)", fontSize:"15px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{r.res>=0?"+":"-"}{fmtC(r.res)}</p>
                  </div>
                  <div>
                    <p style={{ ...kpiLabel, fontSize:"10px" }}>Meta do mês</p>
                    <p style={{ margin:"4px 0 0", color:"var(--text-2)", fontSize:"15px", fontWeight:"700", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>+{fmtC(r.metaLucro)}</p>
                  </div>
                </div>
                <div>
                  <div style={{ height:"4px", borderRadius:"4px", background:"var(--line)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:pct+"%", borderRadius:"4px", background:"linear-gradient(90deg,"+cor+"55,"+cor+")", boxShadow:"0 0 8px "+cor+"88" }}/>
                  </div>
                  <p style={{ margin:"7px 0 0", color:"var(--text-3)", fontSize:"11px", fontFamily:"var(--font-mono)" }}>
                    {fmtC(r.inicio)} → {fmtC(r.fim)}
                    {r.dep>0 && <span style={{ color:"#7fd8ff" }}> · +{fmtC(r.dep)} depósito</span>}{r.saq>0 && <span style={{ color:"#f5b941" }}> · -{fmtC(r.saq)} saque</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {/* Projeção futura */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <p className="mtp-section-title">Projeção · próximos 12 meses</p>
        <span className="mtp-section-hint">a partir da banca atual</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))", gap:"14px" }}>
        {projecao.map((p,i)=>(
          <div key={i} style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"16px", padding:"16px 18px", display:"flex", flexDirection:"column", gap:"12px", opacity: i===0 ? 1 : 0.82 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                <span style={{ width:"28px", height:"28px", borderRadius:"8px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:"800", fontFamily:"var(--font-mono)", color:i===0?color:"var(--text-3)", background:i===0?color+"15":"rgba(255,255,255,0.03)", border:"1px solid "+(i===0?color+"40":"var(--line)") }}>{i+1}</span>
                <p style={{ margin:0, color:i===0?"var(--text)":"var(--text-2)", fontSize:"13.5px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{nomeFuturo(i+1)}</p>
              </div>
              {i===0 && <span style={{ fontSize:"10px", fontWeight:"700", letterSpacing:"0.8px", textTransform:"uppercase", padding:"2px 8px", borderRadius:"20px", color, border:"1px solid "+color+"44", background:color+"12" }}>próximo</span>}
            </div>
            <div>
              <p style={{ ...kpiLabel, fontSize:"10px" }}>Meta projetada</p>
              <p style={{ margin:"4px 0 0", color:"var(--text)", fontSize:"16px", fontWeight:"700", fontFamily:"var(--font-mono)" }}>{fmtC(p.metaFinal)}</p>
              <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11px", fontFamily:"var(--font-mono)" }}>+{fmtC(p.lucroMes)} no mês</p>
            </div>
            <div style={{ height:"4px", borderRadius:"4px", background:"repeating-linear-gradient(90deg,var(--line) 0 6px,transparent 6px 10px)", marginTop:"auto" }}/>
          </div>
        ))}
      </div>
    </div>
  );
}
