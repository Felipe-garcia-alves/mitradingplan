// Mi Trading Plan - Evolucao
import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { CountUp, Ring, Sparkline, CapitalChart, DailyBars } from "../components/ui";
import { listaCarteiras, bancaCarteira } from "../lib/banca";
import { contaDoTrade, entradaFiltrada } from "../lib/contas";
import FiltrosBarra from "../components/FiltrosBarra";
import { ativoDoTrade, SEM_ATIVO } from "../lib/ativos";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmt(v, cur="R$") { return (v>=0?"+":"")+cur+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2}); }
function fmtBRL(v) {
  const a = Math.abs(v);
  const opts = a>=10000 ? {maximumFractionDigits:0} : {minimumFractionDigits:2,maximumFractionDigits:2};
  return (v<0?"-":"+")+"R$ "+a.toLocaleString("pt-BR",opts);
}

// Grade que fecha as linhas: 4 cards = 4 colunas, 6 = 3+3, 8 = 4+4; sobra fica centralizada
function colunasPara(n, max = 4) {
  if (n <= max) return n;
  for (let c = max; c >= 3; c--) if (n % c === 0) return c;
  return max;
}
function GradeEquilibrada({ n, gap = 14, mobile, children }) {
  const cols = mobile ? Math.min(2, n) : colunasPara(n);
  return (
    <div className="mtp-grade-eq" style={{ "--cols": cols, "--gap": gap+"px" }}>
      {children}
    </div>
  );
}
// data local (toISOString é UTC e vira o dia às 21h em Brasília)
function dayKey(d) { return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function parseDate(s) { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d); }

function DateFilter({ inicio, fim, onChange }) {
  const [open, setOpen] = useState(false);
  const [editInicio, setEditInicio] = useState(inicio);
  const [editFim,    setEditFim]    = useState(fim);
  const fmt = (s) => { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; };

  return (
    <div style={{position:"relative"}}>
      <style>{`input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }`}</style>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:99}}/>}
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:open?"rgba(46,230,160,0.08)":"rgba(255,255,255,0.04)",border:"1px solid "+(open?"#2ee6a044":"#26352e"),borderRadius:"20px",padding:"8px 16px",color:open?"#2ee6a0":"#aaa",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)",transition:"all 0.2s"}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {fmt(inicio)} até {fmt(fim)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0b1210",border:"1px solid #26352e",borderRadius:"16px",padding:"16px",zIndex:100,minWidth:"280px",boxShadow:"0 20px 40px rgba(0,0,0,0.5)"}}>
          <p style={{margin:"0 0 12px",color:"#999",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Período</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"12px"}}>
            <div>
              <label style={{color:"#999",fontSize:"11px",display:"block",marginBottom:"5px"}}>Início</label>
              <input type="date" value={editInicio} onChange={e=>setEditInicio(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",borderRadius:"8px",padding:"8px",color:"#f0f0f0",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"var(--font-sans)"}}/>
            </div>
            <div>
              <label style={{color:"#999",fontSize:"11px",display:"block",marginBottom:"5px"}}>Fim</label>
              <input type="date" value={editFim} onChange={e=>setEditFim(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",borderRadius:"8px",padding:"8px",color:"#f0f0f0",fontSize:"13px",outline:"none",boxSizing:"border-box",fontFamily:"var(--font-sans)"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            {[["7d","7 dias"],["1m","Este mês"],["3m","3 meses"],["1a","1 ano"]].map(([k,l])=>(
              <button key={k} onClick={()=>{
                const fim = new Date(); const ini = new Date();
                if(k==="7d") ini.setDate(fim.getDate()-7);
                else if(k==="1m") ini.setDate(1);
                else if(k==="3m") ini.setMonth(fim.getMonth()-3);
                else ini.setFullYear(fim.getFullYear()-1);
                setEditInicio(dayKey(ini)); setEditFim(dayKey(fim));
              }} style={{flex:1,padding:"6px",borderRadius:"6px",border:"1px solid #26352e",background:"transparent",color:"#999",fontSize:"11px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>{ onChange(editInicio,editFim); setOpen(false); }} style={{width:"100%",marginTop:"10px",background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"8px",padding:"9px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Aplicar</button>
        </div>
      )}
    </div>
  );
}

// ── Painel lateral de operações ──────────────────────────────────
// Todo clique de detalhe da página abre aqui. Fecha com Esc, clique fora ou ×,
// sempre com animação de saída; vai por portal para o body não herdar transform.
const MOEDA_M = { B3:"R$", Forex:"$", Cripto:"$", Americano:"$" };
function fmtDiaLongo(d) { return parseDate(d).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}); }
function fmtDiaCurto(d) { return d.slice(8)+"/"+d.slice(5,7); }
function fmtRes(v, moeda="R$") { return (v>=0?"+":"-")+moeda+" "+Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }

