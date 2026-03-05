import { useState, useEffect } from "react";

const DEFAULT_BANCA_B3 = 3000;
const DEFAULT_BANCA_FOREX = 200;
const CRESCIMENTO_MENSAL = 0.08;

function getRulesB3(banca) {
  const stop = (banca * 0.01).toFixed(2);
  const perda = (banca * 0.03).toFixed(2);
  const meta = (banca * 0.02).toFixed(2);
  return [
    { id: 1, icon: "🎯", title: "Maximo 5 operacoes/dia", desc: "Apos 5 entradas, feche a plataforma independente do resultado. Sem excecoes.", personal: false },
    { id: 2, icon: "🛑", title: "Stop loss obrigatorio", desc: "Nunca entre sem stop definido ANTES de clicar. Stop = R$ " + stop + " (1% da banca atual).", personal: false },
    { id: 3, icon: "⛔", title: "Perda maxima diaria: R$ " + perda, desc: "3% da banca atual. Bateu R$ " + perda + " negativo no dia, encerra e fecha tudo.", personal: false },
    { id: 4, icon: "🏆", title: "Meta diaria: R$ " + meta, desc: "2% da banca atual. Bateu R$ " + meta + " positivo, pode encerrar ou operar com trailing stop.", personal: false },
    { id: 5, icon: "🔒", title: "Regra da vinganca", desc: "Tomou stop? Aguarde 15 minutos antes da proxima entrada. Sem excecoes.", personal: false },
    { id: 6, icon: "📵", title: "Horario proibido", desc: "Nao opere no primeiro candle de abertura nem nos 15 min antes do fechamento.", personal: false },
    { id: 7, icon: "📝", title: "Anotar no diario apos cada operacao", desc: "Registre motivo, emocao e resultado imediatamente apos fechar o trade. Sem anotacao = operacao nao conta.", personal: true },
    { id: 8, icon: "🚨", title: "3 stops seguidos = parar o dia", desc: "Tomou 3 stops consecutivos? Encerra imediatamente. Mercado nao esta no seu dia. Volte amanha.", personal: true },
  ];
}

function getRulesForex(banca) {
  const stop = (banca * 0.01).toFixed(2);
  const perda = (banca * 0.03).toFixed(2);
  const meta = (banca * 0.02).toFixed(2);
  return [
    { id: 1, icon: "🎯", title: "Maximo 5 operacoes/dia", desc: "Apos 5 entradas, feche a plataforma independente do resultado. Sem excecoes.", personal: false },
    { id: 2, icon: "🛑", title: "Risco por trade: $ " + stop + " (1%)", desc: "Com $ " + banca.toFixed(2) + ", cada stop representa no maximo $ " + stop + ". Calcule o lote antes.", personal: false },
    { id: 3, icon: "⛔", title: "Perda maxima diaria: $ " + perda, desc: "3% da banca ($ " + perda + "). Bateu esse numero, fecha MetaTrader e descansa.", personal: false },
    { id: 4, icon: "🏆", title: "Meta diaria: $ " + meta, desc: "2% da banca. Consistencia antes de ganancia.", personal: false },
    { id: 5, icon: "⏰", title: "Sessoes permitidas", desc: "Opere apenas Londres+NY overlap (13h-17h BRT). Maior liquidez, menos ruido.", personal: false },
    { id: 6, icon: "📐", title: "RR minimo 1:2", desc: "So entre se o alvo for pelo menos o dobro do stop. Sem RR 1:2, nao entra.", personal: false },
    { id: 7, icon: "📝", title: "Anotar no diario apos cada operacao", desc: "Registre motivo, emocao e resultado imediatamente apos fechar o trade. Sem anotacao = operacao nao conta.", personal: true },
    { id: 8, icon: "🚨", title: "3 stops seguidos = parar o dia", desc: "Tomou 3 stops consecutivos? Encerra imediatamente. Mercado nao esta no seu dia. Volte amanha.", personal: true },
  ];
}

function gerarProjecao(bancaInicial, meses) {
  const rows = [];
  let banca = bancaInicial;
  for (let i = 1; i <= meses; i++) {
    const meta = parseFloat((banca * (1 + CRESCIMENTO_MENSAL)).toFixed(2));
    rows.push({ mes: i, metaFinal: meta, lucroMes: parseFloat((meta - banca).toFixed(2)) });
    banca = meta;
  }
  return rows;
}

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function formatDate(s) { const p=s.split("-"); return p[2]+"/"+p[1]; }
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function formatMonthLabel(s) { const p=s.split("-"); return MONTH_NAMES[parseInt(p[1])-1]+" "+p[0]; }
function numColor(v) { return !v||v===0?"#777":v>0?"#00d4aa":"#ff4d4d"; }
function fmtB3(v) { if(v===undefined)return"—"; return (v>=0?"+":"")+"R$ "+v.toFixed(2); }
function fmtFx(v) { if(v===undefined)return"—"; return (v>=0?"+":"")+"$ "+v.toFixed(2); }

function saveToStorage(data) {
  try { localStorage.setItem("diario-v3", JSON.stringify(data)); } catch(e) { console.error(e); }
}

function loadFromStorage() {
  try { const r=localStorage.getItem("diario-v3"); return r?JSON.parse(r):{}; } catch(e) { return {}; }
}

function loadCompliance() {
  try { const r=localStorage.getItem("compliance-v1"); return r?JSON.parse(r):{}; } catch(e) { return {}; }
}
function saveCompliance(data) {
  try { localStorage.setItem("compliance-v1", JSON.stringify(data)); } catch(e) {}
}

function loadConfig() {
  try { const r=localStorage.getItem("config-v1"); return r?JSON.parse(r):{b3:DEFAULT_BANCA_B3,forex:DEFAULT_BANCA_FOREX}; } catch(e) { return {b3:DEFAULT_BANCA_B3,forex:DEFAULT_BANCA_FOREX}; }
}
function saveConfig(data) {
  try { localStorage.setItem("config-v1", JSON.stringify(data)); } catch(e) {}
}

function exportCSV(entries) {
  const header = "Data,B3 (R$),Forex ($),Total,Motivo,Nota";
  const rows = Object.entries(entries)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([d,e])=>{
      const total=((e.b3||0)+(e.forex||0)).toFixed(2);
      const esc=(s)=>'"'+(s||"").replace(/"/g,'""')+'"';
      return [formatDateFull(d), e.b3!==undefined?e.b3.toFixed(2):"", e.forex!==undefined?e.forex.toFixed(2):"", total, esc(e.motivo), esc(e.nota)].join(",");
    });
  const csv=[header,...rows].join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="diario_trader_"+new Date().getFullYear()+".csv"; a.click();
  URL.revokeObjectURL(url);
}

