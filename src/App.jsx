import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login      from "./pages/Login";
import Dashboard  from "./pages/Dashboard";
import Diario     from "./pages/Diario";
import Banca      from "./pages/Banca";
import Regras     from "./pages/Regras";
import Estrategias from "./pages/Estrategias";
import Crescimento from "./pages/Crescimento";
import Patrimonio  from "./pages/Patrimonio";
import Parciais    from "./pages/Parciais";
import Config      from "./pages/Config";
import Sidebar     from "./components/Sidebar";

// ─── APP INTERNO (autenticado) ───────────────────────────────
function AppInterno() {
  const { user } = useAuth();
  const [pagina,      setPagina]      = useState("dashboard");
  const [entries,     setEntries]     = useState({});
  const [config,      setConfigState] = useState({ bancaB3: 3000, bancaForex: 200 });
  const [compliance,  setCompliance]  = useState({});
  const [estrategias, setEstrategias] = useState([]);
  const [regras,      setRegras]      = useState([]);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [loading,     setLoading]     = useState(true);

  const uid = user.uid;

  // ── Carregar dados do usuario ──────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Config e nome
        const userDoc = await getDoc(doc(db, "usuarios", uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setNomeUsuario(data.nome || "");
          if (data.config) setConfigState(data.config);
          if (data.compliance) setCompliance(data.compliance);
        }
        // Diario
        const diarioSnap = await getDocs(collection(db, "usuarios", uid, "diario"));
        const dias = {};
        diarioSnap.forEach(d => { dias[d.id] = d.data(); });
        setEntries(dias);
        // Regras
        if (userDoc.exists() && userDoc.data().regras) setRegras(userDoc.data().regras);
        // Estrategias
        const estSnap = await getDocs(collection(db, "usuarios", uid, "estrategias"));
        const ests = [];
        estSnap.forEach(d => ests.push({id:d.id,...d.data()}));
        setEstrategias(ests);
      } catch(e) { console.error("Erro ao carregar dados:", e); }
      setLoading(false);
    }
    load();
  }, [uid]);

  // ── Escutar mudancas em tempo real no diario ───────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios", uid, "diario"), snap => {
      const dias = {};
      snap.forEach(d => { dias[d.id] = d.data(); });
      setEntries(dias);
    });
    return unsub;
  }, [uid]);

  // ── CRUD Diario ────────────────────────────────────────────
  async function saveEntry(dateKey, data) {
    await setDoc(doc(db, "usuarios", uid, "diario", dateKey), data);
  }

  async function deleteEntry(dateKey) {
    await deleteDoc(doc(db, "usuarios", uid, "diario", dateKey));
  }

  // ── Config / Banca ────────────────────────────────────────
  async function saveConfig(newConfig) {
    setConfigState(newConfig);
    await updateDoc(doc(db, "usuarios", uid), { config: newConfig });
  }

  // ── Compliance ────────────────────────────────────────────
  async function saveComplianceData(updated) {
    setCompliance(updated);
    await updateDoc(doc(db, "usuarios", uid), { compliance: updated });
  }

  // ── Regras ───────────────────────────────────────────────
  async function saveRegras(novas) {
    setRegras(novas);
    await updateDoc(doc(db, "usuarios", uid), { regras: novas });
  }

  // ── CRUD Estrategias ──────────────────────────────────────
  async function saveEstrategia(id, data) {
    if (id) {
      await updateDoc(doc(db, "usuarios", uid, "estrategias", id), data);
      setEstrategias(prev => prev.map(e => e.id===id ? {id,...data} : e));
    } else {
      const ref = await addDoc(collection(db, "usuarios", uid, "estrategias"), data);
      setEstrategias(prev => [...prev, {id:ref.id,...data}]);
    }
  }

  async function deleteEstrategia(id) {
    await deleteDoc(doc(db, "usuarios", uid, "estrategias", id));
    setEstrategias(prev => prev.filter(e => e.id !== id));
  }

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4aa,#0099ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", margin:"0 auto 16px" }}>⚡</div>
          <p style={{ color:"#555", fontSize:"14px" }}>Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const PAGINAS = {
    dashboard:   <Dashboard    entries={entries} config={config} setPagina={setPagina}/>,
    diario:      <Diario       entries={entries} saveEntry={saveEntry} deleteEntry={deleteEntry}/>,
    banca:       <Banca        entries={entries} config={config} saveConfig={saveConfig}/>,
    regras:      <Regras       regras={regras} saveRegras={saveRegras} compliance={compliance} saveCompliance={saveComplianceData}/>,
    estrategias: <Estrategias  estrategias={estrategias} saveEstrategia={saveEstrategia} deleteEstrategia={deleteEstrategia}/>,
    crescimento: <Crescimento  entries={entries} config={config}/>,
    patrimonio:  <Patrimonio   entries={entries} config={config}/>,
    parciais:    <Parciais     config={config}/>,
    config:      <Config       config={config} saveConfig={saveConfig} nomeUsuario={nomeUsuario}/>,
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#0a0a0f", fontFamily:"Inter,sans-serif" }}>
      <Sidebar pagina={pagina} setPagina={setPagina} nomeUsuario={nomeUsuario}/>
      <main style={{ marginLeft:"220px", flex:1, padding:"32px 28px", maxWidth:"900px" }}>
        {PAGINAS[pagina] || PAGINAS.dashboard}
      </main>
    </div>
  );
}

// ─── RAIZ COM AUTH ───────────────────────────────────────────
function Root() {
  const { user } = useAuth();
  return user ? <AppInterno/> : <Login/>;
}

export default function App() {
  return (
    <AuthProvider>
      <Root/>
    </AuthProvider>
  );
}
