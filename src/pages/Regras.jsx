import { useState } from "react";
import { Confirmar, CountUp, Ring, Sparkline } from "../components/ui";

const kCard  = {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px",minWidth:0,minHeight:"124px",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"8px"};
const kLabel = {margin:0,color:"var(--text-3)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"};
const kValor = {margin:0,fontSize:"26px",fontWeight:"700",fontFamily:"var(--font-mono)",letterSpacing:"-0.5px",lineHeight:1.15,whiteSpace:"nowrap"};
const kSub   = {margin:0,color:"var(--text-3)",fontSize:"11.5px"};

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

const REGRAS_PADRAO = [
  { id:"r1", icon:"limit",  title:"Máximo 5 operações/dia",             desc:"Após 5 entradas feche a plataforma. Sem exceções.", personal:false },
  { id:"r2", icon:"stop",   title:"Stop loss obrigatório",               desc:"Nunca entre sem stop definido ANTES de clicar.", personal:false },
  { id:"r3", icon:"loss",   title:"Respeitar perda máxima diária",       desc:"Bateu o stop diário (3% da banca), encerra tudo.", personal:false },
  { id:"r4", icon:"target", title:"Respeitar meta diária",               desc:"Bateu a meta (2% da banca), pode encerrar.", personal:false },
  { id:"r5", icon:"wait",   title:"Regra da vingança",                   desc:"Tomou stop? Aguarde 15 minutos antes da próxima entrada.", personal:false },
  { id:"r6", icon:"clock",  title:"Horário proibido",                    desc:"Não opere no primeiro candle nem nos 15 min antes do fechamento.", personal:false },
  { id:"r7", icon:"log",    title:"Anotar no diário após cada operação", desc:"Registre motivo, emoção e resultado imediatamente.", personal:true },
  { id:"r8", icon:"three",  title:"3 stops seguidos = parar o dia",      desc:"Tomou 3 stops consecutivos? Encerra. Volte amanhã.", personal:true },
  { id:"r9", icon:"rr",     title:"RR mínimo 1:2",                       desc:"Só entre se o alvo for pelo menos o dobro do stop.", personal:false },
];

const ICONS = ["limit","stop","loss","target","wait","clock","log","three","rr","trend","shield","eye","chart","lock","check"];

function RuleIcon({ id, color="#3fe8a8", size=16 }) {
  const s = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:"1.8", strokeLinecap:"round", strokeLinejoin:"round" };
  const icons = {
    limit:  <svg {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    stop:   <svg {...s}><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    loss:   <svg {...s}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    target: <svg {...s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    wait:   <svg {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    clock:  <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    log:    <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    three:  <svg {...s}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    rr:     <svg {...s}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    trend:  <svg {...s}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
    shield: <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    eye:    <svg {...s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    chart:  <svg {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    lock:   <svg {...s}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    check:  <svg {...s}><polyline points="20 6 9 17 4 12"/></svg>,
  };
  return icons[id] || icons.check;
}

export default function Regras({ regras, saveRegras, compliance, saveCompliance, entries }) {
  const regrasList  = regras && regras.length > 0 ? regras : REGRAS_PADRAO;
  const today       = todayKey();
  const [confirmacao, setConfirmacao] = useState(null);
  const navBtn = {background:"rgba(255,255,255,0.05)",border:"1px solid var(--line-strong)",borderRadius:"8px",width:"30px",height:"30px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-2)",padding:0};
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const [calMes, setCalMes] = useState({ ano: year, mes: month });
  const noMesAtual  = calMes.ano === year && calMes.mes === month;
  const firstDay    = new Date(calMes.ano,calMes.mes,1).getDay();
  const daysInMon   = new Date(calMes.ano,calMes.mes+1,0).getDate();
  const calKey      = (d) => calMes.ano+"-"+String(calMes.mes+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
  const mudarMes    = delta => setCalMes(c => {
    const d = new Date(c.ano, c.mes + delta, 1);
    if (d.getFullYear() > year || (d.getFullYear() === year && d.getMonth() > month)) return c; // sem meses futuros
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  // meses que têm registro de disciplina (atalhos)
  const mesesComRegistro = [...new Set(Object.keys(compliance||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).map(k=>k.slice(0,7)))].sort();
  const chaveCal = calMes.ano+"-"+String(calMes.mes+1).padStart(2,"0");
  const valsCal = Object.entries(compliance||{}).filter(([k])=>k.startsWith(chaveCal+"-")).map(([,v])=>typeof v==="number"?v:v===true?100:null).filter(v=>v!==null);
  const mediaCal = valsCal.length ? Math.round(valsCal.reduce((a,b)=>a+b,0)/valsCal.length) : null;
  const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // recarrega o que já foi marcado e salvo hoje
  const [checked,   setChecked]   = useState(() => ({ ...((compliance||{})._detalhes?.[today] || {}) }));
  const [editando,  setEditando]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState({ icon:"🎯", title:"", desc:"", personal:false });
  const [showIcons, setShowIcons] = useState(false);
  const [msg,       setMsg]       = useState("");

  const allChecked    = regrasList.every(r => !!checked[r.id]);

  function toggleCheck(id) { setChecked(c => ({...c,[id]:!c[id]})); }

  async function apagarDia(k) {
    const updated = {...compliance};
    delete updated[k];
    if (updated._detalhes) { const det = {...updated._detalhes}; delete det[k]; updated._detalhes = det; }
    await saveCompliance(updated);
  }

  function pedirApagarDia(k) {
    const v = compliance[k];
    if (k > today || v === undefined) return;
    const pctDia = typeof v === "number" ? v : 100;
    setConfirmacao({
      titulo: "Apagar o registro de " + formatDateFull(k) + "?",
      texto: "Disciplina de " + pctDia + "% neste dia. A Streak de Disciplina e a média do mês serão recalculadas. Não dá para desfazer.",
      botao: "Apagar registro",
      acao: () => apagarDia(k),
    });
  }

  function abrirNova() {
    setForm({ icon:"target", title:"", desc:"", personal:false });
    setEditId(null); setEditando(true); setShowIcons(false);
  }

  function abrirEditar(r) {
    setForm({ icon:r.icon, title:r.title, desc:r.desc, personal:r.personal||false });
    setEditId(r.id); setEditando(true); setShowIcons(false);
  }

  async function salvar() {
    if (!form.title.trim()) { setMsg("Digite o titulo da regra."); return; }
    let novas;
    if (editId) {
      novas = regrasList.map(r => r.id===editId ? {...r,...form} : r);
    } else {
      novas = [...regrasList, { id:"r"+Date.now(), ...form }];
    }
    await saveRegras(novas);
    setEditando(false);
    setMsg("Salvo!"); setTimeout(()=>setMsg(""),2500);
  }

  function excluir(id) {
    const r = regrasList.find(x => x.id === id);
    setConfirmacao({
      titulo: "Excluir esta regra?",
      texto: (r?.title ? "\"" + r.title + "\" sai da sua lista de disciplina. " : "") + "Os dias já registrados não mudam.",
      botao: "Excluir regra",
      acao: () => saveRegras(regrasList.filter(x => x.id !== id)),
    });
  }

  async function mover(idx, dir) {
    const arr = [...regrasList];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx],arr[swap]] = [arr[swap],arr[idx]];
    await saveRegras(arr);
  }

  // % disciplina = baseado nos checks do dia atual
  const totalRegras = regrasList.length;
  const checkedCount = regrasList.filter(r=>!!checked[r.id]).length;
  const pct = totalRegras > 0 ? Math.round((checkedCount/totalRegras)*100) : null;

  // Média do mês atual (só dias salvos neste mês)
  const monthSaved = Object.entries(compliance).filter(([k,v])=>monthKey(k)===monthKey(today)&&typeof v==="number");
  const mediaMes = monthSaved.length > 0
    ? Math.round(monthSaved.reduce((s,[,v])=>s+v,0)/monthSaved.length)
    : null;

  // Regras mais quebradas no mês
  const detalhes = compliance._detalhes || {};
  const regraBreaks = {}; // { ruleId: { quebradas, total } }
  const mesAtual = monthKey(today);
  Object.entries(detalhes).forEach(([k, rulesChecked]) => {
    if (!k.startsWith(mesAtual)) return;
    regrasList.forEach(r => {
      if (!regraBreaks[r.id]) regraBreaks[r.id] = { quebradas:0, total:0, title:r.title };
      regraBreaks[r.id].total++;
      if (!rulesChecked[r.id]) regraBreaks[r.id].quebradas++;
    });
  });
  const topQuebradas = Object.values(regraBreaks)
    .filter(r=>r.total>0&&r.quebradas>0)
    .sort((a,b)=>b.quebradas-a.quebradas)
    .slice(0,4);

  // Correlação disciplina × resultado
  const corrDados = Object.entries(compliance)
    .filter(([,v])=>typeof v==="number")
    .map(([k,v])=>{
      const entryDia = (entries||{})[k];
      const resultado = entryDia ? (entryDia.totalB3||0)+(entryDia.totalForex||0)+(entryDia.totalCripto||0)+(entryDia.totalAmericano||0) : null;
      return { pct:v, resultado, k };
    })
    .filter(d=>d.resultado!==null);
  const diasAlta = corrDados.filter(d=>d.pct>=80);
  const diasBaixa = corrDados.filter(d=>d.pct<80);
  const mediaResAlta = diasAlta.length>0 ? diasAlta.reduce((s,d)=>s+d.resultado,0)/diasAlta.length : null;
  const mediaResBaixa = diasBaixa.length>0 ? diasBaixa.reduce((s,d)=>s+d.resultado,0)/diasBaixa.length : null;
  // ── Dados para os cards do topo ──
  const corPct = v => v===null||v===undefined ? "var(--text-3)" : v>=80 ? "#3fe8a8" : v>=50 ? "#f5b941" : "#ff5470";
  const valorDia = k => { const v = compliance[k]; return typeof v==="number" ? v : v===true ? 100 : null; };
  const diasRegistrados = Object.keys(compliance||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  // streak: dias seguidos (corridos) com ≥80%, contando de hoje (ou de ontem, se hoje ainda não foi salvo)
  const menosUmDia = k => { const d = new Date(k+"T12:00:00"); d.setDate(d.getDate()-1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
  let streakAtual = 0;
  { let k = valorDia(today)===null ? menosUmDia(today) : today;
    while ((valorDia(k)??-1) >= 80) { streakAtual++; k = menosUmDia(k); } }
  let recorde = 0;
  { let seq = 0, prev = null;
    diasRegistrados.forEach(k => {
      const ok = valorDia(k) >= 80;
      seq = ok ? (prev && menosUmDia(k)===prev && seq>0 ? seq+1 : 1) : 0;
      if (seq > recorde) recorde = seq;
      prev = k;
    }); }
  const serieMes = monthSaved.sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v);

  // regras mais quebradas: mês atual vs mês anterior
  const mesAnteriorKey = (() => { const d = new Date(year, month-1, 1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); })();
  const taxaQuebra = (mesK) => {
    const r = {};
    Object.entries(detalhes).forEach(([k, marcadas]) => {
      if (!k.startsWith(mesK)) return;
      regrasList.forEach(rg => { if (!r[rg.id]) r[rg.id] = { q:0, t:0 }; r[rg.id].t++; if (!marcadas[rg.id]) r[rg.id].q++; });
    });
    return r;
  };
  const quebrasAnt = taxaQuebra(mesAnteriorKey);

  // resultado do dia no Diário (para o calendário)
  const resultadoDoDia = k => { const e = (entries||{})[k]; if (!e) return null; return (e.totalB3||0)+(e.totalForex||0)+(e.totalCripto||0)+(e.totalAmericano||0); };

  async function salvarProgresso() {
    const updated = {...compliance};
    updated[today] = pct;
    const det = {...(compliance._detalhes||{})};
    det[today] = regrasList.reduce((acc,r)=>({...acc,[r.id]:!!checked[r.id]}),{});
    updated._detalhes = det;
    await saveCompliance(updated);
    setMsg("✓ Disciplina de hoje salva"); setTimeout(()=>setMsg(""),2500);
  }
  const salvoHoje = valorDia(today);
  const mudouDesdeSalvo = salvoHoje !== pct;
  const isMobile = window.innerWidth < 768;
  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #26352e", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)" };

  if (editando) {
    return (
      <div style={{fontFamily:"var(--font-sans)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setEditando(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",borderRadius:"8px",padding:"8px 14px",color:"#a3b2ab",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>← Voltar</button>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#f0f0f0"}}>{editId?"Editar Regra":"Nova Regra"}</h1>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid #18241f",borderRadius:"14px",padding:"24px"}}>
          <div style={{marginBottom:"16px"}}>
            <label style={{color:"#93a39c",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"8px"}}>Icone</label>
            <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
              <button onClick={()=>setShowIcons(!showIcons)} style={{width:"48px",height:"48px",background:"rgba(255,255,255,0.05)",border:"1px solid #26352e",borderRadius:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><RuleIcon id={form.icon} size={22}/></button>
              <span style={{color:"#7a8c84",fontSize:"12px"}}>Clique para escolher outro icone</span>
            </div>
            {showIcons && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"10px",padding:"12px",background:"rgba(255,255,255,0.03)",borderRadius:"10px",border:"1px solid #26352e"}}>
                {ICONS.map(ic=>(
                  <button key={ic} onClick={()=>{setForm(f=>({...f,icon:ic}));setShowIcons(false);}} style={{width:"38px",height:"38px",background:form.icon===ic?"rgba(46,230,160,0.2)":"rgba(255,255,255,0.04)",border:"1px solid "+(form.icon===ic?"#2ee6a044":"#26352e"),borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><RuleIcon id={ic} size={18} color={form.icon===ic?"#3fe8a8":"#a3b2ab"}/></button>
                ))}
              </div>
            )}
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#93a39c",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Titulo *</label>
            <input style={inp} placeholder="Ex: Nao operar em dias de noticia" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          </div>
          <div style={{marginBottom:"16px"}}>
            <label style={{color:"#93a39c",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Descricao</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Detalhes da regra..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} rows={3}/>
          </div>
          <div style={{marginBottom:"20px"}}>
            <div onClick={()=>setForm(f=>({...f,personal:!f.personal}))} style={{display:"inline-flex",alignItems:"center",gap:"10px",cursor:"pointer",padding:"10px 14px",borderRadius:"10px",background:form.personal?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.03)",border:"1px solid "+(form.personal?"#f59e0b44":"#26352e"),transition:"all 0.2s"}}>
              <div style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid "+(form.personal?"#f59e0b":"#555"),background:form.personal?"#f59e0b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                {form.personal && <span style={{color:"#000",fontSize:"12px",fontWeight:"900"}}>✓</span>}
              </div>
              <span style={{color:form.personal?"#f59e0b":"#888",fontWeight:"600",fontSize:"13px"}}>Regra pessoal</span>
              <span style={{color:"#7a8c84",fontSize:"12px"}}>(badge amarelo)</span>
            </div>
          </div>
          <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
            <button onClick={salvar} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar regra</button>
            <button onClick={()=>setEditando(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",borderRadius:"10px",padding:"11px 18px",color:"#93a39c",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Cancelar</button>
            {msg && <span style={{color:"#3fe8a8",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>

      {/* Título + frases */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",flexWrap:"wrap",marginBottom:"8px"}}>
        <div>
          <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Disciplina</h1>
          <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"13px"}}>Seu checklist antes de operar e o histórico do seu comportamento</p>
        </div>
        <button onClick={abrirNova} style={{background:"rgba(46,230,160,0.08)",border:"1px solid #2ee6a044",borderRadius:"10px",padding:"9px 16px",color:"#2ee6a0",fontWeight:"700",fontSize:"12.5px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>+ Nova regra</button>
      </div>
      <div className="mtp-frases">
        <span>O que gera resultado é comportamento, não a técnica.</span>
        <i/>
        <span>Cada entrada fora do setup é uma aposta.</span>
      </div>

      {/* ── 4 cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:"14px",marginBottom:"28px"}}>
        <div style={kCard}>
          <p style={kLabel}>Hoje</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px"}}>
            <p style={{...kValor,color:corPct(pct)}}><CountUp value={pct||0} format={v=>Math.round(v)+"%"}/></p>
            <Ring pct={pct} color={corPct(pct)} size={50}/>
          </div>
          <p style={kSub}>{checkedCount} de {totalRegras} regras · {salvoHoje===null ? <span style={{color:"#f5b941"}}>não salvo</span> : mudouDesdeSalvo ? <span style={{color:"#f5b941"}}>alterado, salve de novo</span> : <span style={{color:"#3fe8a8"}}>salvo</span>}</p>
        </div>
        <div style={{...kCard,position:"relative",overflow:"hidden"}}>
          {serieMes.length > 1 && (
            <div style={{position:"absolute",left:"45%",right:0,bottom:0,height:"48px",opacity:.5,pointerEvents:"none",maskImage:"linear-gradient(90deg,transparent,#000 40%)",WebkitMaskImage:"linear-gradient(90deg,transparent,#000 40%)"}}>
              <Sparkline values={serieMes} color={corPct(mediaMes)} width="100%" height="100%"/>
            </div>
          )}
          <p style={kLabel}>Média de {MONTH_NAMES[month]}</p>
          <p style={{...kValor,color:corPct(mediaMes),position:"relative"}}>{mediaMes!==null ? <CountUp value={mediaMes} format={v=>Math.round(v)+"%"}/> : "—"}</p>
          <p style={{...kSub,position:"relative"}}>{monthSaved.length} dia{monthSaved.length!==1?"s":""} registrado{monthSaved.length!==1?"s":""}</p>
        </div>
        <div style={kCard}>
          <p style={kLabel}>Streak</p>
          <p style={{...kValor,color:streakAtual>=5?"#3fe8a8":streakAtual>=2?"#f5b941":"var(--text)"}}><CountUp value={streakAtual}/> <span style={{fontSize:"14px",color:"var(--text-3)",fontWeight:600}}>dia{streakAtual!==1?"s":""}</span></p>
          <p style={kSub}>seguidos com ≥80% · recorde <b style={{color:"var(--text-2)"}}>{recorde}</b></p>
        </div>
        <div style={kCard}>
          <p style={kLabel}>Disciplina × Resultado</p>
          {corrDados.length >= 3 && mediaResAlta !== null ? <>
            <p style={{...kValor,fontSize:"20px",color:mediaResAlta>=0?"#3fe8a8":"#ff5470"}}>{mediaResAlta>=0?"+":"-"}R$ {Math.abs(mediaResAlta).toLocaleString("pt-BR",{maximumFractionDigits:0})}<span style={{fontSize:"12px",color:"var(--text-3)"}}>/dia</span></p>
            <p style={kSub}>com ≥80%{mediaResBaixa!==null && <> · abaixo: <b style={{color:mediaResBaixa>=0?"#3fe8a8":"#ff5470"}}>{mediaResBaixa>=0?"+":"-"}R$ {Math.abs(mediaResBaixa).toLocaleString("pt-BR",{maximumFractionDigits:0})}</b></>}</p>
          </> : <>
            <p style={{...kValor,color:"var(--text-3)"}}>—</p>
            <p style={kSub}>aparece após 3 dias com disciplina e operações</p>
          </>}
        </div>
      </div>

      {/* ── Checklist + regras mais quebradas ── */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1.7fr) minmax(0,1fr)",gap:"14px",alignItems:"start",marginBottom:"28px"}}>
        {/* ── Checklist ── */}
        <div style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"16px",padding:"20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"14px",flexWrap:"wrap",marginBottom:"16px"}}>
            <div>
              <p className="mtp-section-title">Checklist de hoje</p>
              <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12px"}}>Marque o que você cumpriu e salve no fim do dia</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
              {allChecked && <span className="mtp-pronto">✓ Pronto para operar</span>}
              {msg && <span style={{color:"#3fe8a8",fontSize:"12.5px",fontWeight:"600"}}>{msg}</span>}
              <button onClick={salvarProgresso} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"10px 18px",fontWeight:"800",fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",gap:"8px"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><polyline points="20 6 9 17 4 12"/></svg>
                {salvoHoje===null ? "Salvar disciplina de hoje" : "Atualizar disciplina de hoje"}
              </button>
            </div>
          </div>
          <div style={{height:"6px",borderRadius:"6px",background:"var(--line)",overflow:"hidden",marginBottom:"16px"}}>
            <div style={{height:"100%",width:(pct||0)+"%",borderRadius:"6px",background:"linear-gradient(90deg,"+corPct(pct)+"77,"+corPct(pct)+")",boxShadow:"0 0 10px "+corPct(pct),transition:"width .4s var(--ease)"}}/>
          </div>
          <div className="mtp-regras-lista">
            {regrasList.map((rule,idx) => {
              const ok = !!checked[rule.id];
              const cor = rule.personal ? "#f5b941" : "#3fe8a8";
              return (
                <div key={rule.id} className={"mtp-regra"+(ok?" ok":"")} style={{"--rc":cor}} title={rule.desc||undefined} onClick={()=>toggleCheck(rule.id)}>
                  <span className="mtp-regra-check">{ok && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#04110b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                      <RuleIcon id={rule.icon} color={ok?cor:"#93a39c"} size={15}/>
                      <span style={{color:"var(--text)",fontWeight:"650",fontSize:"13.5px"}}>{rule.title}</span>
                      {rule.personal && <span style={{background:"rgba(245,185,65,0.12)",color:"#f5b941",fontSize:"9.5px",fontWeight:"800",padding:"2px 7px",borderRadius:"20px",letterSpacing:".5px"}}>PESSOAL</span>}
                    </div>
                    {rule.desc && <p style={{margin:"4px 0 0",color:"var(--text-2)",fontSize:"12.5px",lineHeight:1.5}}>{rule.desc}</p>}
                  </div>
                  <div className="mtp-regra-acoes" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>mover(idx,-1)} disabled={idx===0} title="Subir">▲</button>
                    <button onClick={()=>mover(idx,1)} disabled={idx===regrasList.length-1} title="Descer">▼</button>
                    <button onClick={()=>abrirEditar(rule)} title="Editar">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={()=>excluir(rule.id)} title="Excluir" className="del">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px"}}>
          <p className="mtp-section-title" style={{marginBottom:"4px"}}>Regras mais quebradas</p>
          <p style={{margin:"0 0 14px",color:"var(--text-3)",fontSize:"12px"}}>{NOMES_MES[month]} · comparado a {NOMES_MES[(month+11)%12]}</p>
          {topQuebradas.length === 0
            ? <p style={{margin:0,color:"var(--text-3)",fontSize:"12.5px",lineHeight:1.6}}>{Object.keys(detalhes).some(k=>k.startsWith(mesAtual)) ? "Nenhuma regra quebrada neste mês. Excelente." : "Salve a disciplina do dia para ver quais regras você mais quebra."}</p>
            : <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
                {topQuebradas.map((r,i)=>{
                  const pctQ = Math.round(r.quebradas/r.total*100);
                  const idRegra = regrasList.find(x=>x.title===r.title)?.id;
                  const ant = quebrasAnt[idRegra];
                  const pctAnt = ant && ant.t ? Math.round(ant.q/ant.t*100) : null;
                  const tend = pctAnt===null ? null : pctQ - pctAnt;
                  const cor = pctQ>=60?"#ff5470":pctQ>=30?"#f5b941":"#a3b2ab";
                  return (
                    <div key={i}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:"10px",marginBottom:"6px"}}>
                        <span style={{color:"var(--text)",fontSize:"12.5px",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
                        <span style={{color:cor,fontSize:"12px",fontWeight:800,fontFamily:"var(--font-mono)",flexShrink:0}}>{r.quebradas}×</span>
                      </div>
                      <div style={{height:"4px",borderRadius:"4px",background:"var(--line)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:pctQ+"%",background:cor,borderRadius:"4px"}}/>
                      </div>
                      <p style={{margin:"5px 0 0",fontSize:"11px",fontFamily:"var(--font-mono)",color:"var(--text-3)"}}>
                        {pctQ}% dos dias
                        {tend!==null && <span style={{color:tend<0?"#3fe8a8":tend>0?"#ff7a90":"var(--text-3)"}}> · {tend<0?"↓ melhorando":tend>0?"↑ piorando":"= estável"} ({pctAnt}% antes)</span>}
                      </p>
                    </div>
                  );
                })}
              </div>}
        </div>
      </div>

      {/* ── Calendário (mapa de calor) ── */}
        <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"8px"}}>
            <p className="mtp-section-title">Calendário</p>
            <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
              <button onClick={()=>mudarMes(-1)} aria-label="Mês anterior" style={navBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span style={{minWidth:"124px",textAlign:"center",color:"var(--text)",fontSize:"13.5px",fontWeight:"700"}}>{NOMES_MES[calMes.mes]} {calMes.ano}</span>
              <button onClick={()=>mudarMes(1)} disabled={noMesAtual} aria-label="Próximo mês" style={{...navBtn,opacity:noMesAtual?0.35:1,cursor:noMesAtual?"default":"pointer"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              {!noMesAtual && <button onClick={()=>setCalMes({ano:year,mes:month})} className="mtp-ctx-ghost" style={{padding:"6px 10px"}}>Mês atual</button>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"14px"}}>
            <span style={{color:"var(--text-3)",fontSize:"12px",fontFamily:"var(--font-mono)"}}>
              {valsCal.length ? valsCal.length+" dia"+(valsCal.length===1?"":"s")+" · média " : "Nenhum registro neste mês"}
              {mediaCal!==null && <b style={{color:corPct(mediaCal)}}>{mediaCal}%</b>}
            </span>
            {valsCal.length > 0 && (
              <button onClick={()=>setConfirmacao({
                  titulo:"Apagar os registros de "+NOMES_MES[calMes.mes]+" "+calMes.ano+"?",
                  texto:"Os "+valsCal.length+" dia"+(valsCal.length===1?"":"s")+" registrados neste mês serão apagados. A streak e as médias são recalculadas. Não dá para desfazer.",
                  botao:"Apagar mês",
                  acao:async()=>{
                    const updated={...compliance};
                    const det={...(updated._detalhes||{})};
                    Object.keys(updated).filter(k=>k.startsWith(chaveCal+"-")).forEach(k=>{ delete updated[k]; delete det[k]; });
                    updated._detalhes=det;
                    await saveCompliance(updated);
                  }})}
                className="mtp-ctx-ghost" style={{padding:"2px 8px",color:"#ff7a90",fontSize:"11.5px"}}>apagar mês</button>
            )}
            {mesesComRegistro.length > 1 && mesesComRegistro.map(m=>{
              const [a,mm] = m.split("-").map(Number);
              const ativo = a===calMes.ano && mm-1===calMes.mes;
              return <button key={m} onClick={()=>setCalMes({ano:a,mes:mm-1})} className={"mtp-pill"+(ativo?" active":"")} style={{padding:"2px 9px",fontSize:"11px"}}>{MONTH_NAMES[mm-1]} {String(a).slice(2)}</button>;
            })}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px",marginBottom:"6px"}}>
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>(
              <div key={d} style={{textAlign:"center",color:"var(--text-3)",fontSize:"10px",fontWeight:"700",letterSpacing:".5px"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px"}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
            {Array.from({length:daysInMon}).map((_,i)=>{
              const d=i+1, k=calKey(d), isToday=k===today, future=k>today;
              const v = valorDia(k);
              const cor = v===null ? null : corPct(v);
              const alpha = v===null ? 0 : 0.10 + (v/100)*0.22;
              const bg = future ? "transparent" : v===null ? "rgba(255,255,255,0.02)" : (v>=80 ? "rgba(46,230,160,"+alpha+")" : v>=50 ? "rgba(245,185,65,"+alpha+")" : "rgba(255,84,112,"+(0.12+(1-v/100)*0.15)+")");
              const res = resultadoDoDia(k);
              const quebradas = v!==null && detalhes[k] ? regrasList.filter(r=>!detalhes[k][r.id]).map(r=>r.title) : [];
              return (
                <div key={d} className={"mtp-cal-dia"+(v!==null?" tem":"")}
                  style={{background:bg,border:isToday?"1.5px solid #2ee6a088":"1px solid "+(v!==null?cor+"33":"var(--line)"),opacity:future?0.35:1}}
                  onClick={()=>pedirApagarDia(k)}>
                  <span style={{fontSize:"13px",fontWeight:isToday?800:600,color:isToday?"#fff":"var(--text-2)"}}>{d}</span>
                  {v!==null && <span style={{fontSize:"12px",fontWeight:800,fontFamily:"var(--font-mono)",color:cor}}>{v}%</span>}
                  {res!==null && res!==0 && <span style={{fontSize:"10px",fontFamily:"var(--font-mono)",color:res>=0?"#3fe8a8":"#ff7a90",opacity:.85}}>{res>=0?"+":"-"}{Math.abs(res)>=1000?(Math.abs(res)/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})+"k":Math.round(Math.abs(res))}</span>}
                  {v!==null && (
                    <div className="mtp-cal-tip">
                      <b style={{color:"var(--text)"}}>{formatDateFull(k)}</b> · <span style={{color:cor}}>{v}% disciplina</span>
                      {res!==null && <div style={{color:res>=0?"#3fe8a8":"#ff7a90",fontFamily:"var(--font-mono)"}}>{res>=0?"+":"-"}R$ {Math.abs(res).toLocaleString("pt-BR",{minimumFractionDigits:2})} no dia</div>}
                      {quebradas.length > 0
                        ? <div style={{marginTop:"4px"}}><span style={{color:"var(--text-3)"}}>Quebrou:</span>{quebradas.slice(0,4).map(t=><div key={t} style={{color:"#ffb3c0"}}>• {t}</div>)}{quebradas.length>4 && <div style={{color:"var(--text-3)"}}>+{quebradas.length-4}</div>}</div>
                        : detalhes[k] ? <div style={{color:"#3fe8a8",marginTop:"4px"}}>Cumpriu todas as regras</div> : null}
                      <div style={{color:"var(--text-3)",marginTop:"4px",fontSize:"10.5px"}}>clique para apagar o registro</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{margin:"12px 0 0",color:"var(--text-3)",fontSize:"11px",display:"flex",gap:"12px",flexWrap:"wrap"}}>
            <span><i className="mtp-dot" style={{background:"#3fe8a8"}}/> ≥80%</span>
            <span><i className="mtp-dot" style={{background:"#f5b941"}}/> 50–79%</span>
            <span><i className="mtp-dot" style={{background:"#ff5470"}}/> &lt;50%</span>
            <span>· cor mais forte = mais disciplina · valor embaixo = resultado do dia</span>
          </p>
        </div>

      {confirmacao && (
        <Confirmar titulo={confirmacao.titulo} texto={confirmacao.texto} botao={confirmacao.botao}
          onCancelar={()=>setConfirmacao(null)}
          onConfirmar={async()=>{ await confirmacao.acao(); setConfirmacao(null); }}/>
      )}
    </div>
  );
}
