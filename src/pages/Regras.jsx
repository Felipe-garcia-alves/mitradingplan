import { useState } from "react";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function todayKey() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function monthKey(s) { return s.slice(0,7); }
function formatDateFull(s) { const p=s.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

const REGRAS_PADRAO = [
  { id:"r1", icon:"🎯", title:"Maximo 5 operacoes/dia",             desc:"Apos 5 entradas feche a plataforma. Sem excecoes.", personal:false },
  { id:"r2", icon:"🛑", title:"Stop loss obrigatorio",               desc:"Nunca entre sem stop definido ANTES de clicar.", personal:false },
  { id:"r3", icon:"⛔", title:"Respeitar perda maxima diaria",       desc:"Bateu o stop diario (3% da banca), encerra tudo.", personal:false },
  { id:"r4", icon:"🏆", title:"Respeitar meta diaria",               desc:"Bateu a meta (2% da banca), pode encerrar.", personal:false },
  { id:"r5", icon:"🔒", title:"Regra da vinganca",                   desc:"Tomou stop? Aguarde 15 minutos antes da proxima entrada.", personal:false },
  { id:"r6", icon:"📵", title:"Horario proibido",                    desc:"Nao opere no primeiro candle nem nos 15 min antes do fechamento.", personal:false },
  { id:"r7", icon:"📝", title:"Anotar no diario apos cada operacao", desc:"Registre motivo, emocao e resultado imediatamente.", personal:true },
  { id:"r8", icon:"🚨", title:"3 stops seguidos = parar o dia",      desc:"Tomou 3 stops consecutivos? Encerra. Volte amanha.", personal:true },
  { id:"r9", icon:"📐", title:"RR minimo 1:2",                       desc:"So entre se o alvo for pelo menos o dobro do stop.", personal:false },
];

const ICONS = ["🎯","🛑","⛔","🏆","🔒","📵","📝","🚨","📐","💡","⚡","🧠","📊","🔥","✅","❌","⏰","💰","📈","🎲"];

export default function Regras({ regras, saveRegras, compliance, saveCompliance }) {
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
    if (updated[k]===true) updated[k]=false;
    else if (updated[k]===false) delete updated[k];
    else updated[k]=true;
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
            {msg && <span style={{color:"#00d4aa",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Regras</h1>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {msg && <span style={{color:"#00d4aa",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          {allChecked && <span style={{background:"rgba(0,212,170,0.15)",color:"#00d4aa",padding:"6px 14px",borderRadius:"20px",fontSize:"12px",fontWeight:"700"}}>✓ Pronto para operar</span>}
          <button onClick={abrirNova} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"9px 16px",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>+ Nova regra</button>
        </div>
      </div>


      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"24px"}}>
        {regrasList.map((rule,idx) => {
          const ok    = !!checked[rule.id];
          const color = rule.personal ? "#f59e0b" : "#00d4aa";
          return (
            <div key={rule.id} style={{background:ok?(rule.personal?"rgba(245,158,11,0.07)":"rgba(0,212,170,0.07)"):"#111118",border:"1px solid "+(ok?(rule.personal?"#f59e0b44":"#00d4aa44"):"#1a1a2e"),borderRadius:"12px",padding:"12px 14px",display:"flex",gap:"10px",alignItems:"flex-start",transition:"all 0.2s"}}>
              <div onClick={()=>toggleCheck(rule.id)} style={{width:"22px",height:"22px",borderRadius:"6px",border:"2px solid "+(ok?color:"#333"),background:ok?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px",cursor:"pointer",transition:"all 0.2s"}}>
                {ok && <span style={{color:"#000",fontSize:"12px",fontWeight:"900"}}>✓</span>}
              </div>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>toggleCheck(rule.id)}>
                <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"3px",flexWrap:"wrap"}}>
                  <span style={{fontSize:"16px"}}>{rule.icon}</span>
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

      <div style={{padding:"16px 20px",borderRadius:"12px",background:"rgba(255,77,77,0.05)",border:"1px solid rgba(255,77,77,0.15)",marginBottom:"14px"}}>
        <p style={{margin:"0 0 6px",color:"#ff4d4d",fontWeight:"700",fontSize:"14px"}}>⚠️ Regra de ouro do overtrading</p>
        <p style={{margin:0,color:"#888",fontSize:"13px",lineHeight:"1.6"}}><strong style={{color:"#ccc"}}>O problema não é a técnica — é o clique.</strong> Cada entrada extra fora do setup e uma aposta.</p>
      </div>

      <div style={{padding:"18px 24px",borderRadius:"12px",background:"linear-gradient(135deg,rgba(0,212,170,0.07),rgba(0,153,255,0.05))",border:"1px solid rgba(0,212,170,0.2)",textAlign:"center",marginBottom:"28px"}}>
        <p style={{margin:0,color:"#f0f0f0",fontWeight:"800",fontSize:"17px",letterSpacing:"0.5px",lineHeight:"1.5"}}>O QUE GERA RESULTADO É COMPORTAMENTO,<br/>NÃO A TÉCNICA.</p>
      </div>

      <div style={{borderTop:"1px solid #1a1a2e",paddingTop:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
          <div>
            <h3 style={{margin:"0 0 4px",fontSize:"16px",color:"#f0f0f0",fontWeight:"700"}}>📅 Calendario de Disciplina</h3>
            <p style={{margin:0,color:"#555",fontSize:"12px"}}>Registre se cumpriu todas as regras em cada dia</p>
          </div>
          {pct !== null && (
            <div style={{textAlign:"right"}}>
              <p style={{margin:"0 0 2px",color:"#777",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Hoje — progresso</p>
              <p style={{margin:0,color:pct>=80?"#00d4aa":pct>=50?"#f59e0b":"#ff4d4d",fontSize:"24px",fontWeight:"800",fontFamily:"JetBrains Mono,monospace"}}>{pct}%</p>
              <p style={{margin:"2px 0 0",color:"#444",fontSize:"11px"}}>{checkedCount} de {totalRegras} regras</p>
            </div>
          )}
        </div>

        <div onClick={()=>toggleDay(today)} style={{background:todayComplied?"rgba(0,212,170,0.1)":"rgba(255,255,255,0.03)",border:"1px solid "+(todayComplied?"#00d4aa44":"#2a2a3a"),borderRadius:"10px",padding:"12px 18px",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:"10px",marginBottom:"20px",transition:"all 0.2s"}}>
          <div style={{width:"20px",height:"20px",borderRadius:"5px",border:"2px solid "+(todayComplied?"#00d4aa":"#555"),background:todayComplied?"#00d4aa":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
            {todayComplied && <span style={{color:"#000",fontSize:"11px",fontWeight:"900"}}>✓</span>}
          </div>
          <span style={{color:todayComplied?"#00d4aa":"#888",fontWeight:"600",fontSize:"13px"}}>
            {todayComplied?"✓ Cumpri todas as regras hoje":"Marcar: cumpri todas as regras hoje"}
          </span>
          {todayComplied && <span style={{color:"#00d4aa66",fontSize:"11px"}}>({formatDateFull(today)})</span>}
        </div>

        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"16px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px",marginBottom:"8px"}}>
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sab"].map(d=>(
              <div key={d} style={{textAlign:"center",color:"#444",fontSize:"10px",fontWeight:"600",padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"4px"}}>
            {Array.from({length:firstDay}).map((_,i)=><div key={"e"+i}/>)}
            {Array.from({length:daysInMon}).map((_,i)=>{
              const d=i+1,k=calKey(d),isToday=k===today,future=k>today;
              const status=compliance[k];
              const bg    =future?"transparent":status===true?"rgba(0,212,170,0.2)":status===false?"rgba(255,77,77,0.2)":"rgba(255,255,255,0.02)";
              const border=isToday?"2px solid #00d4aa44":"1px solid "+(status===true?"#00d4aa33":status===false?"#ff4d4d33":"#1a1a2e");
              const color =future?"#2a2a3a":status===true?"#00d4aa":status===false?"#ff4d4d":isToday?"#f0f0f0":"#555";
              return (
                <div key={d} onClick={()=>toggleDay(k)} style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:"8px",background:bg,border,cursor:future?"default":"pointer",transition:"all 0.15s"}}>
                  <span style={{fontSize:"12px",fontWeight:isToday?"800":"500",color,lineHeight:1}}>{d}</span>
                  {status===true  && <span style={{fontSize:"8px",marginTop:"1px",color:"#00d4aa"}}>✓</span>}
                  {status===false && <span style={{fontSize:"8px",marginTop:"1px",color:"#ff4d4d"}}>✗</span>}
                </div>
              );
            })}
          </div>
        </div>
        <p style={{margin:"10px 0 0",color:"#444",fontSize:"11px",textAlign:"center"}}>
          <span style={{color:"#00d4aa66"}}>■</span> Cumpriu &nbsp;
          <span style={{color:"#ff4d4d66"}}>■</span> Nao cumpriu &nbsp;
          <span style={{color:"#ffffff08"}}>■</span> Sem registro · Clique em qualquer dia para registrar
        </p>
      </div>
    </div>
  );
}