function EvoChart({ entries, selMonth }) {
  const monthEntries=Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>a.localeCompare(b));
  if(monthEntries.length<2) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"90px",color:"#555",fontSize:"12px"}}>Registre pelo menos 2 dias para ver o grafico</div>;
  let acc=0;
  const points=monthEntries.map(([d,e])=>{acc+=(e.b3||0)+(e.forex||0);return{d,val:acc};});
  const W=700,H=110,PL=12,PR=20,PT=16,PB=24;
  const vals=points.map(p=>p.val),minV=Math.min(0,...vals),maxV=Math.max(0,...vals),range=maxV-minV||1;
  const xPos=(i)=>PL+(i/(points.length-1))*(W-PL-PR);
  const yPos=(v)=>PT+(1-(v-minV)/range)*(H-PT-PB);
  const zeroY=yPos(0);
  const pathD=points.map((p,i)=>(i===0?"M":"L")+xPos(i).toFixed(1)+","+yPos(p.val).toFixed(1)).join(" ");
  const areaD=pathD+" L"+xPos(points.length-1).toFixed(1)+","+zeroY.toFixed(1)+" L"+xPos(0).toFixed(1)+","+zeroY.toFixed(1)+" Z";
  const lastVal=points[points.length-1].val,lc=lastVal>=0?"#00d4aa":"#ff4d4d";
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto",display:"block"}} preserveAspectRatio="none">
      <line x1={PL} y1={zeroY} x2={W-PR} y2={zeroY} stroke="#ffffff08" strokeWidth="1" strokeDasharray="4,4"/>
      <path d={areaD} fill={lastVal>=0?"rgba(0,212,170,0.1)":"rgba(255,77,77,0.07)"}/>
      <path d={pathD} fill="none" stroke={lc} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((p,i)=>(
        <g key={i}>
          <circle cx={xPos(i)} cy={yPos(p.val)} r="3" fill={p.val>=0?"#00d4aa":"#ff4d4d"} stroke="#0a0a0f" strokeWidth="1.5"/>
          {(i===0||i===points.length-1||i%3===0)&&<text x={xPos(i)} y={H-4} textAnchor="middle" fill="#888" fontSize="10" fontFamily="monospace">{formatDate(p.d)}</text>}
        </g>
      ))}
      <text x={xPos(points.length-1)+4} y={yPos(lastVal)-6} fill={lc} fontSize="11" fontWeight="bold" fontFamily="monospace">{lastVal>=0?"+":""}{lastVal.toFixed(0)}</text>
    </svg>
  );
}

function RuleCard({ rule, checked, onToggle }) {
  return (
    <div onClick={onToggle} style={{background:checked?(rule.personal?"rgba(245,158,11,0.07)":"rgba(0,212,170,0.08)"):"rgba(255,255,255,0.03)",border:"1px solid "+(checked?(rule.personal?"#f59e0b44":"#00d4aa44"):"#ffffff11"),borderRadius:"12px",padding:"14px 16px",cursor:"pointer",transition:"all 0.2s",display:"flex",gap:"12px",alignItems:"flex-start"}}>
      <div style={{width:"22px",height:"22px",borderRadius:"6px",border:"2px solid "+(checked?(rule.personal?"#f59e0b":"#00d4aa"):"#555"),background:checked?(rule.personal?"#f59e0b":"#00d4aa"):"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px",transition:"all 0.2s"}}>
        {checked&&<span style={{color:"#000",fontSize:"13px",fontWeight:"bold"}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"4px",flexWrap:"wrap"}}>
          <span style={{fontSize:"16px"}}>{rule.icon}</span>
          <span style={{color:"#f0f0f0",fontWeight:"600",fontSize:"14px"}}>{rule.title}</span>
          {rule.personal&&<span style={{background:"rgba(245,158,11,0.15)",color:"#f59e0b",fontSize:"10px",fontWeight:"700",padding:"2px 7px",borderRadius:"20px",letterSpacing:"0.5px"}}>PESSOAL</span>}
        </div>
        <p style={{color:"#999",fontSize:"12.5px",margin:0,lineHeight:"1.5"}}>{rule.desc}</p>
      </div>
    </div>
  );
}

