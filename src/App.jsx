import { useState, useEffect, lazy, Suspense } from "react";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme, DARK } from "./context/ThemeContext";
import Login       from "./pages/Login";
import Evolucao    from "./pages/Evolucao";
import Diario      from "./pages/Diario";
import Historico   from "./pages/Historico";
import Estrategias from "./pages/Estrategias";
import Sidebar     from "./components/Sidebar";

const Banca       = lazy(()=>import("./pages/Banca"));
const Regras      = lazy(()=>import("./pages/Regras"));
const Crescimento = lazy(()=>import("./pages/Crescimento"));
const Patrimonio  = lazy(()=>import("./pages/Patrimonio"));
const Config      = lazy(()=>import("./pages/Config"));

function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"200px"}}>
      <div style={{width:"28px",height:"28px",border:"3px solid #1a1a2e",borderTop:"3px solid #00d4aa",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme.name === "dark";
  return (
    <button onClick={toggle} title={isDark?"Modo claro":"Modo escuro"} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"10px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s",flexShrink:0}}>
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0f0f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

function UserHeader({ nomeUsuario, entries }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const todayEntry = entries[today];
  const total = todayEntry ? (todayEntry.totalB3||0)+(todayEntry.totalForex||0) : null;
  const inicial = nomeUsuario ? nomeUsuario[0].toUpperCase() : "U";

  // Weekly stats
  const last7 = Object.entries(entries).filter(([d])=>d<=today).sort(([a],[b])=>b.localeCompare(a)).slice(0,7);
  const weekResult = last7.reduce((s,[,e])=>s+(e.totalB3||0)+(e.totalForex||0),0);
  const weekTrades = last7.reduce((s,[,e])=>s+(e.numTrades||0),0);
  const weekWins   = last7.reduce((s,[,e])=>s+(e.trades||[]).filter(t=>t.tipo==="WIN").length,0);
  const weekWR     = weekTrades>0 ? Math.round((weekWins/weekTrades)*100) : null;

  return (
    <div style={{position:"relative"}}>
      {open && <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>}
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:open?"rgba(0,212,170,0.08)":"rgba(255,255,255,0.04)",border:"1px solid "+(open?"#00d4aa44":"#1e1e2e"),borderRadius:"10px",padding:"7px 12px",cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4aa22,#0099ff22)",border:"1px solid #00d4aa44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#00d4aa",flexShrink:0}}>{inicial}</div>
        <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600"}}>{nomeUsuario||"Trader"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,background:"#0d0d14",border:"1px solid #1e1e2e",borderRadius:"18px",padding:"20px",zIndex:300,minWidth:"260px",boxShadow:"0 24px 48px rgba(0,0,0,0.7)"}}>
          {/* User info */}
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"16px",paddingBottom:"16px",borderBottom:"1px solid #1a1a2e"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4aa33,#0099ff33)",border:"1px solid #00d4aa44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:"800",color:"#00d4aa"}}>{inicial}</div>
            <div>
              <p style={{margin:"0 0 2px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>{nomeUsuario||"Trader"}</p>
              <p style={{margin:0,color:"#00d4aa",fontSize:"11px",fontWeight:"600"}}>● Online</p>
            </div>
          </div>

          {/* Hoje */}
          <p style={{margin:"0 0 10px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px"}}>Hoje</p>
          {total !== null ? (
            <div style={{marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{color:"#888",fontSize:"13px"}}>Resultado</span><span style={{color:total>=0?"#00d4aa":"#ff4d4d",fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{total>=0?"+":""}R$ {Math.abs(total).toFixed(2)}</span></div>
              {todayEntry.totalPts!==undefined&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{color:"#888",fontSize:"13px"}}>Pontos</span><span style={{color:todayEntry.totalPts>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{todayEntry.totalPts>=0?"+":""}{todayEntry.totalPts} pts</span></div>}
              {todayEntry.winRate!==undefined&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{color:"#888",fontSize:"13px"}}>Win Rate</span><span style={{color:todayEntry.winRate>=60?"#00d4aa":todayEntry.winRate>=40?"#f59e0b":"#ff4d4d",fontSize:"13px",fontWeight:"700"}}>{todayEntry.winRate}%</span></div>}
              {todayEntry.numTrades&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#888",fontSize:"13px"}}>Trades</span><span style={{color:"#ccc",fontSize:"13px",fontWeight:"700"}}>{todayEntry.numTrades}</span></div>}
            </div>
          ) : <p style={{color:"#333",fontSize:"13px",margin:"0 0 16px"}}>Nenhum registro hoje ainda.</p>}

          {/* Últimos 7 dias */}
          {weekTrades>0&&(
            <div style={{paddingTop:"14px",borderTop:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 10px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1.5px"}}>Últimos 7 dias</p>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{color:"#888",fontSize:"13px"}}>Resultado</span><span style={{color:weekResult>=0?"#00d4aa":"#ff4d4d",fontSize:"13px",fontWeight:"700",fontFamily:"monospace"}}>{weekResult>=0?"+":""}R$ {Math.abs(weekResult).toFixed(2)}</span></div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{color:"#888",fontSize:"13px"}}>Trades</span><span style={{color:"#ccc",fontSize:"13px",fontWeight:"700"}}>{weekTrades}</span></div>
              {weekWR!==null&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#888",fontSize:"13px"}}>Win Rate</span><span style={{color:weekWR>=60?"#00d4aa":weekWR>=40?"#f59e0b":"#ff4d4d",fontSize:"13px",fontWeight:"700"}}>{weekWR}%</span></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AppInterno() {
  const { user } = useAuth();
  const [pagina,      setPagina]      = useState("evolucao");
  const [entries,     setEntries]     = useState({});
  const [config,      setConfigState] = useState({bancaB3:3000,bancaForex:200});
  const [compliance,  setCompliance]  = useState({});
  const [estrategias, setEstrategias] = useState([]);
  const [regras,      setRegras]      = useState([]);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);
  const uid = user.uid;
  const { theme } = useTheme();

  useEffect(()=>{
    const fn = ()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",fn);
    return ()=>window.removeEventListener("resize",fn);
  },[]);

  useEffect(()=>{
    if (!uid) return;
    async function load() {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db,"usuarios",uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNomeUsuario(data.nome||"");
          if (data.config)     setConfigState(data.config);
          if (data.compliance) setCompliance(data.compliance);
          if (data.regras)     setRegras(data.regras);
        } else {
          const nome = user.email?.split("@")[0]||"Trader";
          await setDoc(doc(db,"usuarios",uid),{nome,email:user.email||"",criadoEm:new Date().toISOString(),config:{bancaB3:3000,bancaForex:200}});
          setNomeUsuario(nome);
        }
      } catch(e){ console.error("load user:",e); }
      try {
        const snap = await getDocs(collection(db,"usuarios",uid,"estrategias"));
        const ests=[]; snap.forEach(d=>ests.push({id:d.id,...d.data()}));
        setEstrategias(ests);
      } catch(e){ console.error("load estrategias:",e); }
      setLoading(false);
    }
    load();
  },[uid]);

  useEffect(()=>{
    if (!uid) return;
    const unsub = onSnapshot(
      collection(db,"usuarios",uid,"diario"),
      snap=>{ const d={}; snap.forEach(s=>{d[s.id]=s.data();}); setEntries(d); },
      err=>console.error("diario:",err)
    );
    return ()=>unsub();
  },[uid]);

  const saveEntry      = async (k,d) => { try{await setDoc(doc(db,"usuarios",uid,"diario",k),d);}catch(e){console.error(e);} };
  const deleteEntry    = async k    => { try{await deleteDoc(doc(db,"usuarios",uid,"diario",k));}catch(e){console.error(e);} };
  const saveConfig     = async c    => { setConfigState(c); try{await setDoc(doc(db,"usuarios",uid),{config:c},{merge:true});}catch(e){console.error(e);} };
  const saveComplianceData = async c=>{ setCompliance(c);  try{await setDoc(doc(db,"usuarios",uid),{compliance:c},{merge:true});}catch(e){console.error(e);} };
  const saveRegras     = async r    => { setRegras(r);      try{await setDoc(doc(db,"usuarios",uid),{regras:r},{merge:true});}catch(e){console.error(e);} };

  const saveEstrategia = async (id,data) => {
    try {
      if(id){ await updateDoc(doc(db,"usuarios",uid,"estrategias",id),data); setEstrategias(p=>p.map(e=>e.id===id?{id,...data}:e)); }
      else  { const r=await addDoc(collection(db,"usuarios",uid,"estrategias"),data); setEstrategias(p=>[...p,{id:r.id,...data}]); }
    }catch(e){console.error(e);}
  };
  const deleteEstrategia = async id => {
    try{ await deleteDoc(doc(db,"usuarios",uid,"estrategias",id)); setEstrategias(p=>p.filter(e=>e.id!==id)); }catch(e){console.error(e);}
  };

  const TITLES = {evolucao:"Evolução",diario:"Diário",historico:"Histórico",banca:"Banca",regras:"Regras",estrategias:"Estratégias",crescimento:"Crescimento",patrimonio:"Patrimônio",config:"Configurações"};

  const renderPage = () => {
    switch(pagina){
      case "evolucao":    return <Evolucao entries={entries} compliance={compliance}/>;
      case "diario":      return <Diario entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry} estrategias={estrategias}/>;
      case "historico":   return <Historico entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry}/>;
      case "estrategias": return <Estrategias estrategias={estrategias} saveEstrategia={saveEstrategia} deleteEstrategia={deleteEstrategia}/>;
      case "banca":       return <Suspense fallback={<Spinner/>}><Banca entries={entries} config={config} saveConfig={saveConfig}/></Suspense>;
      case "regras":      return <Suspense fallback={<Spinner/>}><Regras regras={regras} saveRegras={saveRegras} compliance={compliance} saveCompliance={saveComplianceData}/></Suspense>;
      case "crescimento": return <Suspense fallback={<Spinner/>}><Crescimento entries={entries} config={config}/></Suspense>;
      case "patrimonio":  return <Suspense fallback={<Spinner/>}><Patrimonio entries={entries} config={config}/></Suspense>;
      case "config":      return <Suspense fallback={<Spinner/>}><Config config={config} saveConfig={saveConfig} nomeUsuario={nomeUsuario}/></Suspense>;
      default:            return <Evolucao entries={entries}/>;
    }
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <p style={{color:"#444",fontSize:"14px"}}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:theme.bg,fontFamily:"Inter,sans-serif"}}>
      {(!isMobile||sidebarOpen)&&<Sidebar pagina={pagina} setPagina={p=>{setPagina(p);setSidebarOpen(false);}} nomeUsuario={nomeUsuario} mobile={isMobile} onClose={()=>setSidebarOpen(false)} compliance={compliance}/>}
      <main style={{marginLeft:isMobile?"0":"240px",flex:1,minHeight:"100vh",display:"flex",flexDirection:"column",background:theme.bg,transition:"background 0.3s"}}>
        <div style={{position:"sticky",top:0,zIndex:100,background:theme.header,backdropFilter:"blur(10px)",borderBottom:"1px solid "+theme.border,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888",flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
            <div style={{width:"28px",height:"28px",borderRadius:"6px",background:"rgba(0,212,170,0.1)",border:"1px solid #00d4aa33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#00d4aa",fontSize:"11px",fontWeight:"800"}}>{pagina.slice(0,2).toUpperCase()}</span>
            </div>
            <h2 style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{TITLES[pagina]||pagina}</h2>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <ThemeToggle/>
            <UserHeader nomeUsuario={nomeUsuario} entries={entries}/>
          </div>
        </div>
        <div style={{flex:1,padding:"28px 24px",maxWidth:"1000px",width:"100%",boxSizing:"border-box"}}>
          {renderPage()}
        </div>
      </main>
      <style>{`*{-webkit-tap-highlight-color:transparent}body{margin:0;background:#080810}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0d0d14}::-webkit-scrollbar-thumb{background:#1e1e2e;border-radius:3px}`}</style>
    </div>
  );
}

function Root() {
  const { user } = useAuth();
  return user ? <AppInterno/> : <Login/>;
}

export default function App() {
  return <ThemeProvider><AuthProvider><Root/></AuthProvider></ThemeProvider>;
}