function OpItem({ t, i, onEstrategia, comData }) {
  const win = t.tipo==="WIN";
  const ativo = ativoDoTrade(t);
  return (
    <div className="mtp-drawer-item" style={{animationDelay:Math.min(i,14)*28+"ms",padding:"11px 14px",borderRadius:"12px",background:"rgba(255,255,255,0.018)",border:"1px solid var(--line)",borderLeft:"3px solid "+(win?"var(--pos)":"var(--neg)"),marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"7px",flexWrap:"wrap"}}>
            <span style={{padding:"2px 7px",borderRadius:"5px",fontSize:"10.5px",fontWeight:"800",background:win?"rgba(46,230,160,0.14)":"rgba(255,84,112,0.14)",color:win?"var(--pos)":"var(--neg)"}}>{t.tipo}</span>
            {ativo!==SEM_ATIVO && <span style={{color:"var(--text)",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{ativo}</span>}
            <span style={{color:"var(--text-3)",fontSize:"11.5px"}}>{t.mercado}{t.horario?" · "+t.horario.slice(0,5):""}{comData?" · "+fmtDiaCurto(t._date):""}</span>
          </div>
          {t.estrategia && (
            <button onClick={()=>onEstrategia(t.estrategia)} className="mtp-chip-link" title="Ver todas desta estratégia">{t.estrategia} ›</button>
          )}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {t.resultado!=null && <p style={{margin:0,color:t.resultado>=0?"var(--pos)":"var(--neg)",fontSize:"13px",fontFamily:"var(--font-mono)",fontWeight:"700"}}>{fmtRes(t.resultado, MOEDA_M[t.mercado])}</p>}
          {t.pontos!=null && <p style={{margin:"1px 0 0",color:"var(--text-3)",fontSize:"11px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</p>}
        </div>
      </div>
      {t.observacao && <p style={{margin:"7px 0 0",color:"var(--text-3)",fontSize:"12px",fontStyle:"italic",lineHeight:1.5}}>"{t.observacao}"</p>}
    </div>
  );
}

function PainelOps({ painel, onClose, onEstrategia }) {
  const [saindo, setSaindo] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [ordem,  setOrdem]  = useState("data");
  const fechar = useCallback(() => { setSaindo(true); setTimeout(onClose, 220); }, [onClose]);

  useEffect(() => { setFiltro(painel.filtro || "todos"); setOrdem(painel.ordem || "data"); }, [painel]);
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") fechar(); };
    window.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ov; };
  }, [fechar]);

  const ops = painel.trades;
  const nWin = ops.filter(t=>t.tipo==="WIN").length;
  const total = ops.reduce((s,t)=>s+(t.resultado||0),0);
  const pts = ops.reduce((s,t)=>s+(t.pontos||0),0);
  const acerto = ops.length ? Math.round(nWin/ops.length*100) : null;
  const visiveis = ops.filter(t => filtro==="todos" || (filtro==="win" ? t.tipo==="WIN" : t.tipo!=="WIN"));
  const ordenadas = ordem==="data"
    ? [...visiveis].sort((a,b)=>b._date.localeCompare(a._date) || (b.horario||"").localeCompare(a.horario||""))
    : [...visiveis].sort((a,b)=>ordem==="maior" ? (b.resultado||0)-(a.resultado||0) : (a.resultado||0)-(b.resultado||0));
  const grupos = [];
  if (ordem==="data") ordenadas.forEach(t => {
    const g = grupos[grupos.length-1];
    if (g && g.d===t._date) g.ops.push(t); else grupos.push({ d:t._date, ops:[t] });
  });
  const cor = painel.cor || "var(--accent)";
  const seg = (valor, atual, set, rot, corTxt) => (
    <button key={valor} onClick={()=>set(valor)} className={"mtp-opcao"+(atual===valor?" ativo":"")} style={corTxt&&atual===valor?{color:corTxt}:undefined}>{rot}</button>
  );
  let idx = 0;

  return createPortal(
    <>
      <div className={"mtp-drawer-backdrop"+(saindo?" saindo":"")} onClick={fechar}/>
      <aside className={"mtp-drawer"+(saindo?" saindo":"")} role="dialog" aria-label={painel.titulo}>
        <div style={{padding:"20px 20px 16px",borderBottom:"1px solid var(--line)",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",marginBottom:"16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}>
              {painel.tag && <div style={{padding:"5px 9px",borderRadius:"7px",background:cor+"22",border:"1px solid "+cor+"44",flexShrink:0}}><span style={{color:cor,fontSize:"11.5px",fontWeight:"800"}}>{painel.tag}</span></div>}
              <div style={{minWidth:0}}>
                <p style={{margin:0,color:"var(--text)",fontSize:"16px",fontWeight:"700",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{painel.titulo}</p>
                {painel.sub && <p style={{margin:"3px 0 0",color:"var(--text-3)",fontSize:"12px"}}>{painel.sub}</p>}
              </div>
            </div>
            <button onClick={fechar} className="mtp-drawer-close" aria-label="Fechar">×</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
            {[
              ["Resultado", fmtRes(total).replace(",00",""), total>=0?"var(--pos)":"var(--neg)"],
              ["Acerto", acerto===null?"—":acerto+"%", acerto===null?"var(--text-3)":acerto>=60?"var(--pos)":acerto>=40?"var(--warn)":"var(--neg)"],
              ["Pontos", (pts>=0?"+":"")+pts.toFixed(0), "var(--text-2)"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.025)",border:"1px solid var(--line)",borderRadius:"10px",padding:"10px 12px",minWidth:0}}>
                <p style={{margin:"0 0 3px",color:"var(--text-3)",fontSize:"10px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.8px"}}>{l}</p>
                <p style={{margin:0,color:c,fontSize:"14.5px",fontWeight:"800",fontFamily:"var(--font-mono)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"10px 20px",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",gap:"8px",flexWrap:"wrap",flexShrink:0}}>
          <div className="mtp-opcoes">
            {seg("todos", filtro, setFiltro, "Todos "+ops.length)}
            {seg("win",   filtro, setFiltro, "WIN "+nWin, "var(--pos)")}
            {seg("loss",  filtro, setFiltro, "LOSS "+(ops.length-nWin), "var(--neg)")}
          </div>
          <div className="mtp-opcoes">
            {seg("data",  ordem, setOrdem, "Recentes")}
            {seg("maior", ordem, setOrdem, "Maiores")}
            {seg("menor", ordem, setOrdem, "Piores")}
          </div>
        </div>
        <div key={painel.chave+filtro+ordem} style={{flex:1,overflowY:"auto",padding:"14px 20px 24px"}}>
          {ordem==="data" ? grupos.map(g => {
            const sub = g.ops.reduce((s,t)=>s+(t.resultado||0),0);
            return (
              <div key={g.d} style={{marginBottom:"14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",margin:"0 2px 8px"}}>
                  <span style={{color:"var(--text-2)",fontSize:"11.5px",fontWeight:"700",textTransform:"capitalize"}}>{fmtDiaLongo(g.d)}</span>
                  <span style={{color:sub>=0?"var(--pos)":"var(--neg)",fontSize:"11.5px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{fmtRes(sub)}</span>
                </div>
                {g.ops.map((t,j) => <OpItem key={j} t={t} i={idx++} onEstrategia={onEstrategia}/>)}
              </div>
            );
          }) : ordenadas.map((t,i) => <OpItem key={i} t={t} i={i} onEstrategia={onEstrategia} comData/>)}
          {visiveis.length===0 && <p style={{color:"var(--text-3)",fontSize:"13px",textAlign:"center",marginTop:"40px"}}>Nenhuma operação aqui.</p>}
        </div>
      </aside>
    </>,
    document.body
  );
}

export default function Evolucao({ entries, compliance, estrategias, setPagina, config, saveConfig }) {
  const now     = new Date();
  const ini1m   = new Date(now.getFullYear(), now.getMonth(), 1);
  const [inicio, setInicio] = useState(dayKey(ini1m));
  const [fim,    setFim]    = useState(dayKey(now));
  const [painel, setPainel] = useState(null);
  const [filtroMercado, setFiltroMercado] = useState("todos");
  const [filtroConta,   setFiltroConta]   = useState("todas");
  const [filtroEsts,    setFiltroEsts]    = useState([]);
  const [filtroAtivos,  setFiltroAtivos]  = useState([]);
  const [verTodosAtivos, setVerTodosAtivos] = useState(false);
  const isMobile = window.innerWidth < 768;

  const noPeriodo = useMemo(() => {
    return Object.entries(entries).filter(([d]) => d >= inicio && d <= fim).sort(([a],[b])=>a.localeCompare(b));
  }, [entries, inicio, fim]);

  // Conta e estratégias filtram no nível do trade; os totais do dia são recalculados.
  const daConta = useMemo(() => {
    if (filtroConta === "todas") return noPeriodo;
    return noPeriodo.map(([d,e]) => [d, entradaFiltrada(e, t => contaDoTrade(t) === filtroConta)]).filter(([,e]) => e.numTrades > 0);
  }, [noPeriodo, filtroConta]);
  const estrategiasNoPeriodo = useMemo(() => {
    const nomes = new Set(daConta.flatMap(([,e]) => (e.trades||[]).map(t => t.estrategia || "Sem nome")));
    return [...nomes].sort((a,b) => a.localeCompare(b));
  }, [daConta]);
  const ativosNoPeriodo = useMemo(() => {
    const nomes = new Set(daConta.flatMap(([,e]) => (e.trades||[]).map(ativoDoTrade)));
    return [...nomes].sort((a,b) => (a===SEM_ATIVO) - (b===SEM_ATIVO) || a.localeCompare(b));
  }, [daConta]);
  const filtered = useMemo(() => {
    if (filtroEsts.length === 0 && filtroAtivos.length === 0) return daConta;
    const passa = t => (filtroEsts.length === 0 || filtroEsts.includes(t.estrategia || "Sem nome"))
                    && (filtroAtivos.length === 0 || filtroAtivos.includes(ativoDoTrade(t)));
    return daConta.map(([d,e]) => [d, entradaFiltrada(e, passa)]).filter(([,e]) => e.numTrades > 0);
  }, [daConta, filtroEsts, filtroAtivos]);

  // Compliance — média total de todos os dias salvos até hoje
  const now2 = new Date();
  const ym = now2.getFullYear()+"-"+String(now2.getMonth()+1).padStart(2,"0");
  const today2 = dayKey(now2);
  const daysThisMonth = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  // Card = média de TODOS os dias salvos no mês até hoje
  const allSavedVals = Object.entries(compliance||{})
    .filter(([k]) => k <= today2)
    .map(([,v]) => typeof v === "number" ? v : v === true ? 100 : null)
    .filter(v => v !== null);
  const compliancePct = allSavedVals.length > 0
    ? Math.round(allSavedVals.reduce((a,b)=>a+b,0)/allSavedVals.length)
    : null;
  const compliedDays = daysThisMonth.filter(k => {
    const v = (compliance||{})[k];
    return v === true || (typeof v === "number" && v >= 80);
  }).length;
  const complianceColor = compliancePct===null?"#666":compliancePct>=80?"#2ee6a0":compliancePct>=50?"#f59e0b":"#ff5470";

  // Aggregates
  const totalB3        = filtroMercado==="todos"||filtroMercado==="B3"        ? filtered.reduce((s,[,e])=>s+(e.totalB3||0),        0) : 0;
  const totalForex     = filtroMercado==="todos"||filtroMercado==="Forex"     ? filtered.reduce((s,[,e])=>s+(e.totalForex||0),     0) : 0;
  const totalCripto    = filtroMercado==="todos"||filtroMercado==="Cripto"    ? filtered.reduce((s,[,e])=>s+(e.totalCripto||0),    0) : 0;
  const totalAmericano = filtroMercado==="todos"||filtroMercado==="Americano" ? filtered.reduce((s,[,e])=>s+(e.totalAmericano||0), 0) : 0;
  const totalPts       = filtered.reduce((s,[,e])=>s+(e.totalPts||0), 0);
  const totalResult    = totalB3 + totalForex + totalCripto + totalAmericano;
  const diasOp         = filtered.filter(([,e])=>e.numTrades>0).length;

  // Win rate
  const allTrades = filtered.flatMap(([d,e])=>(e.trades||[]).map(t=>({...t,_date:d}))).filter(t=>filtroMercado==="todos"||t.mercado===filtroMercado);
  const wins      = allTrades.filter(t=>t.tipo==="WIN").length;
  const winRate   = allTrades.length > 0 ? Math.round((wins/allTrades.length)*100) : null;

  // % relativo à banca no início do período: soma das carteiras dentro dos filtros
  // de conta e mercado (já descontando saques feitos antes do período)
  const bancaRef = listaCarteiras(config)
    .filter(c => (filtroConta==="todas" || c.contaId===filtroConta) && (filtroMercado==="todos" || c.mercado===filtroMercado))
    .reduce((t, c) => t + bancaCarteira(entries, config, c, { antes: inicio }), 0);
  const pctBanca = bancaRef > 0 && filtered.length > 0 ? parseFloat((totalResult / bancaRef * 100).toFixed(1)) : null;

  // Curva de capital
  let acc = 0;
  const capitalPoints = [
    { d:"inicio", val: 0 },
    ...filtered.map(([d,e]) => {
      if(filtroMercado==="todos"||filtroMercado==="B3")     acc += e.totalB3||0;
      if(filtroMercado==="todos"||filtroMercado==="Forex")   acc += e.totalForex||0;
      if(filtroMercado==="todos"||filtroMercado==="Cripto")    acc += e.totalCripto||0;
      if(filtroMercado==="todos"||filtroMercado==="Americano") acc += e.totalAmericano||0;
      return { d, val: parseFloat(acc.toFixed(2)) };
    })
  ];

  // Resultado diario (barras)
  const dailyBars = filtered.map(([d,e]) => ({
    d,
    val: (filtroMercado==="todos"||filtroMercado==="B3"?e.totalB3||0:0)+(filtroMercado==="todos"||filtroMercado==="Forex"?e.totalForex||0:0)+(filtroMercado==="todos"||filtroMercado==="Cripto"?e.totalCripto||0:0)+(filtroMercado==="todos"||filtroMercado==="Americano"?e.totalAmericano||0:0),
    pts: e.totalPts||0
  }));

  // Estrategias — useMemo garante recompute quando entries mudar
  const estratStats = useMemo(() => {
    const stats = {};
    allTrades.forEach(t => {
      const n = t.estrategia || "Sem nome";
      if (!stats[n]) stats[n] = { wins:0, total:0, resultado:0, pontos:0 };
      stats[n].total++;
      stats[n].resultado += t.resultado||0;
      stats[n].pontos    += t.pontos||0;
      if (t.tipo==="WIN") stats[n].wins++;
    });
    return stats;
  }, [allTrades]);

  // Lookup de nome atual das estratégias (para refletir renomeações)
  const nomeAtual = useMemo(() => {
    const map = {};
    (estrategias||[]).forEach(e => { if(e.nome) map[e.nome] = e.nome; });
    return map;
  }, [estrategias]);

  // Origem ganhos/perdas
  const ganhos  = allTrades.filter(t=>(t.resultado||0)>0);
  const perdas  = allTrades.filter(t=>(t.resultado||0)<0);
  const totGanho= ganhos.reduce((s,t)=>s+(t.resultado||0),0);
  const totPerda= perdas.reduce((s,t)=>s+(t.resultado||0),0);
  const gByEst  = {};
  ganhos.forEach(t=>{ const n=t.estrategia||"Sem nome"; if(!gByEst[n])gByEst[n]=0; gByEst[n]+=(t.resultado||0); });
  const pByEst  = {};
  perdas.forEach(t=>{ const n=t.estrategia||"Sem nome"; if(!pByEst[n])pByEst[n]=0; pByEst[n]+=(t.resultado||0); });

  // Media vencedora/perdedora
  const mediaVenc = ganhos.length>0 ? ganhos.reduce((s,t)=>s+(t.resultado||0),0)/ganhos.length : 0;
  const mediaPerd = perdas.length>0 ? Math.abs(perdas.reduce((s,t)=>s+(t.resultado||0),0)/perdas.length) : 0;
  const rr        = mediaPerd>0 ? (mediaVenc/mediaPerd).toFixed(2) : "—";

  const losses       = allTrades.length - wins;
  const wrColor      = winRate>=60?"#2ee6a0":winRate>=40?"#f59e0b":"#ff5470";
  const profitFactor = totPerda<0 ? totGanho/Math.abs(totPerda) : null;

  // Max drawdown: maior recuo do pico da curva de capital no período
  let pico = 0, maxDD = 0, picoNoDD = 0, iPico = 0, ddDe = 0, ddAte = 0;
  capitalPoints.forEach((p,i) => {
    if (p.val > pico) { pico = p.val; iPico = i; }
    if (pico - p.val > maxDD) { maxDD = pico - p.val; picoNoDD = pico; ddDe = iPico; ddAte = i; }
  });
  const ddPct = maxDD>0 && bancaRef+picoNoDD>0 ? (maxDD/(bancaRef+picoNoDD))*100 : null;

  // Dias positivos seguidos (do último dia para trás)
  let streakVerde = 0;
  for (let i=dailyBars.length-1; i>=0; i--) { if (dailyBars[i].val>0) streakVerde++; else break; }

  const kpiCard  = {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px",position:"relative",overflow:"hidden",minWidth:0,minHeight:"132px",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"8px"};
  const kpiLabel = {margin:0,color:"var(--text-3)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"};
  const kpiValue = {margin:0,fontSize:isMobile?"20px":"clamp(17px,1.55vw,25px)",fontWeight:"700",fontFamily:"var(--font-mono)",letterSpacing:"-0.5px",lineHeight:1.15,whiteSpace:"nowrap"};
  const kpiSub   = {margin:0,color:"var(--text-3)",fontSize:"11.5px"};
  const chartCard= {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px 12px"};

  const colors = ["#2ee6a0","#f59e0b","#a78bfa","#f472b6","#34d399","#f0506e","#60a5fa"];
  const nomesEst = Object.keys(estratStats);
  const corEst = n => colors[Math.max(0, nomesEst.indexOf(n)) % colors.length];

  // Abre o painel lateral; "alternar" fecha se o mesmo item já estiver aberto
  const mostrar = (chave, titulo, trades, extra={}) => setPainel({ chave, titulo, trades, ...extra });
  const alternar = (chave, ...args) => painel?.chave===chave ? setPainel(null) : mostrar(chave, ...args);
  const sub = n => n+" operaç"+(n===1?"ão":"ões");
  const abrirEst = (n, extra={}) => {
    const ops = allTrades.filter(t=>(t.estrategia||"Sem nome")===n);
    mostrar("est:"+n, nomeAtual[n]||n, ops, { tag:n.slice(0,3).toUpperCase(), cor:corEst(n), sub:sub(ops.length)+" no período", ...extra });
  };
  const abrirDia = d => {
    // respeita os filtros; dia fora do período (bolinha do calendário) mostra o dia inteiro
    let ops = allTrades.filter(t=>t._date===d);
    if (!ops.length) ops = (entries[d]?.trades||[]).map(t=>({...t,_date:d}));
    mostrar("dia:"+d, fmtDiaLongo(d), ops, { sub:sub(ops.length) });
  };
  const abrirDD = () => {
    const de = ddDe>0 ? capitalPoints[ddDe].d : "", ate = capitalPoints[ddAte].d;
    const ops = allTrades.filter(t=>t._date>de && t._date<=ate);
    mostrar("dd", "Max Drawdown", ops, { cor:"#ff5470", sub:(de?"do pico em "+fmtDiaCurto(de):"do início")+" até o fundo em "+fmtDiaCurto(ate) });
  };

  return (
    <div className="mtp-evo" style={{fontFamily:"var(--font-sans)"}}>
      {/* Conta + filtros */}
      <div style={{marginBottom:"32px"}}>
        <FiltrosBarra config={config} saveConfig={saveConfig}
          conta={filtroConta} setConta={setFiltroConta}
          mercado={filtroMercado} setMercado={setFiltroMercado}
          estrategiasSel={filtroEsts} setEstrategiasSel={setFiltroEsts}
          estrategias={estrategiasNoPeriodo}
          ativosSel={filtroAtivos} setAtivosSel={setFiltroAtivos} ativos={ativosNoPeriodo}
          direita={<DateFilter inicio={inicio} fim={fim} onChange={(i,f)=>{ setInicio(i); setFim(f); }}/>}/>
      </div>

      {/* LINHA 1: Alerta full width */}
      <AlertasInteligentes trades={allTrades} entries={filtered} winRate={winRate} diasOp={diasOp}/>

      {/* LINHA 2: KPIs — Disciplina primeiro */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(5,minmax(0,1fr))",gap:"14px",marginBottom:"20px",marginTop:"32px"}}>
        {/* Disciplina */}
        <div onClick={()=>setPagina&&setPagina("regras")} style={{...kpiCard,cursor:setPagina?"pointer":"default"}}>
          <p style={kpiLabel}>Disciplina</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
            <p style={{...kpiValue,color:compliancePct===null?"var(--text-3)":complianceColor}}>
              {compliancePct!==null ? <CountUp value={compliancePct} format={v=>Math.round(v)+"%"}/> : "—"}
            </p>
            <Ring pct={compliancePct} color={complianceColor} size={50}/>
          </div>
          <p style={kpiSub}>{allSavedVals.length>0?`média de ${allSavedVals.length} dia${allSavedVals.length!==1?"s":""}`:compliedDays+" de "+daysThisMonth.length+" dias"}</p>
        </div>

        {/* Resultado Total */}
        <div onClick={()=>alternar("resultado","Resultado do período",allTrades,{sub:sub(allTrades.length)+" · "+diasOp+" dias",ordem:"maior"})} style={{...kpiCard,cursor:"pointer"}}>
          <div style={{position:"absolute",left:"48%",right:0,bottom:0,height:"46px",opacity:0.5,pointerEvents:"none",maskImage:"linear-gradient(90deg,transparent,#000 35%)",WebkitMaskImage:"linear-gradient(90deg,transparent,#000 35%)"}}>
            <Sparkline values={capitalPoints.map(p=>p.val)} color={totalResult>=0?"#2ee6a0":"#ff5470"} width="100%" height="100%"/>
          </div>
          <p style={{...kpiLabel,position:"relative",whiteSpace:"nowrap"}}>Resultado Total</p>
          <p style={{...kpiValue,position:"relative",color:totalResult>=0?"var(--pos)":"var(--neg)"}}>
            <CountUp value={totalResult} format={fmtBRL}/>
          </p>
          <p style={{...kpiSub,position:"relative",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap"}}>
            <span style={{background:totalResult>=0?"rgba(46,230,160,0.12)":"rgba(255,84,112,0.12)",color:totalResult>=0?"var(--pos)":"var(--neg)",fontSize:"10.5px",fontWeight:"700",padding:"2px 8px",borderRadius:"20px",border:"1px solid "+(totalResult>=0?"#2ee6a033":"#ff547033"),fontFamily:"var(--font-mono)"}}>
              {totalResult>=0?"↑":"↓"}{pctBanca!==null ? " "+(pctBanca>=0?"+":"")+pctBanca+"%" : (totalResult>=0?" Positivo":" Negativo")}
            </span>
            {totalPts>=0?"+":""}{totalPts.toFixed(1)} pts
          </p>
        </div>

        {/* Win Rate */}
        <div onClick={()=>alternar("winrate","Operações do período",allTrades,{sub:wins+" WIN · "+losses+" LOSS"})} style={{...kpiCard,cursor:"pointer"}}>
          <p style={kpiLabel}>Win Rate</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
            <div>
              <p style={{...kpiValue,color:winRate===null?"var(--text-3)":wrColor}}>
                {winRate!==null ? <CountUp value={winRate} format={v=>Math.round(v)+"%"}/> : "—"}
              </p>
              <p style={{margin:"2px 0 0",color:"var(--text-3)",fontSize:"11px"}}>taxa de acerto</p>
            </div>
            <Ring pct={winRate} color={winRate===null?"var(--line)":wrColor} size={50}/>
          </div>
          <p style={{...kpiSub,fontFamily:"var(--font-mono)"}}>
            <span style={{color:"var(--pos)"}}>{wins}</span> · <span style={{color:"var(--neg)"}}>{losses}</span> · {allTrades.length} trades
          </p>
        </div>

        {/* Dias Operados */}
        {(()=>{
          const hoje = new Date();
          const ano = hoje.getFullYear();
          const mes = hoje.getMonth();
          const mesKey = ano+"-"+String(mes+1).padStart(2,"0");
          const diasOperadosSet = new Set(Object.keys(entries).filter(d=>d.startsWith(mesKey)&&(entries[d].numTrades||0)>0));
          const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
          const totalDias = new Date(ano, mes+1, 0).getDate();
          const celulas = [];
          for(let i=0;i<primeiroDiaSemana;i++) celulas.push(null);
          for(let d=1;d<=totalDias;d++) celulas.push(d);
          const semanas = [];
          for(let i=0;i<celulas.length;i+=7) semanas.push(celulas.slice(i,i+7));
          return (
            <div onClick={()=>alternar("dias","Dias operados",allTrades,{sub:diasOp+" dias · "+sub(allTrades.length)})} style={{...kpiCard,cursor:"pointer"}}>
              <p style={kpiLabel}>Dias Operados</p>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
                <p style={{...kpiValue,color:"#7fd8ff"}}><CountUp value={diasOp}/></p>
                <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                  {semanas.map((sem,si)=>(
                    <div key={si} style={{display:"flex",gap:"3px"}}>
                      {Array.from({length:7}).map((_,di)=>{
                        const cel = sem[di];
                        if(cel===undefined||cel===null) return <div key={di} style={{width:"6px",height:"6px"}}/>;
                        const dKey = ano+"-"+String(mes+1).padStart(2,"0")+"-"+String(cel).padStart(2,"0");
                        const operado = diasOperadosSet.has(dKey);
                        const isHoje = cel===hoje.getDate();
                        return <div key={di} title={cel+"/"+(mes+1)+(operado?" — ver operações":"")} className={operado?"mtp-dia-dot":undefined}
                          onClick={operado?e=>{e.stopPropagation();abrirDia(dKey);}:undefined}
                          style={{width:"6px",height:"6px",borderRadius:"50%",background:operado?"var(--accent)":isHoje?"#3a4d44":"var(--line-strong)",boxShadow:operado?"0 0 5px rgba(46,230,160,0.7)":"none",outline:isHoje?"1px solid #5d6f67":"none",outlineOffset:"1px"}}/>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <p style={kpiSub}>
                <span style={{display:"inline-block",width:"6px",height:"6px",borderRadius:"50%",background:streakVerde>0?"var(--warn)":"var(--line-strong)",marginRight:"6px",verticalAlign:"middle"}}/>
                {streakVerde} dia{streakVerde!==1?"s":""} no verde
              </p>
            </div>
          );
        })()}

        {/* Max Drawdown */}
        <div onClick={maxDD>0?abrirDD:undefined} style={{...kpiCard,cursor:maxDD>0?"pointer":"default"}}>
          <p style={kpiLabel}>Max Drawdown</p>
          <p style={{...kpiValue,color:maxDD>0?"var(--neg)":"var(--text-2)"}}>
            <CountUp value={-maxDD} format={v=>v<-0.005?fmtBRL(v):"R$ 0,00"}/>
          </p>
          <p style={kpiSub}>{ddPct!==null ? ddPct.toFixed(1)+"% do pico" : "sem recuo no período"}</p>
        </div>
      </div>

      {/* LINHA 3: Curva de Capital + Resultado Diário */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={chartCard}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"12px",gap:"8px"}}>
            <p className="mtp-card-title">Curva de Capital</p>
            <p style={{margin:0,color:totalResult>=0?"var(--pos)":"var(--neg)",fontSize:"14px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>
              R$ {totalResult>=0?"+":""}{totalResult.toLocaleString("pt-BR",{minimumFractionDigits:2})}
            </p>
          </div>
          <CapitalChart points={capitalPoints}/>
        </div>
        <div style={chartCard}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"12px",gap:"8px"}}>
            <p className="mtp-card-title">Resultado Diário</p>
            <p style={{margin:0,color:"var(--text-3)",fontSize:"11px",fontFamily:"var(--font-mono)"}}>
              <span style={{color:"var(--pos)"}}>{dailyBars.filter(b=>b.val>0).length}</span> / <span style={{color:"var(--neg)"}}>{dailyBars.filter(b=>b.val<0).length}</span> dias
            </p>
          </div>
          <DailyBars bars={dailyBars} onBarClick={b=>abrirDia(b.d)}/>
        </div>
      </div>

      {/* LINHA 3b: Origem do Ganho + Origem da Perda */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"14px",marginBottom:"36px"}}>
        <div style={{background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ee6a0" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <p style={{margin:0,color:"#2ee6a0",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem do Ganho</p>
          </div>
          {Object.entries(gByEst).sort(([,a],[,b])=>b-a).map(([n,v],i)=>{
            const pct = totGanho>0 ? Math.round((v/totGanho)*100) : 0;
            return (
              <div key={n} className="mtp-click-row" onClick={()=>abrirEst(n,{filtro:"win",ordem:"maior"})} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"6px",background:colors[i%colors.length]+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:colors[i%colors.length],fontSize:"9px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                    <span style={{color:"#2ee6a0",fontSize:"12px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>+R$ {v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                  </div>
                  <div style={{height:"3px",borderRadius:"2px",background:"#18241f"}}>
                    <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:colors[i%colors.length]}}/>
                  </div>
                </div>
                <span style={{color:"#7a8c84",fontSize:"11px",minWidth:"28px",textAlign:"right"}}>{pct}%</span>
              </div>
            );
          })}
          {Object.keys(gByEst).length===0&&<p style={{color:"#6f8179",fontSize:"12px"}}>Nenhum ganho</p>}
        </div>
        <div style={{background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff5470" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <p style={{margin:0,color:"#ff5470",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Origem da Perda</p>
          </div>
          {Object.entries(pByEst).sort(([,a],[,b])=>a-b).map(([n,v],i)=>{
            const pct = totPerda<0 ? Math.round((v/totPerda)*100) : 0;
            return (
              <div key={n} className="mtp-click-row" onClick={()=>abrirEst(n,{filtro:"loss",ordem:"menor"})} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                <div style={{width:"26px",height:"26px",borderRadius:"6px",background:"#ff547022",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:"#ff5470",fontSize:"9px",fontWeight:"800"}}>{n.slice(0,2).toUpperCase()}</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{color:"#ccc",fontSize:"12px",fontWeight:"600"}}>{n}</span>
                    <span style={{color:"#ff5470",fontSize:"12px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>-R$ {Math.abs(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                  </div>
                  <div style={{height:"3px",borderRadius:"2px",background:"#18241f"}}>
                    <div style={{height:"100%",width:pct+"%",borderRadius:"2px",background:"#ff5470"}}/>
                  </div>
                </div>
                <span style={{color:"#7a8c84",fontSize:"11px",minWidth:"28px",textAlign:"right"}}>{pct}%</span>
              </div>
            );
          })}
          {Object.keys(pByEst).length===0&&<p style={{color:"#6f8179",fontSize:"12px"}}>Nenhuma perda</p>}
        </div>
      </div>

      {/* Onde você ganha e perde: por mercado e por ativo */}
      {allTrades.length > 0 && (() => {
        const MOEDA = { B3:"R$", Forex:"$", Cripto:"$", Americano:"$" };
        const COR_M = { B3:"#2ee6a0", Forex:"#f5b941", Cripto:"#a78bfa", Americano:"#60a5fa" };
        const agrupa = chave => {
          const g = {};
          allTrades.forEach(t => {
            const k = chave(t);
            if (!g[k]) g[k] = { ops:0, wins:0, res:0, mercado:t.mercado };
            g[k].ops++; g[k].res += t.resultado || 0; if (t.tipo === "WIN") g[k].wins++;
          });
          return Object.entries(g).sort((a,b) => b[1].res - a[1].res);
        };
        const porMercado = agrupa(t => t.mercado || "B3");
        const porAtivo   = agrupa(t => (t.mercado || "B3") + "|" + ativoDoTrade(t));
        const listaAtivo = verTodosAtivos ? porAtivo : porAtivo.slice(0, 7);
        const Linha = ({ rot, sub, g, cor, maxAbs, mono, onClick }) => {
          const wr = Math.round(g.wins / g.ops * 100);
          const pos = g.res >= 0;
          return (
            <div className="mtp-click-row" onClick={onClick} style={{ display:"grid", gridTemplateColumns:"minmax(0,1.3fr) minmax(0,1fr) auto", alignItems:"center", gap:"14px", paddingTop:"10px", paddingBottom:"10px", borderBottom:"1px solid var(--line)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", minWidth:0 }}>
                <i className="mtp-dot" style={{ background:cor }}/>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"13.5px", fontWeight:"700", fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{rot}</p>
                  <p style={{ margin:"2px 0 0", color:"var(--text-3)", fontSize:"11.5px", fontFamily:"var(--font-mono)" }}>{sub ? sub+" · " : ""}{g.ops} ops · <span style={{ color: wr>=60?"#2ee6a0":wr>=40?"#f5b941":"#ff5470" }}>{wr}%</span></p>
                </div>
              </div>
              <div style={{ position:"relative", height:"6px", borderRadius:"6px", background:"var(--line)" }}>
                <div style={{ position:"absolute", top:0, bottom:0, left:"50%", width:"1px", background:"var(--line-strong)" }}/>
                <div style={{ position:"absolute", top:0, bottom:0, borderRadius:"6px", [pos?"left":"right"]:"50%", width:(Math.abs(g.res)/maxAbs*50)+"%", background: pos ? "linear-gradient(90deg,#2ee6a055,#2ee6a0)" : "linear-gradient(270deg,#ff547055,#ff5470)", boxShadow:"0 0 8px "+(pos?"#2ee6a066":"#ff547066") }}/>
              </div>
              <span style={{ color: pos ? "#2ee6a0" : "#ff5470", fontSize:"13.5px", fontWeight:"700", fontFamily:"var(--font-mono)", textAlign:"right", minWidth:"110px" }}>
                {pos?"+":"-"}{MOEDA[g.mercado]||"R$"} {Math.abs(g.res).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </span>
            </div>
          );
        };
        const maxM = Math.max(1, ...porMercado.map(([,g]) => Math.abs(g.res)));
        const maxA = Math.max(1, ...porAtivo.map(([,g]) => Math.abs(g.res)));
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p className="mtp-section-title">Onde você ganha e perde</p>
              <span className="mtp-section-hint">por mercado e por ativo</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.3fr",gap:"14px"}}>
              <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"14px 20px 6px"}}>
                <p className="mtp-card-title" style={{marginBottom:"6px"}}>Por mercado</p>
                {porMercado.map(([k,g]) => <Linha key={k} rot={k} g={g} cor={COR_M[k]||"#888"} maxAbs={maxM}
                  onClick={()=>{ const ops=allTrades.filter(t=>(t.mercado||"B3")===k); mostrar("mer:"+k, k, ops, {cor:COR_M[k], sub:sub(ops.length)+" no período"}); }}/>)}
              </div>
              <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"14px 20px 6px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px"}}>
                  <p className="mtp-card-title">Por ativo</p>
                  {porAtivo.length > 7 && <button onClick={()=>setVerTodosAtivos(!verTodosAtivos)} className="mtp-ctx-ghost" style={{padding:"4px 8px"}}>{verTodosAtivos ? "ver menos" : "ver todos ("+porAtivo.length+")"}</button>}
                </div>
                {listaAtivo.map(([k,g]) => {
                  const [m, a] = k.split("|");
                  return <Linha key={k} rot={a} sub={m} g={g} cor={a===SEM_ATIVO ? "var(--text-3)" : (COR_M[m]||"#888")} maxAbs={maxA} mono={a!==SEM_ATIVO}
                    onClick={()=>{ const ops=allTrades.filter(t=>(t.mercado||"B3")===m && ativoDoTrade(t)===a); mostrar("atv:"+k, a, ops, {cor:COR_M[m], sub:m+" · "+sub(ops.length)}); }}/>;
                })}
                {porAtivo.some(([k]) => k.endsWith("|"+SEM_ATIVO)) && (
                  <p style={{margin:"10px 0 8px",color:"var(--text-3)",fontSize:"11.5px"}}>Operações antigas não têm ativo — os novos registros no Diário já guardam.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* LINHA 4: Métricas por Estratégia full width */}
      {Object.keys(estratStats).length > 0 && (
        <div style={{marginBottom:"36px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
            <p className="mtp-section-title">Métricas por Estratégia</p>
            <span className="mtp-section-hint">clique para ver operações</span>
          </div>
          <GradeEquilibrada n={Object.keys(estratStats).length} mobile={isMobile}>
            {Object.entries(estratStats).map(([n,s],i)=>{
              const ass = s.total>0 ? Math.round((s.wins/s.total)*100) : 0;
              const cor = colors[i%colors.length];
              const mediaPts = s.total>0 ? (s.pontos/s.total).toFixed(1) : "0.0";
              const isSelected = painel?.chave === "est:"+n;
              return (
                <div key={n} onClick={()=>isSelected?setPainel(null):abrirEst(n)}
                  style={{background:"var(--card)",border:"1px solid "+(isSelected?cor+"66":"#1b2823"),borderRadius:"14px",padding:"18px",cursor:"pointer",...(isSelected?{boxShadow:"0 0 0 1px "+cor+"33"}:{})}}
                  onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.borderColor=cor+"44";}}}
                  onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.borderColor="#1b2823";}}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
                    <div style={{padding:"4px 8px",borderRadius:"6px",background:cor+"22",border:"1px solid "+cor+"44",flexShrink:0}}>
                      <span style={{color:cor,fontSize:"11px",fontWeight:"800",letterSpacing:"0.5px"}}>{n.slice(0,3).toUpperCase()}</span>
                    </div>
                    <span style={{color:"#aaa",fontSize:"13px",fontWeight:"500",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nomeAtual[n]||n}</span>
                    {isSelected && <span style={{color:cor,fontSize:"11px"}}>▸</span>}
                  </div>
                  <p style={{margin:"0 0 3px",color:s.pontos>=0?"#2ee6a0":"#ff5470",fontSize:"22px",fontWeight:"800",fontFamily:"var(--font-mono)",letterSpacing:"-0.5px"}}>
                    {s.pontos>=0?"+":""}{s.pontos.toFixed(1)} pts
                  </p>
                  <p style={{margin:"0 0 14px",color:s.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"14px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>
                    {s.resultado>=0?"+":"-"}R$ {Math.abs(s.resultado).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
                  </p>
                  <div style={{display:"flex",alignItems:"center",gap:"5px",fontSize:"12px",color:"#7a8c84",flexWrap:"wrap"}}>
                    <span>Assertividade <span style={{color:ass>=60?"#2ee6a0":ass>=40?"#f59e0b":"#ff5470",fontWeight:"700"}}>{ass}%</span></span>
                    <span style={{color:"#26352e"}}>·</span>
                    <span>{s.total} ops</span>
                    <span style={{color:"#26352e"}}>·</span>
                    <span>{parseFloat(mediaPts)>=0?"+":""}{mediaPts} /op</span>
                  </div>
                </div>
              );
            })}
          </GradeEquilibrada>
        </div>
      )}

      {/* LINHA 5: Métricas Complementares */}
      {allTrades.length > 0 && (
        <div style={{marginBottom:"36px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <p className="mtp-section-title">Métricas Complementares</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:"14px"}}>
          {[
            {abrir:()=>mostrar("venc","Operações vencedoras",ganhos,{cor:"#2ee6a0",sub:sub(ganhos.length)+" · média R$ "+mediaVenc.toFixed(2),ordem:"maior"}),label:"Média Vencedora",sub:"por trade",val:"R$ "+mediaVenc.toFixed(2),num:mediaVenc,fmtN:v=>"R$ "+v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}),color:"#2ee6a0",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ee6a0" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>},
            {abrir:()=>mostrar("perd","Operações perdedoras",perdas,{cor:"#ff5470",sub:sub(perdas.length)+" · média R$ "+mediaPerd.toFixed(2),ordem:"menor"}),label:"Média Perdedora",sub:"por trade",val:"R$ "+mediaPerd.toFixed(2),num:mediaPerd,fmtN:v=>"R$ "+v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}),color:"#ff5470",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff5470" strokeWidth="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/></svg>},
            {label:"Risco × Retorno",sub:"razão média",val:rr+":1",num:mediaPerd>0?mediaVenc/mediaPerd:null,fmtN:v=>v.toFixed(2)+":1",color:parseFloat(rr)>=1.5?"#2ee6a0":parseFloat(rr)>=1?"#f59e0b":"#ff5470",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>},
            {label:"Profit Factor",sub:"ganho / perda total",val:profitFactor!==null?profitFactor.toFixed(2):"—",num:profitFactor,fmtN:v=>v.toFixed(2),color:profitFactor>=1.5?"#f5b941":profitFactor>=1?"#f59e0b":"#ff5470",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>},
          ].map((s,i)=>(
            <div key={i} onClick={s.abrir} style={{...kpiCard,minHeight:"112px",cursor:s.abrir?"pointer":"default"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
                <p style={kpiLabel}>{s.label}</p>
                <div style={{width:"28px",height:"28px",borderRadius:"8px",background:s.color+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:s.color}}>{s.icon}</div>
              </div>
              <p style={{...kpiValue,fontSize:isMobile?"19px":"clamp(17px,1.4vw,22px)",color:s.color}}>{s.num!=null&&isFinite(s.num) ? <CountUp value={s.num} format={s.fmtN}/> : s.val}</p>
              <p style={kpiSub}>{s.sub}</p>
            </div>
          ))}
        </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 20px",background:"var(--card)",border:"1px solid #18241f",borderRadius:"14px",marginBottom:"36px"}}>
          <p style={{color:"#a3b2ab",fontSize:"14px",margin:0}}>Nenhum registro no período selecionado.</p>
          <p style={{color:"#222",fontSize:"12px",margin:"6px 0 0"}}>Registre operações no Diário para ver as métricas.</p>
        </div>
      )}

      {/* ── EMOÇÃO × RESULTADO + PERFORMANCE POR HORÁRIO (lado a lado) ── */}
      {(() => {
        const EMOCAO_COLORS = {"Focado":"#2ee6a0","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
        const emocaoStats = {};
        if (allTrades.length >= 3) filtered.forEach(([d,e]) => {
          const tot = (e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0)+(e.totalAmericano||0);
          const wr = e.winRate;
          (e.emocoes||[]).forEach(em => {
            if (!emocaoStats[em]) emocaoStats[em] = { resultado:0, dias:[], winRates:[] };
            emocaoStats[em].resultado += tot;
            emocaoStats[em].dias.push(d);
            if (wr !== undefined) emocaoStats[em].winRates.push(wr);
          });
        });
        const emList = Object.entries(emocaoStats).sort(([,a],[,b])=>b.resultado-a.resultado);
        const maxEm = Math.max(1, ...emList.map(([,s])=>Math.abs(s.resultado)));

        const comHorario = allTrades.filter(t=>t.horario);
        const horarioStats = {};
        if (comHorario.length >= 3) comHorario.forEach(t => {
          const hora = t.horario.slice(0,2)+"h";
          if (!horarioStats[hora]) horarioStats[hora] = {wins:0,total:0,resultado:0};
          horarioStats[hora].total++;
          horarioStats[hora].resultado += t.resultado||0;
          if (t.tipo==="WIN") horarioStats[hora].wins++;
        });
        const horaList = Object.entries(horarioStats).sort(([a],[b])=>a.localeCompare(b));
        const maxHora = Math.max(1, ...horaList.map(([,s])=>Math.abs(s.resultado)));

        const blocos = [];
        if (emList.length > 0) blocos.push(
          <div key="emo" style={{display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",gap:"10px"}}>
              <p className="mtp-section-title">Emoção × Resultado</p>
              <span className="mtp-section-hint">impacto no seu trading</span>
            </div>
            <div style={{flex:1,background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"14px 20px"}}>
              {emList.map(([em,s])=>{
                const cor = EMOCAO_COLORS[em]||"#888";
                const avgWR = s.winRates.length>0 ? Math.round(s.winRates.reduce((a,b)=>a+b,0)/s.winRates.length) : null;
                const barW = Math.round((Math.abs(s.resultado)/maxEm)*100);
                const pos = s.resultado >= 0;
                const nd = s.dias.length;
                return (
                  <div key={em} className="mtp-click-row" style={{display:"flex",alignItems:"center",gap:"12px"}}
                    onClick={()=>{ const dias=new Set(s.dias); const ops=allTrades.filter(t=>dias.has(t._date)); mostrar("emo:"+em, em, ops, {cor, sub:nd+" dia"+(nd!==1?"s":"")+" com essa emoção · "+sub(ops.length)}); }}>
                    <div style={{width:"96px",flexShrink:0}}>
                      <span style={{fontSize:"12.5px",fontWeight:"700",color:cor}}>{em}</span>
                      <p style={{margin:0,color:"#6f8179",fontSize:"10.5px"}}>{nd} dia{nd!==1?"s":""}{avgWR!==null?" · "+avgWR+"% wr":""}</p>
                    </div>
                    <div style={{flex:1,height:"4px",background:"#18241f",borderRadius:"2px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:barW+"%",background:pos?"#2ee6a0":"#ff5470",borderRadius:"4px",transition:"width 0.3s"}}/>
                    </div>
                    <span style={{width:"78px",textAlign:"right",fontSize:"12px",fontWeight:"700",fontFamily:"var(--font-mono)",color:pos?"#2ee6a0":"#ff5470",flexShrink:0}}>
                      {pos?"+":""}R$ {s.resultado.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
        if (horaList.length > 0) blocos.push(
          <div key="hora" style={{display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",gap:"10px"}}>
              <p className="mtp-section-title">Performance por Horário</p>
              <span className="mtp-section-hint">pelas operações com horário</span>
            </div>
            <div style={{flex:1,background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"14px 20px"}}>
              {horaList.map(([hora,s])=>{
                const wr = Math.round((s.wins/s.total)*100);
                const pos = s.resultado >= 0;
                const barW = Math.round((Math.abs(s.resultado)/maxHora)*100);
                const cor = wr>=60?"#2ee6a0":wr>=40?"#f59e0b":"#ff5470";
                return (
                  <div key={hora} className="mtp-click-row" style={{display:"flex",alignItems:"center",gap:"12px"}}
                    onClick={()=>{ const ops=comHorario.filter(t=>t.horario.slice(0,2)+"h"===hora); mostrar("hora:"+hora, "Operações das "+hora, ops, {sub:sub(ops.length)+" · "+wr+"% de acerto"}); }}>
                    <span style={{width:"36px",color:"#aaa",fontSize:"12px",fontFamily:"var(--font-mono)",fontWeight:"700",flexShrink:0}}>{hora}</span>
                    <div style={{width:"44px",textAlign:"center",flexShrink:0}}>
                      <span style={{fontSize:"11.5px",fontWeight:"700",color:cor}}>{wr}%</span>
                      <p style={{margin:0,color:"#6f8179",fontSize:"10px"}}>{s.total} ops</p>
                    </div>
                    <div style={{flex:1,height:"4px",background:"#18241f",borderRadius:"2px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:barW+"%",background:pos?"#2ee6a0":"#ff5470",borderRadius:"4px"}}/>
                    </div>
                    <span style={{width:"72px",textAlign:"right",fontSize:"12px",fontWeight:"700",fontFamily:"var(--font-mono)",color:pos?"#2ee6a0":"#ff5470",flexShrink:0}}>
                      {pos?"+":""}R$ {s.resultado.toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
        if (blocos.length === 0) return null;
        return (
          <div style={{display:"grid",gridTemplateColumns:isMobile||blocos.length===1?"1fr":"1fr 1fr",gap:"14px",marginBottom:"36px",alignItems:"stretch"}}>
            {blocos}
          </div>
        );
      })()}

      {/* ── SEÇÃO: CURVA DE CAPITAL POR ESTRATÉGIA ── */}
      {Object.keys(estratStats).length >= 2 && (() => {
        const colors2 = ["#2ee6a0","#f59e0b","#a78bfa","#f472b6","#34d399","#f0506e","#60a5fa"];
        const estratDays = {};
        filtered.forEach(([d,e]) => {
          (e.trades||[]).forEach(t => {
            const n = t.estrategia||"Sem nome";
            if (!estratDays[n]) estratDays[n] = {};
            if (!estratDays[n][d]) estratDays[n][d] = 0;
            estratDays[n][d] += (t.resultado||0);
          });
        });
        const allDates = [...new Set(filtered.map(([d])=>d))].sort();
        if (allDates.length < 2) return null;
        const estratNames = Object.keys(estratDays);
        const curves = estratNames.map((n,i) => {
          let acc = 0;
          const pts = allDates.map(d => { acc += estratDays[n][d]||0; return acc; });
          return { n, pts, last: acc, color: colors2[i%colors2.length] };
        }).sort((a,b)=>b.last-a.last);

        const W=700, H=200, PT=20, PB=30, PL=52, PR=16;
        const allVals = curves.flatMap(c=>c.pts);
        const minV = Math.min(0,...allVals), maxV = Math.max(1,...allVals);
        const range = maxV-minV||1;
        const xStep = allDates.length > 1 ? (W-PL-PR)/(allDates.length-1) : 0;
        const yScale = v => PT + (H-PT-PB)*(1-(v-minV)/range);
        const zero = yScale(0);
        const yTicks = [minV, minV+range*0.5, maxV].map(v=>({v, y:yScale(v)}));
        const step = Math.max(1, Math.floor(allDates.length/5));
        const xLabels = allDates.filter((_,i)=>i===0||i===allDates.length-1||i%step===0);

        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p className="mtp-section-title">Curva de Capital por Estratégia</p>
              <span className="mtp-section-hint">resultado acumulado R$</span>
            </div>
            <div style={{background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"20px 20px 14px"}}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block",marginBottom:"14px"}}>
                {yTicks.map(({v,y},i)=>(
                  <g key={i}>
                    <line x1={PL} y1={y} x2={W-PR} y2={y} stroke={v===0?"#ffffff18":"#ffffff08"} strokeWidth="1" strokeDasharray={v===0?"none":"3,4"}/>
                    <text x={PL-6} y={y+4} textAnchor="end" fill="#444" fontSize="9">{v>=0?"+":""}{Math.abs(v)>=1000?(v/1000).toFixed(1)+"k":v.toFixed(0)}</text>
                  </g>
                ))}
                {curves.map(({n,pts,color})=>{
                  if (pts.length < 2) return null;
                  const pathD = pts.map((v,i)=>`${i===0?"M":"L"}${PL+i*xStep},${yScale(v)}`).join(" ");
                  const areaD = `M${PL},${zero} `+pts.map((v,i)=>`L${PL+i*xStep},${yScale(v)}`).join(" ")+` L${PL+(pts.length-1)*xStep},${zero} Z`;
                  return (
                    <g key={n}>
                      <path d={areaD} fill={color} opacity="0.07"/>
                      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                      <circle cx={PL+(pts.length-1)*xStep} cy={yScale(pts[pts.length-1])} r="3" fill={color}/>
                    </g>
                  );
                })}
                {xLabels.map(d=>{
                  const i = allDates.indexOf(d);
                  return <text key={d} x={PL+i*xStep} y={H-4} textAnchor="middle" fill="#444" fontSize="9">{d.slice(5)}</text>;
                })}
              </svg>
              <div style={{display:"flex",flexWrap:"wrap",gap:"8px 14px"}}>
                {curves.map(({n,last,color})=>(
                  <div key={n} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",padding:"6px 10px",borderRadius:"8px",border:"1px solid #18241f",transition:"border-color 0.15s"}}
                    onClick={()=>abrirEst(n)}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=color+"55"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="#18241f"}>
                    <div style={{width:"22px",height:"3px",borderRadius:"2px",background:color,flexShrink:0}}/>
                    <span style={{fontSize:"12px",color:"#aaa"}}>{n}</span>
                    <span style={{fontSize:"12px",fontWeight:"800",fontFamily:"var(--font-mono)",color:last>=0?"#2ee6a0":"#ff5470"}}>{last>=0?"+":""}R${Math.abs(last)<1000?last.toFixed(0):(last/1000).toFixed(1)+"k"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SEÇÃO: SEQUÊNCIA WIN/LOSS POR ESTRATÉGIA ── */}
      {Object.keys(estratStats).length > 0 && (() => {
        const seqStats = {};
        Object.keys(estratStats).forEach(n => {
          const ops = filtered.flatMap(([,e])=>(e.trades||[]).filter(t=>t.estrategia===n));
          if (ops.length < 3) return;
          let maxWin=0,maxLoss=0,curWin=0,curLoss=0,curStreak=0,curType="";
          ops.forEach(t => {
            if (t.tipo==="WIN") { curWin++; curLoss=0; if(curWin>maxWin)maxWin=curWin; }
            else { curLoss++; curWin=0; if(curLoss>maxLoss)maxLoss=curLoss; }
          });
          // current streak
          for (let i=ops.length-1;i>=0;i--) {
            if (i===ops.length-1) { curType=ops[i].tipo; curStreak=1; }
            else if (ops[i].tipo===curType) curStreak++;
            else break;
          }
          seqStats[n] = { maxWin, maxLoss, curStreak, curType, total:ops.length };
        });
        const entries2 = Object.entries(seqStats);
        if (entries2.length === 0) return null;
        const colors2 = ["#2ee6a0","#f59e0b","#a78bfa","#f472b6","#34d399","#f0506e","#60a5fa"];
        return (
          <div style={{marginBottom:"36px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <p className="mtp-section-title">Sequências WIN/LOSS por Estratégia</p>
              <span className="mtp-section-hint">detecta fases de cada setup</span>
            </div>
            <GradeEquilibrada n={entries2.length} mobile={isMobile}>
              {entries2.map(([n,s],i)=>{
                const cor = colors2[i%colors2.length];
                const streakColor = s.curType==="WIN"?"#2ee6a0":"#ff5470";
                const alert = s.curLoss >= 3 || (s.curType==="LOSS" && s.curStreak>=2);
                return (
                  <div key={n} style={{background:"var(--card)",border:"1px solid "+(alert?"#f0506e33":"#18241f"),borderRadius:"14px",padding:"16px",cursor:"pointer"}}
                    onClick={()=>abrirEst(n)}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
                      <div style={{padding:"3px 7px",borderRadius:"5px",background:cor+"22",border:"1px solid "+cor+"33"}}>
                        <span style={{color:cor,fontSize:"10px",fontWeight:"800"}}>{n.slice(0,3).toUpperCase()}</span>
                      </div>
                      <span style={{color:"#aaa",fontSize:"12px",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n}</span>
                      {alert && <span style={{fontSize:"10px",color:"#ff5470"}}>⚠</span>}
                    </div>
                    <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
                      <div style={{flex:1,textAlign:"center",background:"rgba(63,232,168,0.08)",borderRadius:"8px",padding:"8px 4px"}}>
                        <p style={{margin:0,color:"#2ee6a0",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{s.maxWin}</p>
                        <p style={{margin:0,color:"#6f8179",fontSize:"9px",textTransform:"uppercase"}}>Max WIN</p>
                      </div>
                      <div style={{flex:1,textAlign:"center",background:"rgba(240,80,110,0.08)",borderRadius:"8px",padding:"8px 4px"}}>
                        <p style={{margin:0,color:"#ff5470",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{s.maxLoss}</p>
                        <p style={{margin:0,color:"#6f8179",fontSize:"9px",textTransform:"uppercase"}}>Max LOSS</p>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                      <span style={{fontSize:"11px",color:"#7a8c84"}}>Agora:</span>
                      <span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:streakColor+"18",color:streakColor}}>{s.curStreak}× {s.curType}</span>
                      {s.curType==="LOSS"&&s.curStreak>=2&&<span style={{fontSize:"10px",color:"#ff5470"}}>— revisar setup</span>}
                    </div>
                  </div>
                );
              })}
            </GradeEquilibrada>
          </div>
        );
      })()}

      {painel && <PainelOps painel={painel} onClose={()=>setPainel(null)} onEstrategia={n=>abrirEst(n)}/>}
    </div>
  );
}
function AlertasInteligentes({ trades, entries, winRate, diasOp }) {
  if (!trades || trades.length < 3) return null;

  const alertas = [];
  const today = dayKey(new Date());

  // ── 1. OVERTRADING (max 5 trades/dia)
  const tradesHoje = entries.filter(([d])=>d===today).flatMap(([,e])=>e.trades||[]);
  if (tradesHoje.length >= 5) {
    alertas.push({ tipo:"critico", msg:`⛔ Overtrading: ${tradesHoje.length} trades hoje. Feche a plataforma — cada entrada extra é uma aposta.` });
  } else if (tradesHoje.length >= 4) {
    alertas.push({ tipo:"aviso", msg:`🔔 ${tradesHoje.length} trades hoje. Atenção ao limite diário.` });
  }

  // ── 2. WIN RATE abaixo do mínimo profissional
  if (winRate !== null && winRate < 40 && trades.length >= 5) {
    alertas.push({ tipo:"critico", msg:`⚠️ Win rate em ${winRate}% — abaixo do mínimo profissional (40%). Pare e revise o setup.` });
  } else if (winRate !== null && winRate < 50 && trades.length >= 8) {
    alertas.push({ tipo:"aviso", msg:`📉 Win rate em ${winRate}% — abaixo de 50%. Monitore de perto.` });
  }

  // ── 3. DRAWDOWN DIÁRIO — dias negativos consecutivos
  const sortedDays = [...entries].sort(([a],[b])=>b.localeCompare(a));
  let negStreak = 0;
  for (const [,e] of sortedDays) {
    const tot = (e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0)+(e.totalAmericano||0);
    if (tot < 0) negStreak++; else break;
  }
  if (negStreak >= 3) {
    alertas.push({ tipo:"critico", msg:`🔴 ${negStreak} dias negativos consecutivos — reduza o tamanho das posições ou pare por hoje.` });
  } else if (negStreak >= 2) {
    alertas.push({ tipo:"aviso", msg:`🟡 2 dias negativos seguidos — revisite o plano antes de operar amanhã.` });
  }

  // ── 4. ESTRATÉGIA COM BAIXA ASSERTIVIDADE
  const estStats = {};
  trades.forEach(t => {
    const n = t.estrategia||"Sem nome";
    if (!estStats[n]) estStats[n] = {wins:0,total:0,resultado:0};
    estStats[n].total++;
    estStats[n].resultado += t.resultado||0;
    if (t.tipo==="WIN") estStats[n].wins++;
  });
  Object.entries(estStats).forEach(([n,s]) => {
    if (s.total >= 3) {
      const ass = Math.round((s.wins/s.total)*100);
      if (ass < 35) alertas.push({ tipo:"critico", msg:`⛔ "${n}" com ${ass}% de acerto em ${s.total} ops — considere pausar este setup.` });
    }
  });

  // ── 5. RISCO × RETORNO NEGATIVO
  const wins = trades.filter(t=>t.tipo==="WIN" && t.resultado);
  const losses = trades.filter(t=>t.tipo==="LOSS" && t.resultado);
  if (wins.length >= 3 && losses.length >= 3) {
    const mediaW = wins.reduce((s,t)=>s+(t.resultado||0),0)/wins.length;
    const mediaL = Math.abs(losses.reduce((s,t)=>s+(t.resultado||0),0)/losses.length);
    const rr = mediaL > 0 ? (mediaW/mediaL) : 0;
    if (rr < 0.8) alertas.push({ tipo:"critico", msg:`📊 RR médio de ${rr.toFixed(2)}:1 — você está ganhando menos do que perdendo. Revise alvos e stops.` });
    else if (rr < 1.2) alertas.push({ tipo:"aviso", msg:`📊 RR médio de ${rr.toFixed(2)}:1 — próximo do ponto de equilíbrio. Mire acima de 1.5:1.` });
  }

  // ── 6. EMOÇÃO DE RISCO no último dia
  const emocaoRisco = ["Ansioso","Frustrado","Revanche","Impaciente","Eufórico"];
  const ultimoDia = [...entries].sort(([a],[b])=>b.localeCompare(a))[0];
  if (ultimoDia) {
    const ruins = (ultimoDia[1].emocoes||[]).filter(e=>emocaoRisco.includes(e));
    if (ruins.length > 0) alertas.push({ tipo:"aviso", msg:`🧠 Você registrou "${ruins[0]}" — emoções de risco aumentam erros em 60%. Seja extra cauteloso.` });
  }

  // ── 7. SEQUÊNCIA LOSS — 3+ stops seguidos
  const ultimos = trades.slice(-5);
  let lossSeq = 0;
  for (let i=ultimos.length-1;i>=0;i--) {
    if (ultimos[i].tipo==="LOSS") lossSeq++; else break;
  }
  if (lossSeq >= 3) alertas.push({ tipo:"critico", msg:`🛑 ${lossSeq} stops seguidos — protocolo de pausa obrigatório. Espere 15 min antes de qualquer entrada.` });

  // ── 8. MELHOR HORÁRIO IGNORADO (se tem dados de horário)
  const tradesComHorario = trades.filter(t=>t.horario);
  if (tradesComHorario.length >= 5) {
    const horStats = {};
    tradesComHorario.forEach(t => {
      const h = t.horario.slice(0,2);
      if (!horStats[h]) horStats[h] = {wins:0,total:0};
      horStats[h].total++;
      if (t.tipo==="WIN") horStats[h].wins++;
    });
    const melhorHora = Object.entries(horStats).filter(([,s])=>s.total>=2).sort(([,a],[,b])=>b.wins/b.total-a.wins/a.total)[0];
    const piorHora   = Object.entries(horStats).filter(([,s])=>s.total>=2).sort(([,a],[,b])=>a.wins/a.total-b.wins/b.total)[0];
    if (melhorHora && piorHora && melhorHora[0]!==piorHora[0]) {
      const mWR = Math.round((melhorHora[1].wins/melhorHora[1].total)*100);
      const pWR = Math.round((piorHora[1].wins/piorHora[1].total)*100);
      if (mWR - pWR >= 30) {
        alertas.push({ tipo:"ok", msg:`⏰ Melhor horário: ${melhorHora[0]}h (${mWR}% WR). Evite operar às ${piorHora[0]}h (${pWR}% WR).` });
      }
    }
  }

  // ── 9. CONSISTÊNCIA — dias operados vs dias do período
  if (diasOp >= 5) {
    const totalTrades = trades.length;
    const mediaTradesDia = (totalTrades/diasOp).toFixed(1);
    if (parseFloat(mediaTradesDia) > 6) {
      alertas.push({ tipo:"aviso", msg:`📈 Média de ${mediaTradesDia} trades/dia — traders consistentes operam entre 2 e 5 entradas por dia.` });
    }
  }

  // ── 10. RESULTADO POSITIVO — reforço comportamental
  if (alertas.length === 0 || alertas.every(a=>a.tipo==="ok")) {
    const totalRes = trades.reduce((s,t)=>s+(t.resultado||0),0);
    if (totalRes > 0 && winRate && winRate >= 60) {
      alertas.push({ tipo:"ok", msg:`✅ Excelente desempenho no período. Win rate de ${winRate}% com resultado positivo. Mantenha a disciplina.` });
    } else {
      alertas.push({ tipo:"ok", msg:`✅ Nenhum alerta crítico no momento. Continue seguindo o plano.` });
    }
  }

  const cores = { critico:"#ff5470", aviso:"#f59e0b", ok:"#2ee6a0" };

  return (
    <div style={{flex:1,background:"var(--card)",border:"1px solid #18241f",borderRadius:"16px",padding:"16px 18px",minWidth:"240px",marginBottom:"36px"}}>
      <p style={{margin:"0 0 12px",color:"#7a8c84",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px",fontWeight:"700"}}>Alertas Inteligentes</p>
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {alertas.slice(0,5).map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"8px",padding:"9px 12px",borderRadius:"8px",background:cores[a.tipo]+"0d",border:"1px solid "+cores[a.tipo]+"33"}}>
            <p style={{margin:0,color:"#f0f0f0",fontSize:"13px",lineHeight:"1.6"}}>{a.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
