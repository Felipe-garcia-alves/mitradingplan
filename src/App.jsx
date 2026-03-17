import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login       from "./pages/Login";
import Evolucao    from "./pages/Evolucao";
import Diario      from "./pages/Diario";
import Historico   from "./pages/Historico";
import Estrategias from "./pages/Estrategias";
import Sidebar     from "./components/Sidebar";

// ── Lazy-load heavier pages ──────────────────────────────────
import { lazy, Suspense } from "react";
const Banca      = lazy(()=>import("./pages/Banca"));
const Regras     = lazy(()=>import("./pages/Regras"));
const Crescimento= lazy(()=>import("./pages/Crescimento"));
const Patrimonio = lazy(()=>import("./pages/Patrimonio"));
const Config     = lazy(()=>import("./pages/Config"));

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"200px"}}><div style={{width:"32px",height:"32px",border:"3px solid #1a1a2e",borderTop:"3px solid #00d4aa",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div>;
}

// ── User header (top right) ──────────────────────────────────
function UserHeader({ nomeUsuario, entries }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0,10);
  const todayEntry = entries[today];
  const total = todayEntry ? (todayEntry.totalB3||0)+(todayEntry.totalForex||0) : null;
  const inicial = nomeUsuario ? nomeUsuario[0].toUpperCase() : "U";

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"7px 12px",cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4aa22,#0099ff22)",border:"1px solid #00d4aa44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#00d4aa",flexShrink:0}}>
          {inicial}
        </div>
        <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600"}}>{nomeUsuario||"Trader"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:299}}/>
          <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#0d0d14",border:"1px solid #1e1e2e",borderRadius:"14px",padding:"16px",zIndex:300,minWidth:"260px",boxShadow:"0 20px 40px rgba(0,0,0,0.6)"}}>
            <p style={{margin:"0 0 12px",color:"#888",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Resumo de Hoje</p>
            {total !== null ? (
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{color:"#888",fontSize:"13px"}}>Resultado</span>
                  <span style={{color:total>=0?"#00d4aa":"#ff4d4d",fontSize:"15px",fontWeight:"700",fontFamily:"monospace"}}>{total>=0?"+":""}R$ {Math.abs(total).toFixed(2)}</span>
                </div>
                {todayEntry.totalPts!==undefined&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{color:"#888",fontSize:"13px"}}>Pontos</span>
                  <span style={{color:todayEntry.totalPts>=0?"#00d4aa":"#ff4d4d",fontSize:"14px",fontWeight:"700",fontFamily:"monospace"}}>{todayEntry.totalPts>=0?"+":""}{todayEntry.totalPts} pts</span>
                </div>}
                {todayEntry.winRate!==undefined&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{color:"#888",fontSize:"13px"}}>Win Rate</span>
                  <span style={{color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>{todayEntry.winRate}%</span>
                </div>}
                {todayEntry.numTrades&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <span style={{color:"#888",fontSize:"13px"}}>Trades</span>
                  <span style={{color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>{todayEntry.numTrades}</span>
                </div>}
                {todayEntry.emocoes?.length>0&&<div style={{marginTop:"10px",paddingTop:"10px",borderTop:"1px solid #1a1a2e"}}>
                  <p style={{margin:"0 0 6px",color:"#888",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                    {todayEntry.emocoes.map(em=><span key={em} style={{padding:"2px 8px",borderRadius:"12px",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:"11px"}}>{em}</span>)}
                  </div>
                </div>}
              </div>
            ) : (
              <p style={{color:"#666",fontSize:"13px",margin:0}}>Nenhum registro hoje ainda.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── App autenticado ──────────────────────────────────────────
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

  useEffect(()=>{
    const handleResize = ()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",handleResize);
    return ()=>window.removeEventListener("resize",handleResize);
  },[]);

  useEffect(()=>{
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
        }
        const estSnap = await getDocs(collection(db,"usuarios",uid,"estrategias"));
        const ests=[]; estSnap.forEach(d=>ests.push({id:d.id,...d.data()}));
        setEstrategias(ests);
      } catch(e){ console.error(e); }
      setLoading(false);
    }
    load();
  },[uid]);

  useEffect(()=>{
    const unsub = onSnapshot(collection(db,"usuarios",uid,"diario"), snap=>{
      const dias={}; snap.forEach(d=>{dias[d.id]=d.data();}); setEntries(dias);
    });
    return unsub;
  },[uid]);

  async function saveEntry(dateKey, data) {
    await setDoc(doc(db,"usuarios",uid,"diario",dateKey), data);
  }
  async function deleteEntry(dateKey) {
    await deleteDoc(doc(db,"usuarios",uid,"diario",dateKey));
  }
  async function saveConfig(newConfig) {
    setConfigState(newConfig);
    await updateDoc(doc(db,"usuarios",uid),{config:newConfig});
  }
  async function saveComplianceData(updated) {
    setCompliance(updated);
    await updateDoc(doc(db,"usuarios",uid),{compliance:updated});
  }
  async function saveRegras(novas) {
    setRegras(novas);
    await updateDoc(doc(db,"usuarios",uid),{regras:novas});
  }
  async function saveEstrategia(id, data) {
    if (id) {
      await updateDoc(doc(db,"usuarios",uid,"estrategias",id),data);
      setEstrategias(prev=>prev.map(e=>e.id===id?{id,...data}:e));
    } else {
      const ref = await addDoc(collection(db,"usuarios",uid,"estrategias"),data);
      setEstrategias(prev=>[...prev,{id:ref.id,...data}]);
    }
  }
  async function deleteEstrategia(id) {
    await deleteDoc(doc(db,"usuarios",uid,"estrategias",id));
    setEstrategias(prev=>prev.filter(e=>e.id!==id));
  }

  const PAGE_TITLES = {evolucao:"Evolução",diario:"Diário",historico:"Histórico",banca:"Banca",regras:"Regras",estrategias:"Estratégias",crescimento:"Crescimento",patrimonio:"Patrimônio",config:"Configurações"};

  const renderPage = () => {
    switch(pagina) {
      case "evolucao":    return <Evolucao entries={entries}/>;
      case "diario":      return <Diario entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry}/>;
      case "historico":   return <Historico entries={entries}/>;
      case "estrategias": return <Estrategias estrategias={estrategias} saveEstrategia={saveEstrategia} deleteEstrategia={deleteEstrategia}/>;
      case "banca":       return <Suspense fallback={<Spinner/>}><Banca entries={entries} config={config} saveConfig={saveConfig}/></Suspense>;
      case "regras":      return <Suspense fallback={<Spinner/>}><Regras regras={regras} saveRegras={saveRegras} compliance={compliance} saveCompliance={saveComplianceData}/></Suspense>;
      case "crescimento": return <Suspense fallback={<Spinner/>}><Crescimento entries={entries} config={config}/></Suspense>;
      case "patrimonio":  return <Suspense fallback={<Spinner/>}><Patrimonio entries={entries} config={config}/></Suspense>;
      case "config":      return <Suspense fallback={<Spinner/>}><Config config={config} saveConfig={saveConfig} nomeUsuario={nomeUsuario}/></Suspense>;
      default:            return <Evolucao entries={entries}/>;
    }
  };

  if (loading) {
    return (
      <div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <p style={{color:"#888",fontSize:"14px"}}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#080810",fontFamily:"Inter,sans-serif"}}>
      {/* Sidebar — desktop sempre visível, mobile só quando open */}
      {(!isMobile || sidebarOpen) && (
        <Sidebar pagina={pagina} setPagina={p=>{setPagina(p);setSidebarOpen(false);}} nomeUsuario={nomeUsuario} mobile={isMobile} onClose={()=>setSidebarOpen(false)}/>
      )}

      {/* Main content */}
      <main style={{marginLeft:isMobile?"0":"240px",flex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        {/* Top bar */}
        <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #1a1a2e",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {isMobile && (
              <button onClick={()=>setSidebarOpen(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <div style={{width:"28px",height:"28px",borderRadius:"6px",background:"linear-gradient(135deg,#00d4aa22,transparent)",border:"1px solid #00d4aa33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#00d4aa",fontSize:"11px",fontWeight:"800"}}>{pagina.slice(0,2).toUpperCase()}</span>
            </div>
            <h2 style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{PAGE_TITLES[pagina]||pagina}</h2>
          </div>
          <UserHeader nomeUsuario={nomeUsuario} entries={entries}/>
        </div>

        {/* Page content */}
        <div style={{flex:1,padding:"28px 24px",maxWidth:"1000px",width:"100%",boxSizing:"border-box"}}>
          {renderPage()}
        </div>
      </main>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: #080810; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d0d14; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
      `}</style>
    </div>
  );
}

function Root() {
  const { user } = useAuth();
  return user ? <AppInterno/> : <Login/>;
}

export default function App() {
  return <AuthProvider><Root/></AuthProvider>;
}
