import { useState } from "react";
import { CountUp, Ring, Sparkline, CapitalChart, Modal, Select } from "../components/ui";

const CORES = ["#2ee6a0","#f5b941","#a78bfa","#f472b6","#60a5fa","#34d399","#fb923c"];

const kpiLabel    = {margin:0,color:"var(--text-3)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"};
const kpiSub      = {margin:0,color:"var(--text-3)",fontSize:"11.5px"};
const resumoCard  = {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"20px 22px",minWidth:0,display:"flex",flexDirection:"column",gap:"10px"};
const resumoValor = {margin:0,fontSize:"22px",fontWeight:"700",fontFamily:"var(--font-mono)",whiteSpace:"nowrap"};
const chip        = {padding:"3px 9px",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--line)",color:"var(--text-2)",fontSize:"10.5px",fontWeight:"600",fontFamily:"var(--font-mono)"};

function fmtBRL(v) {
  const a = Math.abs(v);
  return (v<0?"-":"+")+"R$ "+a.toLocaleString("pt-BR", a>=10000 ? {maximumFractionDigits:0} : {minimumFractionDigits:2,maximumFractionDigits:2});
}

// "Trade de Abertura" -> "TDA"; "Falha e Quebra" -> "FEQ"
function sigla(nome="") {
  const p = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0,3).toUpperCase();
  return p.slice(0,3).map(w=>w[0]).join("").toUpperCase();
}

// Desempenho da estratégia a partir dos trades do diário
function statsDe(nome, entries) {
  const st = { total:0, wins:0, resultado:0, pontos:0, curva:[0], pontosCurva:[] };
  let acc = 0;
  Object.entries(entries||{}).sort(([a],[b])=>a.localeCompare(b)).forEach(([d,e]) => {
    const ts = (e.trades||[]).filter(t=>t.estrategia===nome);
    if (!ts.length) return;
    ts.forEach(t => { st.total++; if (t.tipo==="WIN") st.wins++; st.resultado += t.resultado||0; st.pontos += t.pontos||0; });
    acc += ts.reduce((s,t)=>s+(t.resultado||0),0);
    st.curva.push(acc);
    st.pontosCurva.push({ d, val: parseFloat(acc.toFixed(2)) });
  });
  if (st.pontosCurva.length) st.pontosCurva.unshift({ d:"início", val:0 });
  return st;
}

