import { useState } from "react";

const CATEGORIAS = ["Price Action","Tendencia","Reversao","Breakout","Scalping","Swing","Outra"];

export default function Estrategias({ estrategias, saveEstrategia, deleteEstrategia }) {
  const [modo,     setModo]     = useState("lista"); // lista | nova | editar
  const [editId,   setEditId]   = useState(null);
  const [filtro,   setFiltro]   = useState("Todas");
  const [form,     setForm]     = useState({ nome:"", categoria:"Price Action", descricao:"", regrasEntrada:"", regrasesSaida:"", timeframe:"", mercado:"B3", ativo:true });
  const [msg,      setMsg]      = useState("");

  function novaForm() { setForm({ nome:"", categoria:"Price Action", descricao:"", regrasEntrada:"", regrasesSaida:"", timeframe:"", mercado:"B3", ativo:true }); setEditId(null); setModo("nova"); }
  function editarForm(e) { setForm({...e}); setEditId(e.id); setModo("editar"); }

  async function handleSave() {
    if (!form.nome.trim()) { setMsg("❌ Digite o nome da estrategia."); return; }
    const data = { ...form, atualizadoEm: new Date().toISOString() };
    if (!editId) data.criadoEm = new Date().toISOString();
    await saveEstrategia(editId, data);
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2500);
    setModo("lista");
  }

  async function handleDelete(id) {
    if (window.confirm("Excluir esta estrategia?")) await deleteEstrategia(id);
  }

  const lista = (estrategias||[]).filter(e => filtro==="Todas" || e.categoria===filtro);
  const inp   = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };
  const catColors = { "Price Action":"#00d4aa","Tendencia":"#0099ff","Reversao":"#f59e0b","Breakout":"#a78bfa","Scalping":"#f87171","Swing":"#34d399","Outra":"#9ca3af" };

  if (modo === "nova" || modo === "editar") {
    return (
      <div style={{ fontFamily:"Inter,sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"24px" }}>
          <button onClick={()=>setModo("lista")} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"8px 14px", color:"#888", fontSize:"12px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>← Voltar</button>
          <h1 style={{ margin:0, fontSize:"20px", fontWeight:"800", color:"#f0f0f0" }}>{modo==="nova"?"Nova Estrategia":"Editar Estrategia"}</h1>
        </div>

        <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"24px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"14px" }}>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Nome da estrategia *</label>
              <input style={inp} placeholder="Ex: Rompimento de Maxima" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
            </div>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Categoria</label>
              <select style={{ ...inp, appearance:"none" }} value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
                {CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Mercado</label>
              <select style={{ ...inp, appearance:"none" }} value={form.mercado} onChange={e=>setForm(f=>({...f,mercado:e.target.value}))}>
                <option value="B3">🇧🇷 Mini Indice B3</option>
                <option value="Forex">🌍 Forex</option>
                <option value="Ambos">Ambos</option>
              </select>
            </div>
            <div>
              <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Timeframe</label>
              <input style={inp} placeholder="Ex: M5, M15, H1..." value={form.timeframe} onChange={e=>setForm(f=>({...f,timeframe:e.target.value}))}/>
            </div>
          </div>

          <div style={{ marginBottom:"14px" }}>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Descricao geral</label>
            <textarea style={{ ...inp, resize:"vertical", lineHeight:"1.6", minHeight:"70px" }} placeholder="Descreva a logica da estrategia..." value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} rows={3}/>
          </div>

          <div style={{ marginBottom:"14px" }}>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>📌 Regras de entrada</label>
            <textarea style={{ ...inp, resize:"vertical", lineHeight:"1.6", minHeight:"80px" }} placeholder="Quais condicoes precisam ser atendidas para entrar na operacao?" value={form.regrasEntrada} onChange={e=>setForm(f=>({...f,regrasEntrada:e.target.value}))} rows={4}/>
          </div>

          <div style={{ marginBottom:"20px" }}>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🚪 Regras de saida / Stop / Alvo</label>
            <textarea style={{ ...inp, resize:"vertical", lineHeight:"1.6", minHeight:"80px" }} placeholder="Onde colocar o stop? Qual o alvo? Quando sair parcialmente?" value={form.regrasesSaida} onChange={e=>setForm(f=>({...f,regrasesSaida:e.target.value}))} rows={4}/>
          </div>

          <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
            <button onClick={handleSave} style={{ background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
              💾 Salvar estrategia
            </button>
            <button onClick={()=>setModo("lista")} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"11px 18px", color:"#777", fontSize:"13px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>Cancelar</button>
            {msg && <span style={{ color:msg.includes("✓")?"#00d4aa":"#ff6b6b", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", flexWrap:"wrap", gap:"10px" }}>
        <div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Estrategias</h1>
          <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Documente e organize seus setups operacionais</p>
        </div>
        <button onClick={novaForm} style={{ background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", border:"none", borderRadius:"10px", padding:"10px 18px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
          + Nova estrategia
        </button>
      </div>

      {/* Filtro categorias */}
      <div style={{ display:"flex", gap:"6px", marginBottom:"20px", flexWrap:"wrap" }}>
        {["Todas",...CATEGORIAS].map(c => (
          <button key={c} onClick={()=>setFiltro(c)} style={{ padding:"5px 14px", borderRadius:"20px", border:"none", cursor:"pointer", fontWeight:"600", fontSize:"12px", background:filtro===c?(catColors[c]||"#00d4aa"):"rgba(255,255,255,0.05)", color:filtro===c?"#000":"#666", fontFamily:"Inter,sans-serif" }}>
            {c}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px" }}>
          <p style={{ fontSize:"32px", marginBottom:"12px" }}>🎯</p>
          <p style={{ color:"#777", fontSize:"14px", margin:"0 0 8px" }}>Nenhuma estrategia cadastrada ainda.</p>
          <p style={{ color:"#444", fontSize:"12px", margin:0 }}>Clique em "Nova estrategia" para comecar a documentar seus setups.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
          {lista.map(est => (
            <div key={est.id} style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"20px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, width:"3px", bottom:0, background:catColors[est.categoria]||"#00d4aa", borderRadius:"14px 0 0 14px" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px", flexWrap:"wrap", gap:"8px" }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px", flexWrap:"wrap" }}>
                    <h3 style={{ margin:0, color:"#f0f0f0", fontSize:"15px", fontWeight:"700" }}>{est.nome}</h3>
                    <span style={{ background:(catColors[est.categoria]||"#00d4aa")+"22", color:catColors[est.categoria]||"#00d4aa", fontSize:"11px", fontWeight:"600", padding:"2px 8px", borderRadius:"20px" }}>{est.categoria}</span>
                    <span style={{ color:"#555", fontSize:"11px" }}>{est.mercado} {est.timeframe && "· "+est.timeframe}</span>
                  </div>
                  {est.descricao && <p style={{ margin:0, color:"#888", fontSize:"13px", lineHeight:"1.5" }}>{est.descricao}</p>}
                </div>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={()=>editarForm(est)} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"8px", padding:"6px 12px", color:"#888", fontSize:"12px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>✏️ Editar</button>
                  <button onClick={()=>handleDelete(est.id)} style={{ background:"rgba(255,77,77,0.06)", border:"1px solid #ff4d4d22", borderRadius:"8px", padding:"6px 12px", color:"#ff6b6b", fontSize:"12px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>✕</button>
                </div>
              </div>
              {(est.regrasEntrada || est.regrasesSaida) && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  {est.regrasEntrada && (
                    <div style={{ background:"rgba(0,212,170,0.05)", borderRadius:"10px", padding:"12px" }}>
                      <p style={{ margin:"0 0 6px", color:"#00d4aa", fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>📌 Entrada</p>
                      <p style={{ margin:0, color:"#bbb", fontSize:"12px", lineHeight:"1.6", whiteSpace:"pre-wrap" }}>{est.regrasEntrada}</p>
                    </div>
                  )}
                  {est.regrasesSaida && (
                    <div style={{ background:"rgba(255,77,77,0.05)", borderRadius:"10px", padding:"12px" }}>
                      <p style={{ margin:"0 0 6px", color:"#ff6b6b", fontSize:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" }}>🚪 Saida / Stop / Alvo</p>
                      <p style={{ margin:0, color:"#bbb", fontSize:"12px", lineHeight:"1.6", whiteSpace:"pre-wrap" }}>{est.regrasesSaida}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
