import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { supabase } from "./supabase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login       from "./pages/Login";
import NovaSenha   from "./pages/NovaSenha";
import Onboarding  from "./pages/Onboarding";
import Termos      from "./pages/Termos";
import Evolucao    from "./pages/Evolucao";
import Macro from "./pages/Macro";
import Diario      from "./pages/Diario";
import Historico   from "./pages/Historico";
import Estrategias from "./pages/Estrategias";
import Sidebar     from "./components/Sidebar";
import { hojeLocal } from "./lib/datas";
import { contarPendentes } from "./lib/revisao";

const Banca       = lazy(()=>import("./pages/Banca"));
const Regras      = lazy(()=>import("./pages/Regras"));
const Crescimento = lazy(()=>import("./pages/Crescimento"));
const Patrimonio  = lazy(()=>import("./pages/Patrimonio"));
const Config      = lazy(()=>import("./pages/Config"));
const Usuarios    = lazy(()=>import("./pages/Usuarios"));
const Revisao     = lazy(()=>import("./pages/Revisao"));

function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"200px"}}>
      <div style={{width:"28px",height:"28px",border:"3px solid #18241f",borderTop:"3px solid #2ee6a0",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    </div>
  );
}

// Data de hoje em Brasília (a mesma regra do banco: assinatura_ativa usa America/Sao_Paulo)
function hojeBRT() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

function diasAte(ate, hoje) {
  if (!ate) return null;
  return Math.round((new Date(ate + "T12:00:00") - new Date(hoje + "T12:00:00")) / 86400000);
}

// Faixa nos últimos dias antes do vencimento (teste ou assinatura)
function AvisoVencimento({ perfil, hoje }) {
  if (perfil.papel === "admin" || !["teste","ativa"].includes(perfil.status)) return null;
  const dias = diasAte(perfil.ate, hoje);
  if (dias === null || dias < 0 || dias > 5) return null;
  const teste = perfil.status === "teste";
  const quando = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : "em " + dias + " dias";
  const urgente = dias <= 1;
  const cor = urgente ? "#ff7a90" : "#f5b941";
  const fundo = urgente ? "rgba(255,84,112,0.08)" : "rgba(245,185,65,0.07)";
  return (
    <div style={{background:fundo,border:"1px solid "+cor+"44",borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"12px"}}>
      <div style={{width:"32px",height:"32px",borderRadius:"9px",flexShrink:0,background:cor+"1f",border:"1px solid "+cor+"55",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
      </div>
      <div style={{minWidth:0}}>
        <p style={{margin:0,color:cor,fontSize:"13.5px",fontWeight:"700"}}>
          {teste ? "Seu teste grátis termina " + quando : "Sua assinatura vence " + quando}
          {perfil.ate && <span style={{color:"var(--text-3)",fontWeight:500,fontFamily:"var(--font-mono)",fontSize:"12px"}}> · {perfil.ate.split("-").reverse().join("/")}</span>}
        </p>
        <p style={{margin:"2px 0 0",color:"var(--text-2)",fontSize:"12.5px"}}>
          Depois disso o acesso fica bloqueado até a {teste ? "assinatura" : "renovação"}. Seus dados continuam guardados.
        </p>
      </div>
    </div>
  );
}

// Tela de bloqueio quando a assinatura venceu ou foi suspensa
function AssinaturaInativa({ perfil, onSair }) {
  const vencida = perfil.status!=="suspensa" && perfil.status!=="cancelada";
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"var(--font-sans)"}}>
      <div style={{width:"100%",maxWidth:"440px",background:"var(--panel)",border:"1px solid var(--line-strong)",borderRadius:"20px",padding:"32px",textAlign:"center"}}>
        <div style={{width:"52px",height:"52px",borderRadius:"14px",margin:"0 auto 18px",background:"rgba(245,185,65,0.1)",border:"1px solid #f5b94144",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5b941" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1 style={{margin:"0 0 8px",color:"var(--text)",fontSize:"21px",fontWeight:"800"}}>{vencida ? "Sua assinatura venceu" : "Acesso suspenso"}</h1>
        <p style={{margin:"0 0 24px",color:"var(--text-3)",fontSize:"13.5px",lineHeight:1.6}}>
          {vencida && perfil.ate ? "Seu acesso foi até "+perfil.ate.split("-").reverse().join("/")+". " : ""}
          Seus dados continuam guardados. Fale com o suporte para renovar e voltar a usar o Mi Trading Plan.
        </p>
        <button onClick={onSair} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--line-strong)",borderRadius:"10px",padding:"11px 22px",color:"var(--text-2)",fontSize:"13px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Sair da conta</button>
      </div>
    </div>
  );
}

