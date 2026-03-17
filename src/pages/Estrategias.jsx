import { useState } from "react";

export default function Estrategias({ estrategias, saveEstrategia, deleteEstrategia }) {
  const [modo,  setModo]  = useState("lista");
  const [editId,setEditId]= useState(null);
  const [form,  setForm]  = useState({nome:"",descricao:"",regrasEntrada:"",regrasesSaida:"",timeframe:"",mercado:"B3"});
  const [msg,   setMsg]   = useState("");

  function novaForm() { setForm({nome:"",descricao:"",regrasEntrada:"",regrasesSaida:"",timeframe:"",mercado:"B3"}); setEditId(null); setModo("form"); }
  function editarForm(e) { setForm({nome:e.nome||"",descricao:e.descricao||"",regrasEntrada:e.regrasEntrada||"",regrasesSaida:e.regrasesSaida||"",timeframe:e.timeframe||"",mercado:e.mercado||"B3"}); setEditId(e.id); setModo("form"); }

  async function salvar() {
    if (!form.nome.trim()) { setMsg("Digite o nome da estratégia."); return; }
    const data = {...form, atualizadoEm: new Date().toISOString()};
    if (!editId) data.criadoEm = new Date().toISOString();
    await saveEstrategia(editId, data);
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2500);
    setModo("lista");
  }

  async function excluir(id) {
    if (window.confirm("Excluir esta estratégia?")) await deleteEstrategia(id);
  }

  const inp = {width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"11px 13px",color:"#f0f0f0",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"Inter,sans-serif"};

  if (modo === "form") {
    return (
      <div style={{fontFamily:"Inter,sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setModo("lista")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"8px 14px",color:"#777",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Voltar</button>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#f0f0f0"}}>{editId?"Editar Estratégia":"Nova Estratégia"}</h1>
        </div>
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
            <div>
              <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Nome da estratégia *</label>
              <input style={inp} placeholder="Ex: Rompimento de Máxima" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/>
            </div>
            <div>
              <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Mercado</label>
              <select style={{...inp,appearance:"none"}} value={form.mercado} onChange={e=>setForm(p=>({...p,mercado:e.target.value}))}>
                <option value="B3">Mini Índice B3</option>
                <option value="Forex">Forex</option>
                <option value="Ambos">Ambos</option>
              </select>
            </div>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Timeframe</label>
            <input style={{...inp}} placeholder="Ex: M5, M15, H1..." value={form.timeframe} onChange={e=>setForm(p=>({...p,timeframe:e.target.value}))}/>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Descrição geral</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"70px"}} placeholder="Descreva a lógica da estratégia..." value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} rows={3}/>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Regras de entrada</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Quais condições precisam ser atendidas para entrar?" value={form.regrasEntrada} onChange={e=>setForm(p=>({...p,regrasEntrada:e.target.value}))} rows={4}/>
          </div>
          <div style={{marginBottom:"20px"}}>
            <label style={{color:"#444",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Regras de saída / Stop / Alvo</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Onde colocar o stop? Qual o alvo? Quando sair?" value={form.regrasesSaida} onChange={e=>setForm(p=>({...p,regrasesSaida:e.target.value}))} rows={4}/>
          </div>
          <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
            <button onClick={salvar} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar estratégia</button>
            <button onClick={()=>setModo("lista")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"10px",padding:"11px 18px",color:"#777",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Cancelar</button>
            {msg && <span style={{color:msg.includes("✓")?"#00d4aa":"#ff6b6b",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"Inter,sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>Estratégias</h1>
          <p style={{margin:0,color:"#444",fontSize:"13px"}}>Documente e organize seus setups operacionais</p>
        </div>
        <button onClick={novaForm} style={{background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",border:"none",borderRadius:"10px",padding:"10px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>
          + Nova estratégia
        </button>
      </div>

      {(estrategias||[]).length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a2a3a" strokeWidth="1.5" style={{margin:"0 auto 14px",display:"block"}}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <p style={{color:"#444",fontSize:"14px",margin:"0 0 6px"}}>Nenhuma estratégia cadastrada.</p>
          <p style={{color:"#2a2a3a",fontSize:"12px",margin:0}}>Clique em "Nova estratégia" para começar.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {(estrategias||[]).map((est,i) => (
            <div key={est.id} style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"20px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,width:"3px",bottom:0,background:"#00d4aa",borderRadius:"14px 0 0 14px"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px",flexWrap:"wrap"}}>
                    <h3 style={{margin:0,color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>{est.nome}</h3>
                    <span style={{color:"#444",fontSize:"12px"}}>{est.mercado} {est.timeframe&&"· "+est.timeframe}</span>
                  </div>
                  {est.descricao&&<p style={{margin:0,color:"#555",fontSize:"13px",lineHeight:"1.5"}}>{est.descricao}</p>}
                </div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>editarForm(est)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1e1e2e",borderRadius:"8px",padding:"6px 12px",color:"#777",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Editar</button>
                  <button onClick={()=>excluir(est.id)} style={{background:"rgba(255,77,77,0.06)",border:"1px solid #ff4d4d22",borderRadius:"8px",padding:"6px 12px",color:"#ff6b6b",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>Excluir</button>
                </div>
              </div>
              {(est.regrasEntrada||est.regrasesSaida)&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  {est.regrasEntrada&&<div style={{background:"rgba(0,212,170,0.04)",borderRadius:"8px",padding:"12px"}}><p style={{margin:"0 0 6px",color:"#00d4aa",fontSize:"10px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Entrada</p><p style={{margin:0,color:"#888",fontSize:"12px",lineHeight:"1.6",whiteSpace:"pre-wrap"}}>{est.regrasEntrada}</p></div>}
                  {est.regrasesSaida&&<div style={{background:"rgba(255,77,77,0.04)",borderRadius:"8px",padding:"12px"}}><p style={{margin:"0 0 6px",color:"#ff6b6b",fontSize:"10px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px"}}>Saída / Stop / Alvo</p><p style={{margin:0,color:"#888",fontSize:"12px",lineHeight:"1.6",whiteSpace:"pre-wrap"}}>{est.regrasesSaida}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
