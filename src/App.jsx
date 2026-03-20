import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
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

function UserHeader({ nomeUsuario, entries }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = new Date().toISOString().slice(0,10);
  const todayEntry = entries[today];
  const totalHoje = todayEntry ? (todayEntry.totalB3||0)+(todayEntry.totalForex||0) : null;
  const inicial = nomeUsuario ? nomeUsuario[0].toUpperCase() : "U";

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const EMOCAO_COLORS = {"Focado":"#00d4aa","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626"};

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
      <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:"8px",background:open?"rgba(0,212,170,0.08)":"rgba(255,255,255,0.04)",border:"1px solid "+(open?"#00d4aa44":"#1e1e2e"),borderRadius:"10px",padding:"7px 12px",cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all 0.2s"}}>
        <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,#00d4aa22,#0099ff22)",border:"1px solid #00d4aa44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",fontWeight:"700",color:"#00d4aa",flexShrink:0}}>{inicial}</div>
        <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600"}}>{nomeUsuario||"Trader"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 10px)",right:0,background:"#0f0f18",border:"1px solid #1e1e2e",borderRadius:"20px",padding:"0",zIndex:300,width:"300px",boxShadow:"0 24px 60px rgba(0,0,0,0.8)",overflow:"hidden"}}>
          
          {/* Header */}
          <div style={{padding:"20px 20px 16px",borderBottom:"1px solid #1a1a2e"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{today.split("-").reverse().join(" de ").replace(/(\d+) de (\d+) de (\d+)/,(_,d,m,y)=>{const meses=["","janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];return `${d} de ${meses[parseInt(m)]}, ${["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"][new Date(today).getDay()]}`})}</p>
              <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:"#444",cursor:"pointer",fontSize:"18px",padding:"0",lineHeight:1}}>×</button>
            </div>

            {/* Stats topo */}
            {todayEntry ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                <div style={{background:"#1a1a2e",borderRadius:"10px",padding:"12px"}}>
                  <p style={{margin:"0 0 2px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos do dia</p>
                  <p style={{margin:0,color:totalPts>=0?"#00d4aa":"#ff4d4d",fontSize:"20px",fontWeight:"800",fontFamily:"monospace"}}>{totalPts>=0?"+":""}{totalPts} pts</p>
                </div>
                <div style={{background:"#1a1a2e",borderRadius:"10px",padding:"12px"}}>
                  <p style={{margin:"0 0 2px",color:"#555",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado R$</p>
                  <p style={{margin:0,color:totalHoje>=0?"#00d4aa":"#ff4d4d",fontSize:"20px",fontWeight:"800",fontFamily:"monospace"}}>{totalHoje>=0?"R$ +":"R$ "}{Math.abs(totalHoje).toLocaleString("pt-BR",{minimumFractionDigits:0})}</p>
                </div>
              </div>
            ) : null}

            {/* Trades + exec */}
            {todayEntry && (
              <div style={{display:"flex",gap:"8px"}}>
                <span style={{background:"#1a1a2e",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#aaa",fontWeight:"600"}}>{trades.length} trades</span>
                {execPct!==null&&wins===trades.length&&<span style={{background:"rgba(0,212,170,0.1)",border:"1px solid #00d4aa33",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#00d4aa",fontWeight:"600"}}>WIN ({wins})</span>}
                {execPct!==null&&<span style={{background:"rgba(0,212,170,0.08)",borderRadius:"20px",padding:"5px 12px",fontSize:"12px",color:"#00d4aa",fontWeight:"600"}}>● {execPct}% exec.</span>}
              </div>
            )}
          </div>

          {/* Emoção predominante */}
          {emocaoPred && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 8px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoção Predominante</p>
              <div style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:"10px",padding:"10px 14px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"18px"}}>🎯</span>
                <span style={{color:"#c4b5fd",fontSize:"14px",fontWeight:"700"}}>{emocaoPred}</span>
              </div>
            </div>
          )}

          {/* Estratégias */}
          {estratUsadas.length > 0 && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 8px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Estratégias Utilizadas</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {estratUsadas.map(e=>(
                  <div key={e} style={{background:"#1a1a2e",borderRadius:"8px",padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:"#ccc",fontSize:"13px",fontWeight:"600"}}>{e.slice(0,2).toUpperCase()} — {e}</span>
                    <span style={{color:"#555",fontSize:"12px"}}>({estratCount[e]})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emoções */}
          {todayEntry?.emocoes?.length > 0 && (
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1a1a2e"}}>
              <p style={{margin:"0 0 8px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções Registradas</p>
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
              <p style={{margin:"0 0 10px",color:"#444",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações ({trades.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"200px",overflowY:"auto"}}>
                {trades.map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#1a1a2e",borderRadius:"8px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                      <span style={{color:"#666",fontSize:"11px"}}>#{i+1}</span>
                      <span style={{padding:"2px 6px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"rgba(0,212,170,0.15)":"rgba(255,77,77,0.15)",color:t.tipo==="WIN"?"#00d4aa":"#ff4d4d"}}>{t.tipo}</span>
                      {t.estrategia&&<span style={{padding:"2px 7px",borderRadius:"4px",background:"rgba(0,153,255,0.15)",color:"#0099ff",fontSize:"11px",fontWeight:"600"}}>{t.estrategia.slice(0,2).toUpperCase()}</span>}
                      {t.mercado&&<span style={{color:"#555",fontSize:"11px"}}>{t.mercado==="B3"?"Venda":"Forex"}</span>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      {t.pontos!=null&&<p style={{margin:0,color:"#aaa",fontSize:"12px",fontFamily:"monospace"}}>{t.pontos>=0?"+":""}{t.pontos} pts</p>}
                      {t.resultado!=null&&<p style={{margin:0,color:t.resultado>=0?"#00d4aa":"#ff4d4d",fontSize:"12px",fontFamily:"monospace",fontWeight:"700"}}>R$ {t.resultado>=0?"+":""}{t.resultado}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!todayEntry && (
            <div style={{padding:"30px 20px",textAlign:"center",color:"#333",fontSize:"13px"}}>
              Nenhum registro hoje ainda.
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
      if(id){
        const estrategiaAntiga = estrategias.find(e=>e.id===id);
        const nomeAntigo = estrategiaAntiga?.nome;
        const nomeNovo = data.nome;
        await updateDoc(doc(db,"usuarios",uid,"estrategias",id),data);
        setEstrategias(p=>p.map(e=>e.id===id?{id,...data}:e));
        // Se nome mudou, atualiza todos os trades no diário (onSnapshot cuida do re-render)
        if(nomeAntigo && nomeNovo && nomeAntigo !== nomeNovo) {
          const entradasParaAtualizar = Object.entries(entries).filter(([,e])=>
            (e.trades||[]).some(t=>t.estrategia===nomeAntigo)
          );
          for(const [dateKey, entry] of entradasParaAtualizar) {
            const tradesAtualizados = entry.trades.map(t=>
              t.estrategia===nomeAntigo ? {...t, estrategia:nomeNovo} : t
            );
            await setDoc(doc(db,"usuarios",uid,"diario",dateKey), {...entry, trades:tradesAtualizados});
          }
        }
      } else {
        const r=await addDoc(collection(db,"usuarios",uid,"estrategias"),data);
        setEstrategias(p=>[...p,{id:r.id,...data}]);
      }
    }catch(e){console.error(e);}
  };
  const deleteEstrategia = async id => {
    try{ await deleteDoc(doc(db,"usuarios",uid,"estrategias",id)); setEstrategias(p=>p.filter(e=>e.id!==id)); }catch(e){console.error(e);}
  };

  const TITLES = {evolucao:"Evolução",diario:"Diário",historico:"Histórico",banca:"Banca",regras:"Disciplina",estrategias:"Estratégias",crescimento:"Crescimento",patrimonio:"Patrimônio",config:"Configurações"};

  const renderPage = () => {
    switch(pagina){
      case "evolucao":    return <Evolucao entries={entries} compliance={compliance} estrategias={estrategias}/>;
      case "diario":      return <Diario entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry} estrategias={estrategias}/>;
      case "historico":   return <Historico entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry}/>;
      case "estrategias": return <Estrategias estrategias={estrategias} saveEstrategia={saveEstrategia} deleteEstrategia={deleteEstrategia}/>;
      case "banca":       return <Suspense fallback={<Spinner/>}><Banca entries={entries} config={config} saveConfig={saveConfig}/></Suspense>;
      case "regras":      return <Suspense fallback={<Spinner/>}><Regras regras={regras} saveRegras={saveRegras} compliance={compliance} saveCompliance={saveComplianceData} entries={entries}/></Suspense>;
      case "crescimento": return <Suspense fallback={<Spinner/>}><Crescimento entries={entries} config={config}/></Suspense>;
      case "patrimonio":  return <Suspense fallback={<Spinner/>}><Patrimonio entries={entries} config={config}/></Suspense>;
      case "config":      return <Suspense fallback={<Spinner/>}><Config config={config} saveConfig={saveConfig} nomeUsuario={nomeUsuario}/></Suspense>;
      default:            return <Evolucao entries={entries}/>;
    }
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <p style={{color:"#444",fontSize:"14px"}}>Carregando...</p>
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#0d0d1a",fontFamily:"Inter,sans-serif"}}>
      {(!isMobile||sidebarOpen)&&<Sidebar pagina={pagina} setPagina={p=>{setPagina(p);setSidebarOpen(false);}} nomeUsuario={nomeUsuario} mobile={isMobile} onClose={()=>setSidebarOpen(false)} compliance={compliance}/>}
      <main style={{marginLeft:isMobile?"0":"240px",flex:1,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,8,16,0.95)",backdropFilter:"blur(10px)",borderBottom:"1px solid #1a1a2e",padding:isMobile?"10px 14px":"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {isMobile&&<button onClick={()=>setSidebarOpen(true)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",width:"36px",height:"36px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#888",flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
            <div style={{width:"28px",height:"28px",borderRadius:"6px",background:"rgba(0,212,170,0.1)",border:"1px solid #00d4aa33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:"#00d4aa",fontSize:"11px",fontWeight:"800"}}>{pagina.slice(0,2).toUpperCase()}</span>
            </div>
            <h2 style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{TITLES[pagina]||pagina}</h2>
          </div>
          <UserHeader nomeUsuario={nomeUsuario} entries={entries}/>
        </div>
        <div style={{flex:1,padding:isMobile?"16px 12px":"28px 24px",maxWidth:"1200px",width:"100%",boxSizing:"border-box"}}>
          {renderPage()}
        </div>
      </main>
      <style>{`*{-webkit-tap-highlight-color:transparent}body{margin:0;background:#0d0d1a}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0d0d14}::-webkit-scrollbar-thumb{background:#1e1e2e;border-radius:3px}`}</style>
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