function DiarioTab({ entries, setEntries }) {
  const [loading,setLoading]=useState(true);
  const [selMonth,setSelMonth]=useState(monthKey(todayKey()));
  const [form,setForm]=useState({b3:"",forex:"",motivo:"",nota:""});
  const [saving,setSaving]=useState(false);
  const [saveMsg,setSaveMsg]=useState("");
  const [expandedDay,setExpandedDay]=useState(null);
  const today=todayKey();

  useEffect(()=>{ setLoading(false); },[]);

  useEffect(()=>{
    const e=entries[today];
    if(e) setForm({b3:e.b3!==undefined?String(e.b3):"",forex:e.forex!==undefined?String(e.forex):"",motivo:e.motivo||"",nota:e.nota||""});
    else setForm({b3:"",forex:"",motivo:"",nota:""});
  },[today, entries]);

  const persist=(u)=>{ saveToStorage(u); setEntries(u); };

  const saveDay=()=>{
    const b3Val=form.b3!==""?parseFloat(form.b3):undefined;
    const fxVal=form.forex!==""?parseFloat(form.forex):undefined;
    if(b3Val===undefined&&fxVal===undefined) return;
    setSaving(true);
    try {
      persist({...entries,[today]:{b3:b3Val,forex:fxVal,motivo:form.motivo,nota:form.nota,ts:new Date().toISOString()}});
      setSaveMsg("✓ Salvo!"); setTimeout(()=>setSaveMsg(""),2500);
    } catch(_){ setSaveMsg("Erro ao salvar"); }
    setSaving(false);
  };

  const deleteEntry=(d)=>{ const u={...entries}; delete u[d]; persist(u); if(expandedDay===d)setExpandedDay(null); };

  const monthEntries=Object.entries(entries).filter(([d])=>monthKey(d)===selMonth).sort(([a],[b])=>b.localeCompare(a));
  const allMonths=[...new Set(Object.keys(entries).map(monthKey))].sort().reverse();
  if(!allMonths.includes(selMonth)) allMonths.unshift(selMonth);
  const totB3=monthEntries.reduce((s,[,e])=>s+(e.b3||0),0);
  const totFx=monthEntries.reduce((s,[,e])=>s+(e.forex||0),0);
  const diasPos=monthEntries.filter(([,e])=>(e.b3||0)+(e.forex||0)>0).length;
  const diasNeg=monthEntries.filter(([,e])=>(e.b3||0)+(e.forex||0)<0).length;
  const totalComb=totB3+totFx;
  const inputStyle={width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid #333",borderRadius:"8px",padding:"9px 12px",color:"#fff",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"sans-serif"};

  if(loading) return <div style={{color:"#666",padding:"40px",textAlign:"center"}}>Carregando...</div>;

  return (
    <div>
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #1a1a1a",borderRadius:"14px",padding:"20px",marginBottom:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div>
            <p style={{margin:0,color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px"}}>Registrar hoje</p>
            <p style={{margin:"3px 0 0",color:"#f0f0f0",fontSize:"15px",fontWeight:"600"}}>{formatDateFull(today)}</p>
          </div>
          {entries[today]&&<span style={{background:"rgba(0,212,170,0.1)",color:"#00d4aa",padding:"4px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:"600"}}>✓ Registrado</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"10px"}}>
          <div>
            <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>🇧🇷 Mini Indice (R$)</label>
            <input type="number" placeholder="Ex: 120 ou -60" value={form.b3} onChange={e=>setForm(f=>({...f,b3:e.target.value}))} style={inputStyle}/>
          </div>
          <div>
            <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>🌍 Forex ($)</label>
            <input type="number" placeholder="Ex: 4 ou -2" value={form.forex} onChange={e=>setForm(f=>({...f,forex:e.target.value}))} style={inputStyle}/>
          </div>
        </div>
        <div style={{marginBottom:"10px"}}>
          <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>📌 Motivo da operacao</label>
          <textarea placeholder="Por que voce entrou? Qual foi o setup..." value={form.motivo} onChange={e=>setForm(f=>({...f,motivo:e.target.value}))} rows={3} style={{...inputStyle,resize:"vertical",lineHeight:"1.6",minHeight:"72px"}}/>
        </div>
        <div style={{marginBottom:"14px"}}>
          <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>💬 Nota do dia</label>
          <input type="text" placeholder="Emocoes, disciplina, licoes..." value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} style={{...inputStyle,color:"#bbb"}}/>
        </div>
        <div style={{display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={saveDay} disabled={saving} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"8px",padding:"10px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer",opacity:saving?0.6:1}}>
            {saving?"Salvando...":saveMsg||"💾 Salvar dia"}
          </button>
          {Object.keys(entries).length>0&&(
            <button onClick={()=>exportCSV(entries)} style={{background:"rgba(255,255,255,0.04)",color:"#999",border:"1px solid #333",borderRadius:"8px",padding:"10px 18px",fontWeight:"600",fontSize:"12px",cursor:"pointer"}}>
              ⬇ Exportar CSV / Excel
            </button>
          )}
        </div>
        {Object.keys(entries).length>0&&<p style={{margin:"10px 0 0",color:"#666",fontSize:"11px"}}>💡 O CSV exportado abre diretamente no Excel e Google Sheets.</p>}
      </div>

      <div style={{display:"flex",gap:"6px",marginBottom:"16px",flexWrap:"wrap"}}>
        {allMonths.map(m=><button key={m} onClick={()=>setSelMonth(m)} style={{padding:"5px 13px",borderRadius:"20px",cursor:"pointer",fontWeight:"600",fontSize:"11.5px",border:"none",background:selMonth===m?"#00d4aa":"rgba(255,255,255,0.05)",color:selMonth===m?"#000":"#666"}}>{formatMonthLabel(m)}</button>)}
      </div>

      {monthEntries.length>0&&(<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px",marginBottom:"16px"}}>
          {[{label:"Total B3",value:fmtB3(totB3),color:numColor(totB3)},{label:"Total Forex",value:fmtFx(totFx),color:numColor(totFx)},{label:"Dias +",value:diasPos,color:"#00d4aa"},{label:"Dias -",value:diasNeg,color:diasNeg>0?"#ff4d4d":"#555"}].map((s,i)=>(
            <div key={i} style={{padding:"11px 10px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #ffffff08",textAlign:"center"}}>
              <p style={{margin:"0 0 4px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</p>
              <p style={{margin:0,color:s.color,fontWeight:"700",fontSize:"14px",fontFamily:"monospace"}}>{s.value}</p>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #ffffff07",borderRadius:"12px",padding:"14px 14px 8px",marginBottom:"18px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
            <p style={{margin:0,color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Evolucao acumulada — {formatMonthLabel(selMonth)}</p>
            <span style={{color:numColor(totalComb),fontSize:"12px",fontWeight:"700",fontFamily:"monospace"}}>{totalComb>=0?"+":""}{totalComb.toFixed(2)}</span>
          </div>
          <EvoChart entries={entries} selMonth={selMonth}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {monthEntries.map(([ds,entry])=>{
            const total=(entry.b3||0)+(entry.forex||0),isToday=ds===today,isOpen=expandedDay===ds,hasDetail=entry.motivo||entry.nota;
            return (
              <div key={ds} style={{borderRadius:"10px",overflow:"hidden",border:"1px solid "+(isToday?"#00d4aa18":"#ffffff07"),background:isToday?"rgba(0,212,170,0.03)":"rgba(255,255,255,0.02)"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"11px 14px",cursor:hasDetail?"pointer":"default"}} onClick={()=>hasDetail&&setExpandedDay(isOpen?null:ds)}>
                  <div style={{minWidth:"58px"}}><p style={{margin:0,color:isToday?"#00d4aa":"#777",fontSize:"12px",fontWeight:"600"}}>{isToday?"Hoje":formatDateFull(ds)}</p></div>
                  <div style={{display:"flex",gap:"12px",flex:1,flexWrap:"wrap",alignItems:"center"}}>
                    {entry.b3!==undefined&&<span style={{color:numColor(entry.b3),fontSize:"12px",fontFamily:"monospace",fontWeight:"600"}}>🇧🇷 {fmtB3(entry.b3)}</span>}
                    {entry.forex!==undefined&&<span style={{color:numColor(entry.forex),fontSize:"12px",fontFamily:"monospace",fontWeight:"600"}}>🌍 {fmtFx(entry.forex)}</span>}
                    {hasDetail&&<span style={{color:"#666",fontSize:"11px"}}>{isOpen?"▲ fechar":"▼ detalhes"}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
                    <span style={{color:numColor(total),fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{total>0?"+":""}{total.toFixed(2)}</span>
                    <button onClick={e=>{e.stopPropagation();deleteEntry(ds);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"12px",padding:"2px 5px"}}>✕</button>
                  </div>
                </div>
                {isOpen&&hasDetail&&(
                  <div style={{borderTop:"1px solid #ffffff07",padding:"12px 14px",display:"flex",flexDirection:"column",gap:"10px"}}>
                    {entry.motivo&&<div><p style={{margin:"0 0 4px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>📌 Motivo</p><p style={{margin:0,color:"#bbb",fontSize:"13px",lineHeight:"1.6"}}>{entry.motivo}</p></div>}
                    {entry.nota&&<div><p style={{margin:"0 0 4px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>💬 Nota</p><p style={{margin:0,color:"#888",fontSize:"13px",fontStyle:"italic"}}>{entry.nota}</p></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>)}
      {monthEntries.length===0&&<div style={{textAlign:"center",padding:"48px 20px",color:"#555",fontSize:"13px"}}>Nenhum registro em {formatMonthLabel(selMonth)}.<br/><span style={{fontSize:"12px",color:"#444"}}>Registre seu primeiro resultado acima</span></div>}
    </div>
  );
}

function CrescimentoTab({ entries, bancaRealB3, bancaRealForex, bancaInicialB3, bancaInicialForex }) {
  const [viewMarket,setViewMarket]=useState("b3");
  const byMonth={};
  Object.entries(entries).forEach(([d,e])=>{
    const mk=monthKey(d);
    if(!byMonth[mk]) byMonth[mk]={b3:0,forex:0};
    byMonth[mk].b3+=e.b3||0; byMonth[mk].forex+=e.forex||0;
  });
  const bancaBase=viewMarket==="b3"?bancaRealB3:bancaRealForex;
  const projecao=gerarProjecao(bancaBase,12);
  const cur=viewMarket==="b3"?"R$":"$";
  const color=viewMarket==="b3"?"#00d4aa":"#f59e0b";
  const iB=viewMarket==="b3"?(bancaInicialB3||DEFAULT_BANCA_B3):(bancaInicialForex||DEFAULT_BANCA_FOREX);
  const mesesComDados=Object.keys(byMonth).sort();
  let accB3=bancaInicialB3,accFx=bancaInicialForex;
  const realRows=mesesComDados.map((mk)=>{
    accB3+=byMonth[mk].b3; accFx+=byMonth[mk].forex;
    return{mk,label:formatMonthLabel(mk),bancaB3:parseFloat(accB3.toFixed(2)),bancaForex:parseFloat(accFx.toFixed(2)),lucroB3:parseFloat(byMonth[mk].b3.toFixed(2)),lucroForex:parseFloat(byMonth[mk].forex.toFixed(2))};
  });
  const bancaAtual=viewMarket==="b3"?bancaRealB3:bancaRealForex;
  const metaMes1=projecao[0]?.metaFinal||bancaAtual;

  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        {["b3","forex"].map(m=><button key={m} onClick={()=>setViewMarket(m)} style={{padding:"7px 18px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"13px",border:"none",background:viewMarket===m?(m==="b3"?"#00d4aa":"#f59e0b"):"rgba(255,255,255,0.05)",color:viewMarket===m?"#000":"#777"}}>{m==="b3"?"🇧🇷 Mini Indice":"🌍 Forex"}</button>)}
      </div>
      <div style={{padding:"10px 14px",borderRadius:"8px",background:"rgba(0,212,170,0.05)",border:"1px solid #00d4aa18",marginBottom:"16px",display:"flex",gap:"8px",alignItems:"center"}}>
        <span>🔄</span>
        <p style={{margin:0,color:"#00d4aa88",fontSize:"11.5px"}}>Projecao calculada a partir da <strong style={{color:"#00d4aa"}}>banca real atual</strong> ({cur} {bancaAtual.toLocaleString("pt-BR",{minimumFractionDigits:2})})</p>
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid "+color+"22",borderRadius:"14px",padding:"20px",marginBottom:"20px"}}>
        <p style={{margin:"0 0 14px",color:"#777",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Status atual</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"12px"}}>
          {[
            {label:"Banca inicial",val:cur+" "+iB.toLocaleString("pt-BR",{minimumFractionDigits:2}),color:"#888"},
            {label:"Banca real hoje",val:cur+" "+bancaAtual.toLocaleString("pt-BR",{minimumFractionDigits:2}),color},
            {label:"Meta mes 1",val:cur+" "+metaMes1.toLocaleString("pt-BR",{minimumFractionDigits:2}),color:"#aaa"},
          ].map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <p style={{margin:"0 0 4px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</p>
              <p style={{margin:0,color:s.color,fontSize:i===1?"22px":"18px",fontWeight:"700",fontFamily:"monospace"}}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"20px"}}>
        {projecao.map((p,i)=>{
          const real=realRows[i];
          const realBanca=viewMarket==="b3"?real?.bancaB3:real?.bancaForex;
          const isFuture=!real;
          const mesLabel=real?real.label:"Mes "+(i+1);
          const delta=realBanca!==undefined?realBanca-p.metaFinal:null;
          const aheadRow=delta!==null&&delta>=0;
          return (
            <div key={i} style={{borderRadius:"10px",padding:"12px 16px",background:real?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.01)",border:"1px solid "+(real?(aheadRow?"#00d4aa18":"#ff4d4d18"):"#ffffff07"),opacity:isFuture?0.75:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{minWidth:"70px"}}>
                  <p style={{margin:0,color:real?"#f0f0f0":"#777",fontSize:"13px",fontWeight:"600"}}>{mesLabel}</p>
                  {isFuture&&<p style={{margin:0,color:"#999",fontSize:"11px"}}>futuro</p>}
                </div>
                <div style={{flex:1}}>
                  <p style={{margin:"0 0 1px",color:"#aaa",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Meta projetada</p>
                  <p style={{margin:0,color:"#bbb",fontSize:"13px",fontFamily:"monospace"}}>
                    {cur} {p.metaFinal.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                    <span style={{color:"#999",fontSize:"11px",marginLeft:"6px"}}>(+{cur} {p.lucroMes.toFixed(2)})</span>
                  </p>
                </div>
                <div style={{flex:1,textAlign:"right"}}>
                  {real?(<>
                    <p style={{margin:"0 0 1px",color:"#aaa",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.8px"}}>Real</p>
                    <p style={{margin:0,color,fontSize:"13px",fontFamily:"monospace",fontWeight:"700"}}>
                      {cur} {realBanca.toLocaleString("pt-BR",{minimumFractionDigits:2})}
                      <span style={{color:aheadRow?"#00d4aa66":"#ff4d4d66",fontSize:"11px",marginLeft:"6px"}}>{aheadRow?"▲":"▼"} {Math.abs(delta).toFixed(2)}</span>
                    </p>
                  </>):<p style={{margin:0,color:"#888",fontSize:"12px",fontStyle:"italic"}}>—</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:"14px 16px",borderRadius:"10px",background:"rgba(255,255,255,0.01)",border:"1px solid #ffffff07"}}>
        <p style={{margin:0,color:"#777",fontSize:"12px",lineHeight:"1.6"}}>Projecao baseada em <strong style={{color:"#999"}}>8% ao mes</strong> sobre a banca real atual. Atualiza automaticamente a cada registro no Diario.</p>
      </div>
    </div>
  );
}

function PatrimonioChart({ entries, bancaRealB3, bancaRealForex, bancaInicialB3, bancaInicialForex }) {
  const [market,setMarket]=useState("b3");
  const [tooltip,setTooltip]=useState(null);
  const iB=market==="b3"?(bancaInicialB3||DEFAULT_BANCA_B3):(bancaInicialForex||DEFAULT_BANCA_FOREX);
  const cur=market==="b3"?"R$":"$";
  const color=market==="b3"?"#00d4aa":"#f59e0b";
  const bancaAtual=market==="b3"?bancaRealB3:bancaRealForex;
  const sortedDays=Object.entries(entries).sort(([a],[b])=>a.localeCompare(b));
  let accReal=iB;
  const realPoints=[{d:"Inicio",val:iB,label:"Inicio"},...sortedDays.map(([d,e])=>{
    accReal+=market==="b3"?(e.b3||0):(e.forex||0);
    return{d,val:parseFloat(accReal.toFixed(2)),label:formatDateFull(d)};
  })];
  const proj=gerarProjecao(bancaAtual,12);
  const projPoints=[{val:bancaAtual,label:"Hoje"},...proj.map((p,i)=>({val:p.metaFinal,label:"Mes "+(i+1)}))];
  const W=720,H=340,PL=72,PR=24,PT=20,PB=48,innerW=W-PL-PR,innerH=H-PT-PB;
  const allVals=[...realPoints.map(p=>p.val),...projPoints.map(p=>p.val)];
  const rawMin=Math.min(...allVals),rawMax=Math.max(...allVals);
  const pad=(rawMax-rawMin)*0.08||iB*0.1;
  const yMin=rawMin-pad,yMax=rawMax+pad;
  const xReal=(i)=>PL+(i/Math.max(realPoints.length-1,1))*innerW;
  const xProj=(i)=>PL+(i/12)*innerW;
  const yScale=(v)=>PT+(1-(v-yMin)/(yMax-yMin))*innerH;
  const yTicks=Array.from({length:6},(_,i)=>yMin+(i/5)*(yMax-yMin));
  const realPath=realPoints.map((p,i)=>(i===0?"M":"L")+xReal(i).toFixed(1)+","+yScale(p.val).toFixed(1)).join(" ");
  const projPath=projPoints.map((p,i)=>(i===0?"M":"L")+xProj(i).toFixed(1)+","+yScale(p.val).toFixed(1)).join(" ");
  const realArea=realPoints.length>1?realPath+" L"+xReal(realPoints.length-1).toFixed(1)+","+(PT+innerH).toFixed(1)+" L"+PL+","+(PT+innerH).toFixed(1)+" Z":"";
  const xTickLabels=["Hoje","M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];
  const fmtVal=(v)=>v>=1000?cur+" "+(v/1000).toFixed(1)+"k":cur+" "+v.toFixed(0);

  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"16px"}}>
        {["b3","forex"].map(m=><button key={m} onClick={()=>setMarket(m)} style={{padding:"7px 18px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"13px",border:"none",background:market===m?(m==="b3"?"#00d4aa":"#f59e0b"):"rgba(255,255,255,0.05)",color:market===m?"#000":"#777"}}>{m==="b3"?"🇧🇷 Mini Indice":"🌍 Forex"}</button>)}
      </div>
      <div style={{padding:"10px 14px",borderRadius:"8px",background:"rgba(0,212,170,0.05)",border:"1px solid #00d4aa18",marginBottom:"16px",display:"flex",gap:"8px",alignItems:"center"}}>
        <span>🔄</span>
        <p style={{margin:0,color:"#00d4aa88",fontSize:"11.5px"}}>Curva projetada parte da <strong style={{color:"#00d4aa"}}>banca real atual</strong> ({cur} {bancaAtual.toLocaleString("pt-BR",{minimumFractionDigits:2})}). Atualiza a cada registro.</p>
      </div>
      <div style={{display:"flex",gap:"20px",marginBottom:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
          <svg width="28" height="3"><line x1="0" y1="1.5" x2="28" y2="1.5" stroke={color} strokeWidth="2.5" strokeLinecap="round"/></svg>
          <span style={{color:"#aaa",fontSize:"12px"}}>Banca real</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
          <svg width="28" height="3"><line x1="0" y1="1.5" x2="28" y2="1.5" stroke="#ffffff22" strokeWidth="2" strokeDasharray="5,3"/></svg>
          <span style={{color:"#777",fontSize:"12px"}}>Projecao 8%/mes</span>
        </div>
      </div>
      <div style={{position:"relative",background:"rgba(255,255,255,0.02)",border:"1px solid #ffffff08",borderRadius:"14px",padding:"8px",overflow:"hidden"}}>
        <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto",display:"block",cursor:"crosshair"}} onMouseLeave={()=>setTooltip(null)}>
          {yTicks.map((v,i)=>(
            <g key={i}>
              <line x1={PL} y1={yScale(v)} x2={W-PR} y2={yScale(v)} stroke="#ffffff07" strokeWidth="1"/>
              <text x={PL-6} y={yScale(v)+4} textAnchor="end" fill="#aaa" fontSize="11" fontFamily="monospace">{fmtVal(v)}</text>
            </g>
          ))}
          {xTickLabels.map((lbl,i)=>(
            <g key={i}>
              <line x1={xProj(i)} y1={PT} x2={xProj(i)} y2={PT+innerH} stroke="#ffffff05" strokeWidth="1"/>
              <text x={xProj(i)} y={PT+innerH+14} textAnchor="middle" fill="#999" fontSize="11" fontFamily="monospace">{lbl}</text>
            </g>
          ))}
          <line x1={PL} y1={PT} x2={PL} y2={PT+innerH} stroke="#ffffff10" strokeWidth="1"/>
          <line x1={PL} y1={PT+innerH} x2={W-PR} y2={PT+innerH} stroke="#ffffff10" strokeWidth="1"/>
          <line x1={PL} y1={yScale(iB)} x2={W-PR} y2={yScale(iB)} stroke="#ffffff12" strokeWidth="1" strokeDasharray="2,6"/>
          <text x={PL-6} y={yScale(iB)-5} textAnchor="end" fill="#888" fontSize="10" fontFamily="monospace">inicial</text>
          {realArea&&<path d={realArea} fill={color+"0d"}/>}
          <path d={projPath} fill="none" stroke="#ffffff20" strokeWidth="1.5" strokeDasharray="6,4" strokeLinejoin="round"/>
          {realPoints.length>1&&<path d={realPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
          {realPoints.map((p,i)=>(
            <circle key={i} cx={xReal(i)} cy={yScale(p.val)} r="4" fill={p.val>=iB?color:"#ff4d4d"} stroke="#0a0a0f" strokeWidth="2" style={{cursor:"pointer"}}
              onMouseEnter={(e)=>{
                const svgRect=e.currentTarget.closest("svg").getBoundingClientRect();
                const scale=svgRect.width/W;
                setTooltip({x:xReal(i)*scale,y:yScale(p.val)*scale,label:p.label,val:p.val,diff:parseFloat((p.val-iB).toFixed(2))});
              }}
            />
          ))}
          <circle cx={xProj(12)} cy={yScale(projPoints[12].val)} r="3.5" fill="#ffffff22" stroke="#0a0a0f" strokeWidth="1.5"/>
        </svg>
        {tooltip&&(
          <div style={{position:"absolute",left:tooltip.x+12,top:tooltip.y-38,background:"#13131a",border:"1px solid "+color+"44",borderRadius:"8px",padding:"8px 12px",pointerEvents:"none",whiteSpace:"nowrap",zIndex:10}}>
            <p style={{margin:"0 0 2px",color:"#888",fontSize:"10px"}}>{tooltip.label}</p>
            <p style={{margin:"0 0 1px",color,fontWeight:"700",fontSize:"13px",fontFamily:"monospace"}}>{cur} {tooltip.val.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
            <p style={{margin:0,color:tooltip.diff>=0?"#00d4aa":"#ff4d4d",fontSize:"11px",fontFamily:"monospace"}}>{tooltip.diff>=0?"+":""}{cur} {Math.abs(tooltip.diff).toFixed(2)} vs inicial</p>
          </div>
        )}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginTop:"14px"}}>
        {[
          {label:"Banca inicial",val:cur+" "+iB.toLocaleString("pt-BR",{minimumFractionDigits:2}),color:"#666"},
          {label:"Banca real atual",val:cur+" "+bancaAtual.toLocaleString("pt-BR",{minimumFractionDigits:2}),color},
          {label:"Meta 12 meses",val:cur+" "+projPoints[12].val.toLocaleString("pt-BR",{minimumFractionDigits:2}),color:"#aaa"},
        ].map((s,i)=>(
          <div key={i} style={{padding:"12px",borderRadius:"10px",background:"rgba(255,255,255,0.02)",border:"1px solid #ffffff07",textAlign:"center"}}>
            <p style={{margin:"0 0 4px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{s.label}</p>
            <p style={{margin:0,color:s.color,fontWeight:"700",fontSize:"14px",fontFamily:"monospace"}}>{s.val}</p>
          </div>
        ))}
      </div>
      {realPoints.length<=1&&<div style={{marginTop:"16px",padding:"14px 16px",borderRadius:"10px",background:"rgba(255,255,255,0.01)",border:"1px solid #ffffff07",textAlign:"center"}}><p style={{margin:0,color:"#666",fontSize:"13px"}}>Registre operacoes no Diario para a curva real aparecer.</p></div>}
    </div>
  );
}

export default function App() {
  const [tab,setTab]=useState("regras");
  const [market,setMarket]=useState("b3");
  const [checked,setChecked]=useState({});
  const [entries,setEntries]=useState({});
  const [compliance,setCompliance]=useState({});
  const [config,setConfig]=useState({b3:DEFAULT_BANCA_B3,forex:DEFAULT_BANCA_FOREX});

  useEffect(()=>{
    const data=loadFromStorage();
    setEntries(data);
    setCompliance(loadCompliance());
    setConfig(loadConfig());
    const onStorage=(e)=>{
      if(e.key==="diario-v3"&&e.newValue){
        try{setEntries(JSON.parse(e.newValue));}catch(_){}
      }
      if(e.key==="compliance-v1"&&e.newValue){
        try{setCompliance(JSON.parse(e.newValue));}catch(_){}
      }
    };
    window.addEventListener("storage",onStorage);
    return ()=>window.removeEventListener("storage",onStorage);
  },[]);

  const bancaInicialB3=config.b3||DEFAULT_BANCA_B3;
  const bancaInicialForex=config.forex||DEFAULT_BANCA_FOREX;
  const bancaRealB3=Object.values(entries).reduce((s,e)=>s+(e.b3||0),bancaInicialB3);
  const bancaRealForex=Object.values(entries).reduce((s,e)=>s+(e.forex||0),bancaInicialForex);
  const rules=market==="b3"?getRulesB3(bancaRealB3):getRulesForex(bancaRealForex);
  const toggle=(id)=>setChecked(c=>({...c,[market+"-"+id]:!c[market+"-"+id]}));
  const allChecked=rules.every(r=>checked[market+"-"+r.id]);

  const tabs=[{id:"regras",label:"📋 Regras"},{id:"diario",label:"📒 Diario"},{id:"parcial",label:"✂️ Parciais"},{id:"banca",label:"💰 Banca"},{id:"crescimento",label:"📈 Crescimento"},{id:"patrimonio",label:"📉 Patrimonio"}];
  const MktBtn=({m})=>(<button onClick={()=>setMarket(m)} style={{padding:"8px 20px",borderRadius:"8px",cursor:"pointer",fontWeight:"600",fontSize:"13px",transition:"all 0.2s",background:market===m?(m==="b3"?"#00d4aa":"#f59e0b"):"rgba(255,255,255,0.05)",color:market===m?"#000":"#888",border:"1px solid "+(market===m?"transparent":"#333")}}>{m==="b3"?"🇧🇷 Mini Indice":"🌍 Forex"}</button>);

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",color:"#f0f0f0",fontFamily:"sans-serif",padding:"32px 20px"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:"800px",margin:"0 auto 28px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"10px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px"}}>⚡</div>
          <div>
            <h1 style={{margin:0,fontSize:"22px",fontWeight:"700",letterSpacing:"-0.5px"}}>Plano de Operacao</h1>
            <p style={{margin:0,color:"#666",fontSize:"13px"}}>Mini Indice B3 · Forex · Gestao Comportamental</p>
          </div>
        </div>
        <div style={{display:"flex",gap:"8px"}}><MktBtn m="b3"/><MktBtn m="forex"/></div>
      </div>

      <div style={{maxWidth:"800px",margin:"0 auto 24px",display:"flex",gap:"4px",background:"rgba(255,255,255,0.03)",borderRadius:"12px",padding:"4px"}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 2px",borderRadius:"9px",cursor:"pointer",background:tab===t.id?"rgba(255,255,255,0.08)":"transparent",color:tab===t.id?"#f0f0f0":"#999",border:"none",fontSize:"14px",fontWeight:"600",transition:"all 0.2s"}}>{t.label}</button>)}
      </div>

      <div style={{maxWidth:"800px",margin:"0 auto"}}>

        {tab==="regras"&&(()=>{
          const today=todayKey();
          const todayComplied=compliance[today]===true;
          const markToday=()=>{
            const updated={...compliance,[today]:!todayComplied};
            saveCompliance(updated);
            setCompliance(updated);
          };
          // Calendar data for current month
          const now=new Date();
          const year=now.getFullYear(), month=now.getMonth();
          const firstDay=new Date(year,month,1).getDay();
          const daysInMonth=new Date(year,month+1,0).getDate();
          const calKey=(d)=>year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
          const totalDaysWithData=Object.keys(compliance).filter(k=>monthKey(k)===monthKey(today)&&compliance[k]!==undefined).length;
          const compliedDays=Object.keys(compliance).filter(k=>monthKey(k)===monthKey(today)&&compliance[k]===true).length;
          const pct=totalDaysWithData>0?Math.round((compliedDays/totalDaysWithData)*100):null;
          return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
                <div>
                  <h2 style={{margin:0,fontSize:"15px",color:"#888",fontWeight:"500"}}>Checklist — marque antes de abrir a plataforma</h2>
                  <p style={{margin:"4px 0 0",color:"#555",fontSize:"12px"}}>Regras em <span style={{color:"#f59e0b"}}>amarelo</span> sao suas regras pessoais</p>
                </div>
                {allChecked&&<span style={{background:"rgba(0,212,170,0.15)",color:"#00d4aa",padding:"4px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:"600"}}>✓ Pronto para operar</span>}
              </div>
              <div style={{padding:"10px 14px",borderRadius:"8px",background:"rgba(0,212,170,0.05)",border:"1px solid #00d4aa18",marginBottom:"14px",display:"flex",gap:"8px",alignItems:"center"}}>
                <span>🔄</span>
                <p style={{margin:0,color:"#00d4aa88",fontSize:"11.5px"}}>Valores calculados sobre a banca real atual: <strong style={{color:"#00d4aa"}}>{market==="b3"?"R$ "+bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2}):"$ "+bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong></p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {rules.map(r=><RuleCard key={r.id} rule={r} checked={!!checked[market+"-"+r.id]} onToggle={()=>toggle(r.id)}/>)}
              </div>
              <div style={{marginTop:"24px",padding:"16px 20px",borderRadius:"12px",background:"rgba(255,77,77,0.05)",border:"1px solid rgba(255,77,77,0.15)"}}>
                <p style={{margin:0,color:"#ff4d4d",fontWeight:"600",fontSize:"14px"}}>⚠️ Regra de ouro do overtrading</p>
                <p style={{margin:"8px 0 0",color:"#888",fontSize:"13px",lineHeight:"1.6"}}><strong style={{color:"#ccc"}}>O problema nao e a tecnica — e o clique.</strong> Cada entrada extra fora do setup e uma aposta. Limite de operacoes e inegociavel.</p>
              </div>
              <div style={{marginTop:"14px",marginBottom:"28px",padding:"20px 24px",borderRadius:"12px",background:"linear-gradient(135deg,rgba(0,212,170,0.07),rgba(0,153,255,0.05))",border:"1px solid rgba(0,212,170,0.2)",textAlign:"center"}}>
                <p style={{margin:0,color:"#f0f0f0",fontWeight:"700",fontSize:"17px",letterSpacing:"0.5px",lineHeight:"1.5"}}>
                  O QUE GERA RESULTADO É COMPORTAMENTO,<br/>NÃO TÉCNICA.
                </p>
              </div>

              {/* COMPLIANCE SECTION */}
              <div style={{borderTop:"1px solid #1a1a1a",paddingTop:"24px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"12px"}}>
                  <div>
                    <h3 style={{margin:"0 0 4px",fontSize:"15px",color:"#f0f0f0",fontWeight:"600"}}>📅 Calendario de disciplina</h3>
                    <p style={{margin:0,color:"#666",fontSize:"12px"}}>Registre se cumpriu todas as regras no dia</p>
                  </div>
                  {pct!==null&&(
                    <div style={{textAlign:"right"}}>
                      <p style={{margin:"0 0 2px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{MONTH_NAMES[month]} — cumprimento</p>
                      <p style={{margin:0,color:pct>=80?"#00d4aa":pct>=50?"#f59e0b":"#ff4d4d",fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{pct}%</p>
                    </div>
                  )}
                </div>

                {/* Mark today button */}
                <div style={{marginBottom:"20px",display:"flex",gap:"10px",alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={markToday} style={{
                    background:todayComplied?"rgba(0,212,170,0.15)":"rgba(255,255,255,0.05)",
                    border:"1px solid "+(todayComplied?"#00d4aa44":"#333"),
                    borderRadius:"10px",padding:"12px 20px",cursor:"pointer",
                    display:"flex",alignItems:"center",gap:"10px",transition:"all 0.2s"
                  }}>
                    <div style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid "+(todayComplied?"#00d4aa":"#555"),background:todayComplied?"#00d4aa":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                      {todayComplied&&<span style={{color:"#000",fontSize:"12px",fontWeight:"bold"}}>✓</span>}
                    </div>
                    <span style={{color:todayComplied?"#00d4aa":"#888",fontWeight:"600",fontSize:"13px"}}>
                      {todayComplied?"✓ Cumpri todas as regras hoje":"Marcar: cumpri todas as regras hoje"}
                    </span>
                  </button>
                  {todayComplied&&<span style={{color:"#00d4aa66",fontSize:"12px"}}>Registrado para {formatDateFull(today)}</span>}
                </div>

                {/* Calendar grid */}
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #ffffff08",borderRadius:"14px",padding:"16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px",marginBottom:"8px"}}>
                    {["Dom","Seg","Ter","Qua","Qui","Sex","Sab"].map(d=>(
                      <div key={d} style={{textAlign:"center",color:"#555",fontSize:"10px",fontWeight:"600",padding:"4px 0"}}>{d}</div>
                    ))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
                    {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
                    {Array.from({length:daysInMonth}).map((_,i)=>{
                      const d=i+1;
                      const k=calKey(d);
                      const isToday=k===today;
                      const future=k>today;
                      const status=compliance[k];
                      const bg=future?"transparent":status===true?"rgba(0,212,170,0.2)":status===false?"rgba(255,77,77,0.2)":"rgba(255,255,255,0.03)";
                      const border=isToday?"2px solid #00d4aa44":"1px solid "+(status===true?"#00d4aa33":status===false?"#ff4d4d33":"#ffffff08");
                      const color=future?"#333":status===true?"#00d4aa":status===false?"#ff4d4d":isToday?"#f0f0f0":"#666";
                      return (
                        <div key={d} onClick={()=>{
                          if(future)return;
                          const updated={...compliance,[k]:compliance[k]===true?false:compliance[k]===false?undefined:true};
                          if(updated[k]===undefined) delete updated[k];
                          saveCompliance(updated);
                          setCompliance(updated);
                        }} style={{
                          aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                          borderRadius:"8px",background:bg,border,cursor:future?"default":"pointer",
                          transition:"all 0.15s",position:"relative"
                        }}>
                          <span style={{fontSize:"12px",fontWeight:isToday?"700":"500",color,lineHeight:1}}>{d}</span>
                          {status===true&&<span style={{fontSize:"8px",marginTop:"1px"}}>✓</span>}
                          {status===false&&<span style={{fontSize:"8px",marginTop:"1px",color:"#ff4d4d"}}>✗</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p style={{margin:"10px 0 0",color:"#555",fontSize:"11px",textAlign:"center"}}>
                  <span style={{color:"#00d4aa66"}}>■</span> Cumpriu &nbsp;
                  <span style={{color:"#ff4d4d66"}}>■</span> Nao cumpriu &nbsp;
                  <span style={{color:"#ffffff18"}}>■</span> Sem registro &nbsp;·&nbsp;
                  Clique em qualquer dia passado para registrar
                </p>
              </div>
            </div>
          );
        })()}

        {tab==="diario"&&(
          <div>
            <div style={{marginBottom:"20px"}}>
              <h2 style={{margin:"0 0 4px",fontSize:"16px",color:"#f0f0f0",fontWeight:"600"}}>Diario de Resultados</h2>
              <p style={{margin:0,color:"#666",fontSize:"13px"}}>Salvo automaticamente · Todas as abas atualizam em tempo real</p>
            </div>
            <DiarioTab entries={entries} setEntries={setEntries}/>
          </div>
        )}

        {tab==="parcial"&&(()=>{
          const bancaB3fmt="R$ "+bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2});
          const bancaFxfmt="$ "+bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2});
          const precisaParcialForex=bancaRealForex>=500;
          const guide=[
            {mercado:"Mini Indice (B3)",banca:bancaB3fmt,regra:"NAO faca parcial em alvos pequenos",quando:"Apenas se o mercado andar 2x o stop (R$ "+(bancaRealB3*0.02).toFixed(2)+") a seu favor",como:"Feche 50% na regiao de 2R. Mova stop para breakeven. Deixe o restante correr.",cor:"#00d4aa"},
            {mercado:"Forex",banca:bancaFxfmt,regra:precisaParcialForex?"Banca acima de $500 — parciais liberadas":"Com banca abaixo de $500, evite parciais",quando:precisaParcialForex?"Feche parcial quando andar 2x o stop ($ "+(bancaRealForex*0.02).toFixed(2)+") a seu favor":"Parcial fratura o lote minimo e aumenta custo relativo",como:precisaParcialForex?"Feche 50% em 2R. Mova stop para breakeven. Deixe correr.":"Leve 100% ao alvo. Revise essa regra quando a banca atingir $500.",cor:"#f59e0b"},
          ];
          return (
            <div>
              <h2 style={{margin:"0 0 8px",fontSize:"16px",color:"#aaa",fontWeight:"500"}}>Quando e como fazer parciais</h2>
              <p style={{color:"#666",fontSize:"13px",marginBottom:"20px"}}>Regras ajustadas para sua banca real atual.</p>
              {guide.map((p,i)=>(
                <div key={i} style={{border:"1px solid "+p.cor+"33",borderRadius:"14px",padding:"20px",marginBottom:"16px",background:"linear-gradient(135deg,"+p.cor+"08,transparent)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <div style={{width:"8px",height:"8px",borderRadius:"50%",background:p.cor}}></div>
                      <h3 style={{margin:0,fontSize:"15px",color:"#f0f0f0"}}>{p.mercado}</h3>
                    </div>
                    <span style={{color:p.cor,fontSize:"12px",fontFamily:"monospace",fontWeight:"700"}}>{p.banca}</span>
                  </div>
                  {[["REGRA",p.regra],["QUANDO",p.quando],["COMO",p.como]].map(([lbl,txt])=>(
                    <div key={lbl} style={{display:"flex",gap:"12px",marginBottom:"8px"}}>
                      <span style={{color:p.cor,fontSize:"12px",fontWeight:"700",minWidth:"70px",paddingTop:"2px"}}>{lbl}</span>
                      <span style={{color:"#bbb",fontSize:"13px",lineHeight:"1.5"}}>{txt}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{padding:"16px 20px",borderRadius:"12px",background:"rgba(0,153,255,0.05)",border:"1px solid rgba(0,153,255,0.15)"}}>
                <p style={{margin:0,color:"#0099ff",fontWeight:"600",fontSize:"14px"}}>💡 A verdade sobre parciais</p>
                <p style={{margin:"8px 0 0",color:"#888",fontSize:"13px",lineHeight:"1.6"}}>Parciais reduzem o risco <strong style={{color:"#ccc"}}>e tambem o lucro</strong>. Defina uma regra e siga — nao decida na hora da emocao.</p>
              </div>
            </div>
          );
        })()}

        {tab==="banca"&&(()=>{
          const lucroB3=bancaRealB3-bancaInicialB3;
          const lucroForex=bancaRealForex-bancaInicialForex;
          const riscoB3=+(bancaRealB3*0.01).toFixed(2),stopB3=+(bancaRealB3*0.03).toFixed(2),metaB3=+(bancaRealB3*0.02).toFixed(2);
          const riscoFx=+(bancaRealForex*0.01).toFixed(2),stopFx=+(bancaRealForex*0.03).toFixed(2),metaFx=+(bancaRealForex*0.02).toFixed(2);
          const hasData=Object.keys(entries).length>0;
          const colB3="#00d4aa", colFx="#f59e0b", colStop="#ff4d4d";
          const CardItem=({label,value,sub,color})=>(
            <div style={{padding:"14px 16px",borderRadius:"12px",background:"rgba(255,255,255,0.02)",border:"1px solid "+color+"22",marginBottom:"10px"}}>
              <p style={{margin:"0 0 3px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>{label}</p>
              <p style={{margin:"0 0 2px",color:color,fontSize:"20px",fontWeight:"700",fontFamily:"monospace"}}>{value}</p>
              <p style={{margin:0,color:"#777",fontSize:"11px"}}>{sub}</p>
            </div>
          );
          const [editando,setEditando]=useState(false);
          const [inputB3,setInputB3]=useState(String(bancaInicialB3));
          const [inputFx,setInputFx]=useState(String(bancaInicialForex));
          const salvarConfig=()=>{
            const b3=parseFloat(inputB3)||DEFAULT_BANCA_B3;
            const forex=parseFloat(inputFx)||DEFAULT_BANCA_FOREX;
            const nova={b3,forex};
            saveConfig(nova);
            setConfig(nova);
            setEditando(false);
          };
          const inputStyle={width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid #444",borderRadius:"8px",padding:"9px 12px",color:"#fff",fontSize:"15px",fontWeight:"700",outline:"none",boxSizing:"border-box",fontFamily:"monospace"};
          return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                <h2 style={{margin:0,fontSize:"16px",color:"#aaa",fontWeight:"500"}}>Referencias de gestao</h2>
                <button onClick={()=>{setInputB3(String(bancaInicialB3));setInputFx(String(bancaInicialForex));setEditando(!editando);}} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #333",borderRadius:"8px",padding:"6px 14px",color:"#888",fontSize:"12px",fontWeight:"600",cursor:"pointer"}}>
                  {editando?"✕ Cancelar":"✏️ Editar banca inicial"}
                </button>
              </div>
              <p style={{color:"#666",fontSize:"13px",marginBottom:editando?"0":"20px"}}>Limites calculados sobre a banca real atual.</p>

              {editando&&(
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid #f59e0b33",borderRadius:"14px",padding:"18px",margin:"14px 0 20px"}}>
                  <p style={{margin:"0 0 14px",color:"#f59e0b",fontSize:"12px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"1px"}}>⚙️ Configurar banca inicial</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"14px"}}>
                    <div>
                      <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>🇧🇷 Banca inicial B3 (R$)</label>
                      <input type="number" value={inputB3} onChange={e=>setInputB3(e.target.value)} style={inputStyle} placeholder="Ex: 3000"/>
                    </div>
                    <div>
                      <label style={{color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"5px"}}>🌍 Banca inicial Forex ($)</label>
                      <input type="number" value={inputFx} onChange={e=>setInputFx(e.target.value)} style={inputStyle} placeholder="Ex: 200"/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                    <button onClick={salvarConfig} style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#000",border:"none",borderRadius:"8px",padding:"10px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>
                      💾 Salvar banca inicial
                    </button>
                    <p style={{margin:0,color:"#555",fontSize:"11px"}}>Todos os calculos e graficos atualizam automaticamente</p>
                  </div>
                </div>
              )}

              {/* Layout lado a lado: B3 esquerda, Forex direita */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>

                {/* COLUNA B3 */}
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",paddingBottom:"8px",borderBottom:"2px solid "+colB3+"44"}}>
                    <span style={{fontSize:"16px"}}>🇧🇷</span>
                    <span style={{color:colB3,fontWeight:"700",fontSize:"14px"}}>Mini Indice B3</span>
                  </div>
                  {/* Banca atual */}
                  <div style={{padding:"16px",borderRadius:"14px",background:"rgba(0,212,170,0.06)",border:"1px solid "+colB3+"33",position:"relative",overflow:"hidden",marginBottom:"10px"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,"+colB3+",transparent)"}}/>
                    <p style={{margin:"0 0 3px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Banca atual</p>
                    <p style={{margin:"0 0 3px",color:colB3,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{"R$ "+bancaRealB3.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    <p style={{margin:0,fontSize:"11px",color:lucroB3>=0?"#00d4aa88":"#ff4d4d88",fontFamily:"monospace"}}>
                      {hasData?(lucroB3>=0?"+":"")+"R$ "+Math.abs(lucroB3).toFixed(2)+" vs inicial":"Sem registros ainda"}
                    </p>
                  </div>
                  <CardItem label="Risco por operacao" value={"R$ "+riscoB3.toFixed(2)} sub="1% da banca" color={colB3}/>
                  <CardItem label="Meta diaria" value={"R$ "+metaB3.toFixed(2)} sub="2% — pode encerrar" color={colB3}/>
                  <CardItem label="Stop diario" value={"R$ "+stopB3.toFixed(2)} sub="3% — fecha o dia" color={colStop}/>
                </div>

                {/* COLUNA FOREX */}
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px",paddingBottom:"8px",borderBottom:"2px solid "+colFx+"44"}}>
                    <span style={{fontSize:"16px"}}>🌍</span>
                    <span style={{color:colFx,fontWeight:"700",fontSize:"14px"}}>Forex</span>
                  </div>
                  {/* Banca atual */}
                  <div style={{padding:"16px",borderRadius:"14px",background:"rgba(245,158,11,0.06)",border:"1px solid "+colFx+"33",position:"relative",overflow:"hidden",marginBottom:"10px"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,"+colFx+",transparent)"}}/>
                    <p style={{margin:"0 0 3px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Banca atual</p>
                    <p style={{margin:"0 0 3px",color:colFx,fontSize:"22px",fontWeight:"700",fontFamily:"monospace"}}>{"$ "+bancaRealForex.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
                    <p style={{margin:0,fontSize:"11px",color:lucroForex>=0?"#00d4aa88":"#ff4d4d88",fontFamily:"monospace"}}>
                      {hasData?(lucroForex>=0?"+":"")+"$ "+Math.abs(lucroForex).toFixed(2)+" vs inicial":"Sem registros ainda"}
                    </p>
                  </div>
                  <CardItem label="Risco por operacao" value={"$ "+riscoFx.toFixed(2)} sub="1% da banca" color={colFx}/>
                  <CardItem label="Meta diaria" value={"$ "+metaFx.toFixed(2)} sub="2% — pode encerrar" color={colFx}/>
                  <CardItem label="Stop diario" value={"$ "+stopFx.toFixed(2)} sub="3% — fecha o dia" color={colStop}/>
                </div>

              </div>
              {!hasData&&<p style={{margin:"16px 0 0",color:"#555",fontSize:"12px",textAlign:"center"}}>Registre operacoes no Diario para os limites se atualizarem automaticamente.</p>}
            </div>
          );
        })()}

        {tab==="crescimento"&&(
          <div>
            <div style={{marginBottom:"20px"}}>
              <h2 style={{margin:"0 0 4px",fontSize:"16px",color:"#f0f0f0",fontWeight:"600"}}>Crescimento — Real vs Projetado</h2>
              <p style={{margin:0,color:"#666",fontSize:"13px"}}>Projecao recalculada a partir da banca real atual</p>
            </div>
            <CrescimentoTab entries={entries} bancaRealB3={bancaRealB3} bancaRealForex={bancaRealForex} bancaInicialB3={bancaInicialB3} bancaInicialForex={bancaInicialForex}/>
          </div>
        )}

        {tab==="patrimonio"&&(
          <div>
            <div style={{marginBottom:"20px"}}>
              <h2 style={{margin:"0 0 4px",fontSize:"16px",color:"#f0f0f0",fontWeight:"600"}}>Evolucao do Patrimonio</h2>
              <p style={{margin:0,color:"#666",fontSize:"13px"}}>Curva real dia a dia vs projecao — passe o mouse nos pontos</p>
            </div>
            <PatrimonioChart entries={entries} bancaRealB3={bancaRealB3} bancaRealForex={bancaRealForex} bancaInicialB3={bancaInicialB3} bancaInicialForex={bancaInicialForex}/>
          </div>
        )}

      </div>
    </div>
  );
}