function UserHeader({ nomeUsuario, entries }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = hojeLocal();
  const todayEntry = entries[today];
  const totalHoje = todayEntry ? (todayEntry.totalB3||0)+(todayEntry.totalForex||0)+(todayEntry.totalCripto||0)+(todayEntry.totalAmericano||0) : null;
  const inicial = nomeUsuario ? nomeUsuario[0].toUpperCase() : "U";

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const EMOCAO_COLORS = {"Focado":"#2ee6a0","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};

  const trades = todayEntry?.trades || [];
  const wins = trades.filter(t=>t.tipo==="WIN").length;
  const execPct = trades.length>0 ? Math.round((wins/trades.length)*100) : null;
  const totalPts = todayEntry?.totalPts ?? null;

  // Estratégias usadas hoje
  const estratUsadas = [...new Set(trades.map(t=>t.estrategia).filter(Boolean))];
  // Contagem por estratégia
  const estratCount = {};
  trades.forEach(t=>{ if(t.estrategia){ estratCount[t.estrategia]=(estratCount[t.estrategia]||0)+1; }});

  // Emoção predominante (primeira registrada)
  const emocaoPred = todayEntry?.emocoes?.[0] || null;

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:open?"rgba(46,230,160,0.08)":"rgba(255,255,255,0.04)",border:"1px solid "+(open?"#2ee6a044":"#1b2823"),borderRadius:"10px",padding:"7px 12px",cursor:"pointer",fontFamily:"var(--font-sans)",transition:"all 0.2s"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#2ee6a022,#0099ff22)",border:"1px solid #2ee6a044",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#2ee6a0",flexShrink:0}}>{inicial}</div>
        <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600"}}>{nomeUsuario||"Trader"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,background:"#0c1411",border:"1px solid #1b2823",borderRadius:"20px",padding:"0",zIndex:300,width:"min(340px, calc(100vw - 24px))",maxHeight:"calc(100dvh - 90px)",overflowY:"auto",overscrollBehavior:"contain",boxShadow:"0 24px 60px rgba(0,0,0,0.8)",animation:"mtpPopDown .2s var(--ease) both"}}>
          
          {/* Header */}
          <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #18241f"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700",lineHeight:1.35,paddingRight:"10px"}}>{today.split("-").reverse().join(" de ").replace(/(\d+) de (\d+) de (\d+)/,(_,d,m,y)=>{const meses=["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];return `${d} de ${meses[parseInt(m)]}, ${["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"][new Date(today+"T12:00:00").getDay()]}`})}</p>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#6f8179",cursor:"pointer",fontSize:"18px",padding:"0",lineHeight:1}}>×</button>
            </div>

            {/* Stats topo */}
            {todayEntry ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                <div style={{background:"#18241f",borderRadius:"10px",padding:"12px",minWidth:0}}>
                  <p style={{margin:"0 0 2px",color:"#7a8c84",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos do dia</p>
                  <p style={{margin:0,color:totalPts>=0?"#2ee6a0":"#ff5470",fontSize:"17px",fontWeight:"800",fontFamily:"var(--font-mono)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{totalPts>=0?"+":""}{totalPts} pts</p>
                </div>
                <div style={{background:"#18241f",borderRadius:"10px",padding:"12px",minWidth:0}}>
                  <p style={{margin:"0 0 2px",color:"#7a8c84",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado R$</p>
                  <p style={{margin:0,color:totalHoje>=0?"#2ee6a0":"#ff5470",fontSize:"17px",fontWeight:"800",fontFamily:"var(--font-mono)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{totalHoje>=0?"R$ +":"R$ "}{Math.abs(totalHoje).toLocaleString("pt-BR",{minimumFractionDigits:0})}</p>
                </div>
              </div>
            ) : null}

            {/* Trades + exec */}
            {todayEntry && (
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <span style={{background:"#18241f",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#aaa",fontWeight:"600"}}>{trades.length} trades</span>
                {execPct!==null&&wins===trades.length&&<span style={{background:"rgba(46,230,160,0.1)",border:"1px solid #2ee6a033",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#2ee6a0",fontWeight:"600"}}>WIN ({wins})</span>}
                {execPct!==null&&<span style={{background:"rgba(46,230,160,0.08)",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#2ee6a0",fontWeight:"600"}}>● {execPct}% exec.</span>}
              </div>
            )}
          </div>

          {/* Emoção predominante */}
          {emocaoPred && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #18241f"}}>
              <p style={{margin:"0 0 8px",color:"#6f8179",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoção Predominante</p>
              <div style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:"10px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"18px"}}>🎯</span>
                <span style={{color:"#c4b5fd",fontSize:"14px",fontWeight:"700"}}>{emocaoPred}</span>
              </div>
            </div>
          )}

          {/* Estratégias */}
          {estratUsadas.length > 0 && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #18241f"}}>
              <p style={{margin:"0 0 8px",color:"#6f8179",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Estratégias Utilizadas</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {estratUsadas.map(e=>(
                  <div key={e} style={{background:"#18241f",borderRadius:"8px",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600",minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.slice(0,2).toUpperCase()} — {e}</span>
                    <span style={{color:"#7a8c84",fontSize:"12px"}}>({estratCount[e]})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emoções */}
          {todayEntry?.emocoes?.length > 0 && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #18241f"}}>
              <p style={{margin:"0 0 8px",color:"#6f8179",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções Registradas</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {todayEntry.emocoes.map(em=>(
                  <span key={em} style={{padding:"4px 10px",borderRadius:"20px",background:(EMOCAO_COLORS[em]||"#888")+"18",color:EMOCAO_COLORS[em]||"#888",fontSize:"12px",fontWeight:"600",border:"1px solid "+(EMOCAO_COLORS[em]||"#888")+"33"}}>{em}</span>
                ))}
              </div>
            </div>
          )}

          {/* Operações */}
          {trades.length > 0 && (
            <div style={{padding:"14px 20px"}}>
              <p style={{margin:"0 0 10px",color:"#6f8179",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações ({trades.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {trades.map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#18241f",borderRadius:"8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{color:"#86978f",fontSize:"11px"}}>#{i+1}</span>
                      <span style={{padding:"2px 6px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470"}}>{t.tipo}</span>
                      {t.estrategia&&<span style={{padding:"2px 7px",borderRadius:"4px",background:"rgba(0,153,255,0.15)",color:"#0099ff",fontSize:"11px",fontWeight:"600"}}>{t.estrategia.slice(0,2).toUpperCase()}</span>}
                      {t.mercado&&<span style={{color:"#7a8c84",fontSize:"11px"}}>{t.mercado}</span>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      {t.pontos!=null&&<p style={{margin:0,color:"#aaa",fontSize:"12px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</p>}
                      {t.resultado!=null&&<p style={{margin:0,color:t.resultado>=0?"#2ee6a0":"#ff5470",fontSize:"12px",fontFamily:"var(--font-mono)",fontWeight:"700"}}>R$ {t.resultado>=0?"+":""}{t.resultado}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!todayEntry && (
            <div style={{padding:"30px 20px",textAlign:"center",color:"#64766e",fontSize:"13px"}}>
              Nenhum registro hoje ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppInterno() {
  const { user, logout } = useAuth();
  const [pagina,      setPagina]      = useState("evolucao");
  const [entries,     setEntries]     = useState({});
  const [config,      setConfigState] = useState({bancaB3:3000,bancaForex:200});
  const [compliance,  setCompliance]  = useState({});
  const [estrategias, setEstrategias] = useState([]);
  const [regras,      setRegras]      = useState([]);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [perfil,      setPerfil]      = useState({ papel:"trader", status:"ativa", ate:null });
  const [hoje,        setHoje]        = useState(hojeBRT);
  const [aviso,       setAviso]       = useState("");
  const avisar = txt => { setAviso(txt); setTimeout(() => setAviso(""), 6000); };
  const [loading,     setLoading]     = useState(true);
  const [onboarding,  setOnboarding]  = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);
  const uid = user.id;
  const pendentesRevisao = useMemo(() => contarPendentes(entries), [entries]);

  useEffect(()=>{
    const fn = ()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",fn);
    return ()=>window.removeEventListener("resize",fn);
  },[]);

  // ── ASSINATURA: confere de novo com o app aberto ──
  // Sem isso, quem estivesse com o app aberto na virada do vencimento só veria
  // erros ao salvar (o banco já bloqueia); assim a tela de vencimento aparece.
  useEffect(()=>{
    if (!uid) return;
    const conferir = async () => {
      setHoje(hojeBRT());
      const { data } = await supabase.from("usuarios").select("papel,status_assinatura,assinatura_ate").eq("id", uid).single();
      if (data) setPerfil({ papel:data.papel||"trader", status:data.status_assinatura||"ativa", ate:data.assinatura_ate||null });
    };
    const aoVoltar = () => { if (document.visibilityState === "visible") conferir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    const timer = setInterval(conferir, 30 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", aoVoltar); clearInterval(timer); };
  },[uid]);

  // ── LOAD USER DATA FROM SUPABASE ──
  useEffect(()=>{
    if (!uid) return;
    async function load() {
      setLoading(true);
      try {
        const { data: userData } = await supabase
          .from("usuarios").select("*").eq("id", uid).single();
        if (userData) {
          setNomeUsuario(userData.nome||"");
          setPerfil({ papel:userData.papel||"trader", status:userData.status_assinatura||"ativa", ate:userData.assinatura_ate||null });
          if (userData.config)     setConfigState(userData.config);
          if (userData.compliance) setCompliance(userData.compliance);
          if (userData.regras)     setRegras(userData.regras);
        } else {
          // Novo usuário — cria registro
          const nome = user.email?.split("@")[0]||"Trader";
          await supabase.from("usuarios").insert({
            id: uid, nome, email: user.email||"",
            criado_em: new Date().toISOString(),
            config: {bancaB3:3000,bancaForex:200},
            compliance: {}, regras: []
          });
          setNomeUsuario(nome);
          setOnboarding(true); // novo usuário → onboarding
        }
      } catch(e){ console.error("load user:",e); }

      // Carrega estratégias
      try {
        const { data: ests } = await supabase
          .from("estrategias").select("*").eq("usuario_id", uid);
        if (ests) setEstrategias(ests.map(e=>({id:e.id, firebase_id:e.firebase_id, ...e.dados})));
      } catch(e){ console.error("load estrategias:",e); }

      // Carrega diário
      try {
        const { data: diario } = await supabase
          .from("diario").select("*").eq("usuario_id", uid);
        if (diario) {
          const d={};
          diario.forEach(row=>{ d[row.data_key]=row.dados; });
          setEntries(d);
        }
      } catch(e){ console.error("load diario:",e); }

      setLoading(false);
    }
    load();
  },[uid]);

  // ── REALTIME DIÁRIO ──
  useEffect(()=>{
    if (!uid) return;
    const channel = supabase
      .channel("diario-changes")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "diario",
        filter: `usuario_id=eq.${uid}`
      }, async () => {
        // Recarrega o diário completo
        const { data } = await supabase.from("diario").select("*").eq("usuario_id", uid);
        if (data) {
          const d={};
          data.forEach(row=>{ d[row.data_key]=row.dados; });
          setEntries(d);
        }
      })
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[uid]);

  // ── SAVE FUNCTIONS ──
  // Retorna true/false. Atualiza a tela na hora e desfaz se o banco recusar.
  const saveEntry = async (k, dados) => {
    const anterior = entries[k];
    setEntries(prev => ({...prev, [k]: dados}));
    let error = null;
    try {
      ({ error } = await supabase.from("diario").upsert(
        { usuario_id:uid, data_key:k, dados },
        { onConflict: "usuario_id,data_key" }
      ));
    } catch(e){ error = e; }
    if (error) {
      console.error("salvar diário:", error);
      setEntries(prev => { const n = {...prev}; if (anterior) n[k] = anterior; else delete n[k]; return n; });
      avisar("Não foi possível salvar no servidor. Verifique sua conexão e tente de novo.");
      return false;
    }
    return true;
  };

  const deleteEntry = async k => {
    let error = null;
    try {
      ({ error } = await supabase.from("diario").delete().eq("usuario_id",uid).eq("data_key",k));
    } catch(e){ error = e; }
    if (error) { console.error("apagar dia:", error); avisar("Não foi possível apagar. Tente de novo."); return false; }
    setEntries(prev=>{ const n={...prev}; delete n[k]; return n; });
    return true;
  };

  const saveConfig = async c => {
    setConfigState(c);
    try { await supabase.from("usuarios").update({config:c}).eq("id",uid); } catch(e){ console.error(e); }
  };

  const saveComplianceData = async c => {
    setCompliance(c);
    try { await supabase.from("usuarios").update({compliance:c}).eq("id",uid); } catch(e){ console.error(e); }
  };

  const saveRegras = async r => {
    setRegras(r);
    try { await supabase.from("usuarios").update({regras:r}).eq("id",uid); } catch(e){ console.error(e); }
  };

  const saveEstrategia = async (id, data) => {
    try {
      if (id) {
        const estrategiaAntiga = estrategias.find(e=>e.id===id);
        const nomeAntigo = estrategiaAntiga?.nome;
        const nomeNovo = data.nome;
        await supabase.from("estrategias").update({dados:data}).eq("id",id).eq("usuario_id",uid);
        setEstrategias(p=>p.map(e=>e.id===id?{...e,...data}:e));
        // Se nome mudou, atualiza todos os trades no diário
        if (nomeAntigo && nomeNovo && nomeAntigo !== nomeNovo) {
          const { data: diario } = await supabase.from("diario").select("*").eq("usuario_id",uid);
          if (diario) {
            const updates = diario
              .filter(row=>(row.dados.trades||[]).some(t=>t.estrategia===nomeAntigo))
              .map(row=>({
                usuario_id: uid,
                data_key: row.data_key,
                dados: {...row.dados, trades: (row.dados.trades||[]).map(t=>t.estrategia===nomeAntigo?{...t,estrategia:nomeNovo}:t)}
              }));
            if (updates.length > 0) {
              await supabase.from("diario").upsert(updates, {onConflict:"usuario_id,data_key"});
            }
          }
        }
      } else {
        const { data: nova } = await supabase.from("estrategias")
          .insert({usuario_id:uid, dados:data}).select().single();
        if (nova) setEstrategias(p=>[...p,{id:nova.id,...data}]);
      }
    } catch(e){ console.error(e); }
  };

  const deleteEstrategia = async id => {
    try {
      await supabase.from("estrategias").delete().eq("id",id).eq("usuario_id",uid);
      setEstrategias(p=>p.filter(e=>e.id!==id));
    } catch(e){ console.error(e); }
  };

  const TITLES = {evolucao:"Evolução",macro:"Macro",diario:"Diário",historico:"Histórico",revisao:"Revisão",banca:"Banca",regras:"Disciplina",estrategias:"Estratégias",crescimento:"Crescimento",patrimonio:"Patrimônio",config:"Configurações",usuarios:"Usuários",termos:"Termos & Privacidade"};

  const renderPage = () => {
    switch(pagina){
      case "evolucao":    return <Evolucao entries={entries} compliance={compliance} estrategias={estrategias} setPagina={setPagina} config={config} saveConfig={saveConfig}/>;
      case "macro":       return <Macro isAdmin={perfil.papel==="admin"}/>;
      case "diario":      return <Diario entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry} estrategias={estrategias} uid={uid} config={config} setPagina={setPagina}/>;
      case "historico":   return <Historico entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry} estrategias={estrategias} config={config}/>;
      case "revisao":     return <Suspense fallback={<Spinner/>}><Revisao entries={entries} saveEntry={saveEntry} estrategias={estrategias} uid={uid} config={config} saveConfig={saveConfig}/></Suspense>;
      case "estrategias": return <Estrategias estrategias={estrategias} entries={entries} saveEstrategia={saveEstrategia} deleteEstrategia={deleteEstrategia}/>;
      case "banca":       return <Suspense fallback={<Spinner/>}><Banca entries={entries} config={config} saveConfig={saveConfig} setPagina={setPagina}/></Suspense>;
      case "regras":      return <Suspense fallback={<Spinner/>}><Regras regras={regras} saveRegras={saveRegras} compliance={compliance} saveCompliance={saveComplianceData} entries={entries} setPagina={setPagina}/></Suspense>;
      case "crescimento": return <Suspense fallback={<Spinner/>}><Crescimento entries={entries} config={config}/></Suspense>;
      case "patrimonio":  return <Suspense fallback={<Spinner/>}><Patrimonio entries={entries} config={config}/></Suspense>;
      case "config":      return <Suspense fallback={<Spinner/>}><Config config={config} saveConfig={saveConfig} nomeUsuario={nomeUsuario} setPagina={setPagina} isAdmin={perfil.papel==="admin"} entries={entries} compliance={compliance} saveCompliance={saveComplianceData}/></Suspense>;
      case "usuarios":    return perfil.papel==="admin"
                            ? <Suspense fallback={<Spinner/>}><Usuarios onVoltar={()=>setPagina("config")}/></Suspense>
                            : null;
      case "termos":      return <Termos onVoltar={()=>setPagina("config")}/>;
      default:            return <Evolucao entries={entries} config={config}/>;
    }
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#050907",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#2ee6a0,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <p style={{color:"#6f8179",fontSize:"14px"}}>Carregando...</p>
      </div>
    </div>
  );

  // Assinatura: admin nunca é bloqueado; demais perdem acesso se suspensos ou vencidos
  const bloqueado = perfil.papel!=="admin" && (
    perfil.status==="suspensa" || perfil.status==="cancelada" || (perfil.ate && perfil.ate < hoje)
  );
  if (bloqueado) return <AssinaturaInativa perfil={perfil} onSair={logout}/>;

  if (onboarding) return (
    <Onboarding
      nomeUsuario={nomeUsuario}
      onComplete={()=>setOnboarding(false)}
      saveConfig={saveConfig}
      saveEstrategia={saveEstrategia}
    />
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",fontFamily:"var(--font-sans)"}}>
      {(!isMobile||sidebarOpen)&&<Sidebar pagina={pagina} setPagina={p=>{setPagina(p);setSidebarOpen(false);}} nomeUsuario={nomeUsuario} mobile={isMobile} onClose={()=>setSidebarOpen(false)} compliance={compliance} pendentesRevisao={pendentesRevisao}/>}
      <main style={{marginLeft:isMobile?"0":"240px",flex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}
        onTouchStart={e=>{if(isMobile)window._swipeX=e.touches[0].clientX;}}
        onTouchEnd={e=>{if(isMobile&&window._swipeX&&(window._swipeX-e.changedTouches[0].clientX)>60){setSidebarOpen(false);window._swipeX=null;}}}>
        <div className="mtp-topbar" style={{position:"sticky",top:0,zIndex:100,padding:isMobile?"10px 14px":"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#a3b2ab",flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
            <div style={{width:"28px",height:"28px",borderRadius:"6px",background:"rgba(46,230,160,0.1)",border:"1px solid #2ee6a033",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#2ee6a0",fontSize:"11px",fontWeight:"800"}}>{pagina.slice(0,2).toUpperCase()}</span>
            </div>
            <h2 className="mtp-page-title">{TITLES[pagina]||pagina}</h2>
          </div>
          <UserHeader nomeUsuario={nomeUsuario} entries={entries}/>
        </div>
        <div style={{flex:1,padding:isMobile?"16px 12px":"28px 24px",maxWidth:"1248px",width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
          <AvisoVencimento perfil={perfil} hoje={hoje}/>
          {/* Lembrete de disciplina — aparece se hoje ainda não foi salvo */}
          {(() => {
            const today = hojeLocal();
            const salvouHoje = compliance[today] !== undefined;
            if (salvouHoje || pagina === "regras") return null;
            return (
              <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:"10px",padding:"10px 16px",marginBottom:"16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"14px"}}>🔔</span>
                  <p style={{margin:0,color:"#f59e0b",fontSize:"13px",fontWeight:"600"}}>Você ainda não registrou sua disciplina hoje</p>
                </div>
                <button onClick={()=>setPagina("regras")}
                  style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:"7px",padding:"5px 12px",color:"#f59e0b",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"var(--font-sans)",flexShrink:0}}>
                  Registrar agora
                </button>
              </div>
            );
          })()}
          <div key={pagina} className="mtp-page">{renderPage()}</div>
          {aviso && (
            <div role="alert" style={{position:"fixed",right:"24px",bottom:"24px",zIndex:700,maxWidth:"380px",padding:"12px 16px",borderRadius:"12px",background:"rgba(40,10,16,0.96)",border:"1px solid #ff547055",color:"#ffb3c0",fontSize:"13px",lineHeight:1.5,boxShadow:"0 18px 50px -12px rgba(0,0,0,0.8)",animation:"mtpFadeUp .3s var(--ease) both"}}>
              {aviso}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Root() {
  const { user, recovery } = useAuth();
  if (user && recovery) return <NovaSenha/>;
  return user ? <AppInterno/> : <Login/>;
}

export default function App() {
  return <AuthProvider><Root/></AuthProvider>;
}