export default function Estrategias({ estrategias, entries, saveEstrategia, deleteEstrategia }) {
  const [modo,  setModo]  = useState("lista");
  const [abertaId, setAbertaId] = useState(null);
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

  const inp = {width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"10px",padding:"11px 13px",color:"#f0f0f0",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"var(--font-sans)"};

  if (modo === "form") {
    return (
      <div style={{fontFamily:"var(--font-sans)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"24px"}}>
          <button onClick={()=>setModo("lista")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"8px",padding:"8px 14px",color:"#93a39c",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>← Voltar</button>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:"800",color:"#f0f0f0"}}>{editId?"Editar Estratégia":"Nova Estratégia"}</h1>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid #18241f",borderRadius:"14px",padding:"24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
            <div>
              <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Nome da estratégia *</label>
              <input style={inp} placeholder="Ex: Rompimento de Máxima" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/>
            </div>
            <div>
              <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Mercado</label>
              <Select style={{...inp,width:"100%"}} value={form.mercado} onChange={v=>setForm(p=>({...p,mercado:v}))}
                options={[{value:"B3",label:"Mini Índice B3",cor:"#2ee6a0"},{value:"Forex",label:"Forex",cor:"#f5b941"},{value:"Cripto",label:"Cripto",cor:"#a78bfa"},{value:"Americano",label:"Ações Americanas",cor:"#60a5fa"},{value:"Ambos",label:"Vários mercados"}]}/>
            </div>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Timeframe</label>
            <input style={{...inp}} placeholder="Ex: M5, M15, H1..." value={form.timeframe} onChange={e=>setForm(p=>({...p,timeframe:e.target.value}))}/>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Descrição geral</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"70px"}} placeholder="Descreva a lógica da estratégia..." value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} rows={3}/>
          </div>
          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Regras de entrada</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Quais condições precisam ser atendidas para entrar?" value={form.regrasEntrada} onChange={e=>setForm(p=>({...p,regrasEntrada:e.target.value}))} rows={4}/>
          </div>
          <div style={{marginBottom:"20px"}}>
            <label style={{color:"#6f8179",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Regras de saída / Stop / Alvo</label>
            <textarea style={{...inp,resize:"vertical",lineHeight:"1.6",minHeight:"80px"}} placeholder="Onde colocar o stop? Qual o alvo? Quando sair?" value={form.regrasesSaida} onChange={e=>setForm(p=>({...p,regrasesSaida:e.target.value}))} rows={4}/>
          </div>
          <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
            <button onClick={salvar} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"11px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar estratégia</button>
            <button onClick={()=>setModo("lista")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #1b2823",borderRadius:"10px",padding:"11px 18px",color:"#93a39c",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Cancelar</button>
            {msg && <span style={{color:msg.includes("✓")?"#2ee6a0":"#ff7a90",fontSize:"13px",fontWeight:"600"}}>{msg}</span>}
          </div>
        </div>
      </div>
    );
  }

  const lista = estrategias||[];
  const stats = Object.fromEntries(lista.map(e=>[e.id, statsDe(e.nome, entries)]));
  const comOps = lista.filter(e=>stats[e.id].total>0);
  const melhor = [...comOps].sort((a,b)=>stats[b.id].resultado-stats[a.id].resultado)[0];
  const maisOp = [...comOps].sort((a,b)=>stats[b.id].total-stats[a.id].total)[0];
  const aberta = lista.find(e=>e.id===abertaId);
  const corDe  = id => CORES[Math.max(0,lista.findIndex(e=>e.id===id)) % CORES.length];

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.8px"}}>Estratégias</h1>
          <p style={{margin:"4px 0 0",color:"#86978f",fontSize:"13px"}}>Documente e organize seus setups operacionais</p>
        </div>
        <button onClick={novaForm} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"10px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>
          + Nova estratégia
        </button>
      </div>

      {lista.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 20px",background:"var(--card)",border:"1px solid #18241f",borderRadius:"14px"}}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#26352e" strokeWidth="1.5" style={{margin:"0 auto 14px",display:"block"}}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          <p style={{color:"#6f8179",fontSize:"14px",margin:"0 0 6px"}}>Nenhuma estratégia cadastrada.</p>
          <p style={{color:"#26352e",fontSize:"12px",margin:0}}>Clique em "Nova estratégia" para começar.</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"16px",marginBottom:"36px"}}>
            <div style={resumoCard}>
              <p style={kpiLabel}>Setups cadastrados</p>
              <p style={{...resumoValor,color:"var(--text)"}}><CountUp value={lista.length}/></p>
              <p style={kpiSub}>{comOps.length} com operações registradas</p>
            </div>
            <div style={resumoCard}>
              <p style={kpiLabel}>Melhor resultado</p>
              <p style={{...resumoValor,color:melhor&&stats[melhor.id].resultado<0?"var(--neg)":"var(--pos)"}}>{melhor ? fmtBRL(stats[melhor.id].resultado) : "—"}</p>
              <p style={{...kpiSub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{melhor ? melhor.nome : "sem operações ainda"}</p>
            </div>
            <div style={resumoCard}>
              <p style={kpiLabel}>Mais operada</p>
              <p style={{...resumoValor,color:"#7fd8ff"}}>{maisOp ? stats[maisOp.id].total+" ops" : "—"}</p>
              <p style={{...kpiSub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{maisOp ? maisOp.nome : "sem operações ainda"}</p>
            </div>
          </div>

          {/* Grade de cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"20px"}}>
            {lista.map(est => {
              const st = stats[est.id];
              const cor = corDe(est.id);
              const ass = st.total>0 ? Math.round(st.wins/st.total*100) : null;
              return (
                <div key={est.id} className="mtp-est-card" onClick={()=>setAbertaId(est.id)}
                  style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"18px",padding:"24px 24px 20px",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",gap:"20px",minHeight:"280px"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,"+cor+",transparent 70%)"}}/>
                  {st.curva.length>2 && (
                    <div style={{position:"absolute",left:0,right:0,bottom:0,height:"64px",opacity:0.35,pointerEvents:"none"}}>
                      <Sparkline values={st.curva} color={st.resultado>=0?cor:"#ff5470"} width="100%" height="100%"/>
                    </div>
                  )}

                  <div style={{display:"flex",alignItems:"center",gap:"14px",position:"relative"}}>
                    <div className="mtp-est-badge" style={{width:"46px",height:"46px",borderRadius:"12px",background:cor+"18",border:"1px solid "+cor+"44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 20px -8px "+cor}}>
                      <span style={{color:cor,fontSize:"12px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{sigla(est.nome)}</span>
                    </div>
                    <div style={{minWidth:0}}>
                      <p style={{margin:0,color:"var(--text)",fontSize:"16px",fontWeight:"700",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{est.nome}</p>
                      <div style={{display:"flex",gap:"6px",marginTop:"8px"}}>
                        {[est.mercado, est.timeframe].filter(Boolean).map(t=>(
                          <span key={t} style={chip}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="mtp-clamp-2" style={{margin:0,color:"var(--text-3)",fontSize:"13px",lineHeight:1.7,position:"relative",minHeight:"44px"}}>
                    {est.descricao || "Sem descrição. Clique para ver as regras."}
                  </p>

                  <div style={{display:"flex",alignItems:"center",gap:"16px",position:"relative",marginTop:"auto",paddingTop:"18px",borderTop:"1px solid var(--line)"}}>
                    <Ring pct={ass} color={ass===null?"var(--line)":ass>=60?"#2ee6a0":ass>=40?"#f59e0b":"#ff5470"} size={46} stroke={4}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,color:st.total===0?"var(--text-3)":st.resultado>=0?"var(--pos)":"var(--neg)",fontSize:"18px",fontWeight:"700",fontFamily:"var(--font-mono)",whiteSpace:"nowrap"}}>
                        {st.total>0 ? fmtBRL(st.resultado) : "—"}
                      </p>
                      <p style={{margin:"5px 0 0",color:"var(--text-3)",fontSize:"12px",fontFamily:"var(--font-mono)"}}>
                        {ass!==null ? ass+"% acerto · "+st.total+" ops" : "nenhuma operação"}
                      </p>
                    </div>
                  </div>

                  <div className="mtp-est-cta" style={{display:"flex",alignItems:"center",gap:"6px",color:"var(--text-3)",fontSize:"12px",fontWeight:"600",position:"relative",marginTop:"-6px"}}>
                    Ver características <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detalhes da estratégia */}
      {aberta && (() => {
        const st = stats[aberta.id];
        const cor = corDe(aberta.id);
        const ass = st.total>0 ? Math.round(st.wins/st.total*100) : null;
        return (
          <Modal onClose={()=>setAbertaId(null)} width={760}>
            <div style={{position:"relative",padding:"24px 26px 20px",borderBottom:"1px solid var(--line)"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"2px",background:"linear-gradient(90deg,"+cor+",transparent 70%)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div style={{width:"52px",height:"52px",borderRadius:"14px",background:cor+"18",border:"1px solid "+cor+"55",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 28px -8px "+cor}}>
                  <span style={{color:cor,fontSize:"14px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{sigla(aberta.nome)}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,color:"var(--text)",fontSize:"20px",fontWeight:"800",letterSpacing:"-0.3px"}}>{aberta.nome}</p>
                  <div style={{display:"flex",gap:"6px",marginTop:"6px"}}>
                    {[aberta.mercado, aberta.timeframe].filter(Boolean).map(t=>(<span key={t} style={chip}>{t}</span>))}
                  </div>
                </div>
                <button onClick={()=>setAbertaId(null)} aria-label="Fechar" style={{background:"rgba(255,255,255,0.04)",border:"1px solid var(--line)",borderRadius:"10px",width:"36px",height:"36px",color:"var(--text-2)",cursor:"pointer",fontSize:"18px",lineHeight:1,flexShrink:0}}>×</button>
              </div>
            </div>

            <div style={{padding:"20px 26px 24px",display:"flex",flexDirection:"column",gap:"18px"}}>
              {/* Números */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:"10px"}}>
                {[
                  {l:"Resultado",  v:st.total>0?fmtBRL(st.resultado):"—", c:st.resultado>=0?"var(--pos)":"var(--neg)"},
                  {l:"Assertividade", v:ass!==null?ass+"%":"—", c:ass===null?"var(--text-3)":ass>=60?"#2ee6a0":ass>=40?"#f59e0b":"#ff5470"},
                  {l:"Operações",  v:st.total, c:"var(--text)"},
                  {l:"Média / op", v:st.total>0?(st.pontos/st.total>=0?"+":"")+(st.pontos/st.total).toFixed(1)+" pts":"—", c:"#7fd8ff"},
                ].map(k=>(
                  <div key={k.l} style={{background:"rgba(255,255,255,0.025)",border:"1px solid var(--line)",borderRadius:"12px",padding:"12px 14px",minWidth:0}}>
                    <p style={{...kpiLabel,fontSize:"10px"}}>{k.l}</p>
                    <p style={{margin:"6px 0 0",color:k.c,fontSize:"16px",fontWeight:"700",fontFamily:"var(--font-mono)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.v}</p>
                  </div>
                ))}
              </div>

              {st.pontosCurva.length>2 && (
                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid var(--line)",borderRadius:"14px",padding:"14px 16px 8px"}}>
                  <p className="mtp-card-title" style={{marginBottom:"10px"}}>Curva da estratégia</p>
                  <CapitalChart points={st.pontosCurva} height={170}/>
                </div>
              )}

              {aberta.descricao && (
                <div>
                  <p style={{...kpiLabel,marginBottom:"8px"}}>Descrição</p>
                  <p style={{margin:0,color:"var(--text)",fontSize:"14.5px",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aberta.descricao}</p>
                </div>
              )}

              {(aberta.regrasEntrada||aberta.regrasesSaida) && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"12px"}}>
                  {aberta.regrasEntrada && (
                    <div style={{background:"rgba(46,230,160,0.05)",border:"1px solid rgba(46,230,160,0.18)",borderRadius:"14px",padding:"16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2ee6a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/><line x1="4" y1="12" x2="15" y2="12"/></svg>
                        <p style={{margin:0,color:"#2ee6a0",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"}}>Regras de entrada</p>
                      </div>
                      <p style={{margin:0,color:"#e2ebe6",fontSize:"13.5px",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{aberta.regrasEntrada}</p>
                    </div>
                  )}
                  {aberta.regrasesSaida && (
                    <div style={{background:"rgba(255,84,112,0.05)",border:"1px solid rgba(255,84,112,0.18)",borderRadius:"14px",padding:"16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff7a90" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>
                        <p style={{margin:0,color:"#ff7a90",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"}}>Saída / Stop / Alvo</p>
                      </div>
                      <p style={{margin:0,color:"#e2ebe6",fontSize:"13.5px",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{aberta.regrasesSaida}</p>
                    </div>
                  )}
                </div>
              )}

              {!aberta.descricao && !aberta.regrasEntrada && !aberta.regrasesSaida && (
                <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>Nenhuma característica documentada ainda. Clique em Editar para descrever o setup.</p>
              )}

              <div style={{display:"flex",justifyContent:"space-between",gap:"10px",paddingTop:"4px"}}>
                <button onClick={async()=>{ const id=aberta.id; if(window.confirm("Excluir esta estratégia?")){ setAbertaId(null); await deleteEstrategia(id); } }}
                  style={{background:"rgba(255,84,112,0.06)",border:"1px solid #ff547033",borderRadius:"10px",padding:"10px 16px",color:"#ff7a90",fontSize:"13px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Excluir</button>
                <button onClick={()=>{ setAbertaId(null); editarForm(aberta); }}
                  style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"10px 22px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Editar estratégia</button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
