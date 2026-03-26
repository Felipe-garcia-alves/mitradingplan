import { useState } from "react";

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

function RuleIcon({ id, color="#2dc99a", size=16 }) {
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
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const firstDay    = new Date(year,month,1).getDay();
  const daysInMon   = new Date(year,month+1,0).getDate();
  const calKey      = (d) => year+"-"+String(month+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");

  const [checked,   setChecked]   = useState({});
  const [editando,  setEditando]  = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [form,      setForm]      = useState({ icon:"🎯", title:"", desc:"", personal:false });
  const [showIcons, setShowIcons] = useState(false);
  const [msg,       setMsg]       = useState("");

  const allChecked    = regrasList.every(r => !!checked[r.id]);
  const todayComplied = compliance[today] === true;

  function toggleCheck(id) { setChecked(c => ({...c,[id]:!c[id]})); }

  async function toggleDay(k) {
    if (k > today) return;
    const updated = {...compliance};
    if (updated[k] !== undefined) delete updated[k];
    else updated[k] = true;
    await saveCompliance(updated);
  }

  function abrirNova() {
    setForm({ icon:"🎯", title:"", desc:"", personal:false });
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

  async function excluir(id) {
    if (!window.confirm("Excluir esta regra?")) return;
    await saveRegras(regrasList.filter(r => r.id !== id));
  }

  async function mover(idx, dir) {
    const arr = [...regrasList];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx],arr[swap]] = [arr[swap],arr[idx]];
    await saveRegras(arr);
  }

  const monthDays = Object.keys(compliance).filter(k=>monthKey(k)===monthKey(today)&&compliance[k]!==undefined);
  const complied  = monthDays.filter(k=>compliance[k]===true).length;
  // % disciplina = baseado nos checks do dia atual
  const totalRegras = regrasList.length;
  const checkedCount = regrasList.filter(r=>!!checked[r.id]).length;
  const pct = totalRegras > 0 ? Math.round((checkedCount/totalRegras)*100) : null;

  // Média do mês atual (só dias salvos neste mês)
  const monthSaved = Object.entries(compliance).filter(([k,v])=>monthKey(k)===monthKey(today)&&typeof v==="number");
  const mediaMes = monthSaved.length > 0
    ? Math.round(monthSaved.reduce((s,[,v])=>s+v,0)/monthSaved.length)
    : null;
  const mesColor = mediaMes===null?"#555":mediaMes>=80?"#2dc99a":mediaMes>=50?"#f59e0b":"#e05656";

  // Regras mais quebradas este mês
  const regraCumprida = {}; // {id: {cumpridas, total}}
  Object.values(entries||{}).forEach(entry => {
    // não temos dados granulares por regra no histórico — usamos o checklist de hoje
  });
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
    .filter(([k,v])=>typeof v==="number")
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
  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };

  if (editando) {
    return (
      <div style={{fontFamily:"Inter,sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setEditando(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"8px",padding:"8px 14px",color:"#888",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Voltar</button>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#f0f0f0"}}>{editId?"Editar Regra":"Nova Regra"}</h1>
        </div>
        <div style={{background:"#111118",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"24px"}}>
          <div style={{marginBottom:"16px"}}>
            <label style={{color:"#777",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"8px"}}>Icone</label>
            <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
              <button onClick={()=>setShowIcons(!showIcons)} style={{width:"48px",height:"48px",fontSize:"24px",background:"rgba(255,255,255,0.05)",border:"1px solid #2a2a3a",borderRadius:"10px",cursor:"pointer"}}>{form.icon}</button>
              <span style={{color:"#555",fontSize:"12px"}}>Clique para escolher outro icone</span>
            </div>
            {showIcons && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px",marginTop:"10px",padding:"12px",background:"rgba(255,255,255,0.03)",borderRadius:"10px",border:"1px solid #2a2a3a"}}>
                {ICONS.map(ic=>(
                  <button key={ic} onClick={()=>{setForm(f=>({...f,icon:ic}));setShowIcons(false);}} style={{width:"38px",height:"38px",fontSize:"20px",background:form.icon===ic?"rgba(0,212,170,0.2)":"rgba(255,255,255,0.04)",border:"1px solid "+(form.icon===ic?"#00d4aa44":"#2a2a3a"),borderRadius:"8px",cursor:"pointer"}}>{ic}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#777",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Titulo *</label>
            <input style={inp} placeholder="Ex: Nao operar em dias de noticia" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          </div>
          <div style={{marginBottom:"16px"}}>
            <label style={{color:"#777",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Descricao</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Detalhes da regra..." value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} rows={3}/>
          </div>
          <div style={{marginBottom:"20px"}}>
            <div onClick={()=>setForm(f=>({...f,personal:!f.personal}))} style={{display:"inline-flex",alignItems:"center",gap:"10px",cursor:"pointer",padding:"10px 14px",borderRadius:"10px",background:form.personal?"rgba(245,158,11,0.08)":"rgba(255,255,255,0.03)",border:"1px solid "+(form.personal?"#f59e0b44":"#2a2a3a"),transition:"all 0.2s"}}>
              <div style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid "+(form.personal?"#f59e0b":"#555"),background:form.personal?"#f59e0b":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                {form.personal && <span style={{color:"#000",fontSize:"12px",fontWeight:"900"}}>✓</span>}
              </div>
              <span style={{color:form.personal?"#f59e0b":"#888",fontWeight:"600",fontSize:"13px"}}>Regra pessoal</span>
              <span style={{color:"#555",fontSize:"12px"}}>(badge amarelo)</span>
            </div>
          </div>
          <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
            <button onClick={salvar} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>💾 Salvar regra</button>
            <button onClick={()=>setEditando(false)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"10px",padding:"11px 18px",color:"#777",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Cancelar</button>
            {msg && <span style={{color:"#2dc99a",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>

      {/* Card de frases no topo */}
      <div style={{background:"linear-gradient(135deg,rgba(0,212,170,0.06),rgba(0,153,255,0.04))",border:"1px solid #00d4aa22",borderRadius:"14px",padding:"22px 28px",marginBottom:"24px",display:"flex",gap:"0",flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:"220px",borderRight:"1px solid #1a1a2e",paddingRight:"28px",marginRight:"28px",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{margin:0,color:"#f0f0f0",fontWeight:"600",fontSize:"13px",letterSpacing:"1.5px",textTransform:"uppercase",lineHeight:"1.9"}}>O QUE GERA RESULTADO É COMPORTAMENTO,<br/>NÃO A TÉCNICA.</p>
        </div>
        <div style={{flex:1,minWidth:"220px",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
          <p style={{margin:0,color:"#f0f0f0",fontWeight:"600",fontSize:"13px",letterSpacing:"1.5px",textTransform:"uppercase",lineHeight:"1.9"}}>O PROBLEMA NÃO É A TÉCNICA — É O CLIQUE.<br/>CADA ENTRADA EXTRA FORA DO SETUP É UMA APOSTA.</p>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Disciplina</h1>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {msg && <span style={{color:"#2dc99a",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          {allChecked && <span style={{background:"rgba(0,212,170,0.15)",color:"#2dc99a",padding:"6px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"700"}}>✓ Pronto para operar</span>}
          <button onClick={abrirNova} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"9px 16px",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>+ Nova regra</button>
        </div>
      </div>


      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"24px"}}>
        {regrasList.map((rule,idx) => {
          const ok    = !!checked[rule.id];
          const color = rule.personal ? "#f59e0b" : "#2dc99a";
          return (
            <div key={rule.id} style={{background:ok?(rule.personal?"rgba(245,158,11,0.07)":"rgba(0,212,170,0.07)"):"#111118",border:"1px solid "+(ok?(rule.personal?"#f59e0b44":"#00d4aa44"):"#1a1a2e"),borderRadius:"12px",padding:"12px 14px",display:"flex",gap:"10px",alignItems:"flex-start",transition:"all 0.2s"}}>
              <div onClick={()=>toggleCheck(rule.id)} style={{width:"22px",height:"22px",borderRadius:"6px",border:"2px solid "+(ok?color:"#333"),background:ok?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px",cursor:"pointer",transition:"all 0.2s"}}>
                {ok && <span style={{color:"#000",fontSize:"12px",fontWeight:"900"}}>✓</span>}
              </div>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>toggleCheck(rule.id)}>
                <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"3px",flexWrap:"wrap"}}>
                  <RuleIcon id={rule.icon} color={ok?color:"#555"} size={16}/>
                  <span style={{color:"#f0f0f0",fontWeight:"600",fontSize:"14px"}}>{rule.title}</span>
                  {rule.personal && <span style={{background:"rgba(245,158,11,0.15)",color:"#f59e0b",fontSize:"10px",fontWeight:"700",padding:"2px 7px",borderRadius:"20px"}}>PESSOAL</span>}
                </div>
                {rule.desc && <p style={{margin:0,color:"#777",fontSize:"12px",lineHeight:"1.5"}}>{rule.desc}</p>}
              </div>
              <div style={{display:"flex",gap:"4px",flexShrink:0,alignItems:"center"}}>
                <button onClick={()=>mover(idx,-1)} disabled={idx===0} style={{background:"none",border:"none",color:idx===0?"#2a2a3a":"#555",cursor:idx===0?"default":"pointer",fontSize:"13px",padding:"4px"}}>▲</button>
                <button onClick={()=>mover(idx,1)} disabled={idx===regrasList.length-1} style={{background:"none",border:"none",color:idx===regrasList.length-1?"#2a2a3a":"#555",cursor:idx===regrasList.length-1?"default":"pointer",fontSize:"13px",padding:"4px"}}>▼</button>
                <button onClick={()=>abrirEditar(rule)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",borderRadius:"6px",color:"#777",cursor:"pointer",fontSize:"11px",padding:"4px 8px",fontFamily:"Inter,sans-serif"}}>✏️</button>
                <button onClick={()=>excluir(rule.id)} style={{background:"rgba(255,77,77,0.06)",border:"1px solid #ff4d4d22",borderRadius:"6px",color:"#ff6b6b",cursor:"pointer",fontSize:"11px",padding:"4px 8px",fontFamily:"Inter,sans-serif"}}>✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botão salvar progresso */}
      <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"28px"}}>
        <button onClick={async()=>{
          const updated={...compliance};
          // Salva porcentagem + quais regras foram marcadas (para análise de regras mais quebradas)
          const regraSalva = {
            pct,
            checked: regrasList.reduce((acc,r)=>({...acc,[r.id]:!!checked[r.id]||false}),{})
          };
          updated[today] = regraSalva.pct;
          // Salva detalhes de cada regra em chave separada
          const detalhes = {...(compliance._detalhes||{})};
          detalhes[today] = regraSalva.checked;
          updated._detalhes = detalhes;
          await saveCompliance(updated);
          setMsg("✓ Disciplina salva!"); setTimeout(()=>setMsg(""),2500);
        }} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 24px",fontWeight:"700",fontSize:"13px",cursor:"pointer",display:"flex",alignItems:"center",gap:"8px"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Salvar progresso de hoje
        </button>
        {pct !== null && (
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div style={{width:"120px",height:"6px",borderRadius:"3px",background:"#1a1a2e",overflow:"hidden"}}>
              <div style={{height:"100%",width:pct+"%",background:pct>=80?"#2dc99a":pct>=50?"#f59e0b":"#e05656",borderRadius:"3px",transition:"width 0.3s"}}/>
            </div>
            <span style={{color:pct>=80?"#2dc99a":pct>=50?"#f59e0b":"#e05656",fontSize:"14px",fontWeight:"800",fontFamily:"monospace"}}>{pct}%</span>
            <span style={{color:"#444",fontSize:"12px"}}>{checkedCount} de {totalRegras}</span>
          </div>
        )}
      </div>

      {/* ── STATS CARDS ── */}
      {(mediaMes !== null || corrDados.length >= 2) && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"12px",marginBottom:"28px"}}>
          {/* Média do mês */}
          {mediaMes !== null && (
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px 20px"}}>
              <p style={{margin:"0 0 4px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Média do Mês</p>
              <p style={{margin:"0 0 2px",color:mesColor,fontSize:"28px",fontWeight:"800",fontFamily:"monospace"}}>{mediaMes}%</p>
              <div style={{height:"4px",borderRadius:"2px",background:"#1a1a2e",marginTop:"8px",overflow:"hidden"}}>
                <div style={{height:"100%",width:mediaMes+"%",background:mesColor,borderRadius:"2px",transition:"width 0.5s"}}/>
              </div>
              <p style={{margin:"6px 0 0",color:"#444",fontSize:"11px"}}>{monthSaved.length} dia{monthSaved.length!==1?"s":""} registrados</p>
            </div>
          )}
          {/* Regras mais quebradas */}
          {topQuebradas.length > 0 && (
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px 20px"}}>
              <p style={{margin:"0 0 12px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Regras Mais Quebradas — {MONTH_NAMES[month]}</p>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {topQuebradas.map((r,i)=>{
                  const pctQ = Math.round((r.quebradas/r.total)*100);
                  const cor = pctQ>=60?"#e05656":pctQ>=30?"#f59e0b":"#888";
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <div style={{flex:1,overflow:"hidden"}}>
                        <p style={{margin:0,color:"#ccc",fontSize:"12px",fontWeight:"600",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title}</p>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0}}>
                        <div style={{width:"60px",height:"4px",borderRadius:"2px",background:"#1a1a2e",overflow:"hidden"}}>
                          <div style={{height:"100%",width:pctQ+"%",background:cor,borderRadius:"2px"}}/>
                        </div>
                        <span style={{color:cor,fontSize:"11px",fontWeight:"700",minWidth:"28px",textAlign:"right"}}>{r.quebradas}×</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{margin:"10px 0 0",color:"#333",fontSize:"10px"}}>baseado nos dias já registrados</p>
            </div>
          )}
          {/* Correlação disciplina × resultado */}
          {corrDados.length >= 3 && mediaResAlta !== null && (
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px 20px"}}>
              <p style={{margin:"0 0 10px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Disciplina × Resultado</p>
              <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"12px",color:"#666"}}>≥80% disciplina</span>
                  <span style={{fontSize:"13px",fontWeight:"800",fontFamily:"monospace",color:mediaResAlta>=0?"#2dc99a":"#e05656"}}>{mediaResAlta>=0?"+":""}R$ {mediaResAlta.toFixed(0)}/dia</span>
                </div>
                {mediaResBaixa !== null && (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:"12px",color:"#666"}}>&lt;80% disciplina</span>
                    <span style={{fontSize:"13px",fontWeight:"800",fontFamily:"monospace",color:mediaResBaixa>=0?"#2dc99a":"#e05656"}}>{mediaResBaixa>=0?"+":""}R$ {mediaResBaixa.toFixed(0)}/dia</span>
                  </div>
                )}
                <div style={{height:"1px",background:"#1a1a2e",margin:"2px 0"}}/>
                <p style={{margin:0,color:"#444",fontSize:"10px",lineHeight:"1.5"}}>
                  {mediaResAlta >= (mediaResBaixa||0)+50
                    ? "✓ Disciplina impacta positivamente seus resultados"
                    : "Ainda sem correlação clara — continue registrando"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{borderTop:"1px solid #1a1a2e",paddingTop:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
          <div><h3 style={{margin:0,fontSize:"15px",color:"#aaa",fontWeight:"600",letterSpacing:"0.5px"}}>Calendário</h3></div>
          {pct !== null && (
            <div style={{textAlign:"right"}}>
              <p style={{margin:"0 0 2px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Hoje — progresso</p>
              <p style={{margin:0,color:pct>=80?"#2dc99a":pct>=50?"#f59e0b":"#e05656",fontSize:"24px",fontWeight:"800",fontFamily:"JetBrains Mono,monospace"}}>{pct}%</p>
              <p style={{margin:"2px 0 0",color:"#444",fontSize:"11px"}}>{checkedCount} de {totalRegras} regras</p>
            </div>
          )}
        </div>

        
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"16px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px",marginBottom:"8px"}}>
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sab"].map(d=>(
              <div key={d} style={{textAlign:"center",color:"#444",fontSize:"10px",fontWeight:"600",padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"6px"}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
            {Array.from({length:daysInMon}).map((_,i)=>{
              const d=i+1,k=calKey(d),isToday=k===today,future=k>today;
              const status=compliance[k];
              const hasPct = typeof status === "number";
              const isOk   = status === true || (hasPct && status >= 80);
              const isMid  = hasPct && status >= 50 && status < 80;
              const isBad  = hasPct && status < 50;
              const bg    = future?"transparent":isOk?"rgba(0,212,170,0.12)":isMid?"rgba(245,158,11,0.12)":isBad?"rgba(255,77,77,0.12)":"rgba(255,255,255,0.02)";
              const border= isToday?"2px solid #00d4aa55":"1px solid "+(isOk?"#00d4aa22":isMid?"#f59e0b22":isBad?"#ff4d4d22":"#1a1a2e");
              const accentColor = isOk?"#2dc99a":isMid?"#f59e0b":isBad?"#e05656":"#555";
              const dayEntry = (entries||{})[k];
              const emocoes = dayEntry?.emocoes || [];
              const EMOCAO_COLORS = {"Focado":"#2dc99a","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};
              return (
                <div key={d} style={{minHeight:"80px",borderRadius:"10px",background:bg,border,cursor:future?"default":"pointer",transition:"all 0.15s",padding:"7px 8px",position:"relative"}}
                  onClick={()=>!future&&toggleDay(k)}>
                  {/* Número do dia — topo esquerda */}
                  <span style={{fontSize:"16px",fontWeight:isToday?"800":"600",color:isToday?"#f0f0f0":future?"#2a2a3a":"#ccc",lineHeight:1}}>{d}</span>
                  {/* Emoções — centro direita */}
                  {!future && emocoes.length > 0 && (
                    <div style={{position:"absolute",right:"7px",top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",gap:"3px",alignItems:"flex-end"}}>
                      {emocoes.slice(0,2).map(em=>(
                        <span key={em} style={{fontSize:"10px",fontWeight:"600",color:EMOCAO_COLORS[em]||"#888",lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"right"}}>{em}</span>
                      ))}
                    </div>
                  )}
                  {/* Porcentagem — inferior esquerda */}
                  {(hasPct || status===true) && (
                    <span style={{position:"absolute",bottom:"7px",left:"8px",fontSize:"14px",fontWeight:"800",fontFamily:"monospace",color:accentColor,lineHeight:1}}>
                      {hasPct ? status+"%" : "100%"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <p style={{margin:"10px 0 0",color:"#444",fontSize:"11px",textAlign:"center"}}>
          <span style={{color:"#00d4aa66"}}>■</span> ≥80% &nbsp;
          <span style={{color:"#f59e0b66"}}>■</span> 50–79% &nbsp;
          <span style={{color:"#ff4d4d66"}}>■</span> &lt;50% &nbsp;
          · Salve o progresso para registrar
        </p>
      </div>
    </div>
  );
}
