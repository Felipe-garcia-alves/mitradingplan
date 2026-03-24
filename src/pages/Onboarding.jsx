import { useState } from "react";

const MERCADOS = [
  { id:"bancaB3",        label:"B3",         desc:"Mini Índice, Mini Dólar",   cor:"#00d4aa", cur:"R$" },
  { id:"bancaForex",     label:"Forex",       desc:"Pares de moedas",           cor:"#f59e0b", cur:"$"  },
  { id:"bancaCripto",    label:"Cripto",      desc:"Bitcoin, Ethereum...",      cor:"#a78bfa", cur:"$"  },
  { id:"bancaAmericano", label:"Americano",   desc:"NYSE, NASDAQ",              cor:"#34d399", cur:"$"  },
];

const FEATURES = [
  { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    titulo:"Diário de Operações", desc:"Registre cada trade com emoção, estratégia e horário. O histórico que transforma comportamento." },
  { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    titulo:"Disciplina & Regras", desc:"Checklist diário de regras. Veja a % de disciplina correlacionada com seu resultado." },
  { icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    titulo:"Evolução & Alertas", desc:"Análise comportamental, correlação emoção×resultado e alertas inteligentes baseados em protocolos profissionais." },
];

export default function Onboarding({ nomeUsuario, onComplete, saveConfig, saveEstrategia }) {
  const [step, setStep] = useState(0); // 0=boas-vindas, 1=mercados, 2=estrategia, 3=features
  const [bancas, setBancas] = useState({ bancaB3:3000, bancaForex:200, bancaCripto:1000, bancaAmericano:500 });
  const [mercadosAtivos, setMercadosAtivos] = useState(["bancaB3"]);
  const [nomeEst, setNomeEst] = useState("");
  const [salvando, setSalvando] = useState(false);

  const nome = nomeUsuario?.split(" ")[0] || "Trader";

  function toggleMercado(id) {
    setMercadosAtivos(prev =>
      prev.includes(id) ? prev.filter(m=>m!==id) : [...prev, id]
    );
  }

  async function finalizar() {
    setSalvando(true);
    // Salva config com bancas dos mercados ativos
    const cfg = {};
    mercadosAtivos.forEach(id => { cfg[id] = Number(bancas[id]) || 0; });
    await saveConfig(cfg);
    // Cria estratégia se digitou nome
    if (nomeEst.trim()) {
      await saveEstrategia(null, { nome: nomeEst.trim(), descricao:"", cor:"#00d4aa" });
    }
    setSalvando(false);
    onComplete();
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a",
    borderRadius:"10px", padding:"12px 14px", color:"#f0f0f0", fontSize:"16px",
    outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };

  return (
    <div style={{minHeight:"100vh",background:"#080810",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"480px"}}>

        {/* Progress dots */}
        <div style={{display:"flex",justifyContent:"center",gap:"8px",marginBottom:"40px"}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:i===step?24:8,height:"8px",borderRadius:"4px",background:i<=step?"#00d4aa":"#1a1a2e",transition:"all 0.3s"}}/>
          ))}
        </div>

        {/* STEP 0 — Boas-vindas */}
        {step===0 && (
          <div style={{textAlign:"center",animation:"fadeIn 0.4s ease"}}>
            <div style={{width:"72px",height:"72px",borderRadius:"20px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px"}}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <h1 style={{margin:"0 0 12px",fontSize:"28px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>
              Bem-vindo, {nome}! 👋
            </h1>
            <p style={{margin:"0 0 32px",color:"#666",fontSize:"15px",lineHeight:"1.7"}}>
              O <strong style={{color:"#f0f0f0"}}>Mi Trading Plan</strong> é a sua plataforma profissional para transformar disciplina em resultados consistentes.
            </p>
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"20px",marginBottom:"32px",textAlign:"left"}}>
              <p style={{margin:"0 0 4px",color:"#555",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Sua configuração leva</p>
              <p style={{margin:0,color:"#f0f0f0",fontSize:"16px",fontWeight:"700"}}>menos de 2 minutos ⚡</p>
            </div>
            <button onClick={()=>setStep(1)} style={{width:"100%",padding:"15px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"15px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
              Começar configuração →
            </button>
          </div>
        )}

        {/* STEP 1 — Mercados e bancas */}
        {step===1 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{margin:"0 0 8px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0"}}>Em quais mercados você opera?</h2>
            <p style={{margin:"0 0 28px",color:"#555",fontSize:"14px"}}>Selecione e informe sua banca inicial em cada mercado.</p>
            <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"32px"}}>
              {MERCADOS.map(m=>{
                const ativo = mercadosAtivos.includes(m.id);
                return (
                  <div key={m.id} onClick={()=>toggleMercado(m.id)}
                    style={{background:ativo?"rgba(255,255,255,0.04)":"#0d0d14",border:"1.5px solid "+(ativo?m.cor+"55":"#1a1a2e"),borderRadius:"14px",padding:"16px",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:ativo?"12px":"0"}}>
                      <div style={{width:"20px",height:"20px",borderRadius:"50%",border:"2px solid "+(ativo?m.cor:"#333"),background:ativo?m.cor:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                        {ativo&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div style={{flex:1}}>
                        <p style={{margin:0,color:ativo?m.cor:"#aaa",fontWeight:"700",fontSize:"14px"}}>{m.label}</p>
                        <p style={{margin:0,color:"#555",fontSize:"12px"}}>{m.desc}</p>
                      </div>
                    </div>
                    {ativo && (
                      <div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:"10px"}}>
                        <span style={{color:"#666",fontSize:"13px",flexShrink:0}}>Banca inicial:</span>
                        <div style={{display:"flex",alignItems:"center",gap:"6px",flex:1}}>
                          <span style={{color:m.cor,fontSize:"13px",fontWeight:"700"}}>{m.cur}</span>
                          <input type="number" value={bancas[m.id]} onChange={e=>setBancas(p=>({...p,[m.id]:e.target.value}))}
                            style={{...inp,padding:"8px 12px",fontSize:"14px",flex:1}} placeholder="0"/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setStep(0)} style={{flex:1,padding:"14px",borderRadius:"12px",border:"1px solid #2a2a3a",background:"transparent",color:"#666",fontWeight:"600",fontSize:"14px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Voltar</button>
              <button onClick={()=>setStep(2)} disabled={mercadosAtivos.length===0}
                style={{flex:2,padding:"14px",borderRadius:"12px",border:"none",background:mercadosAtivos.length>0?"linear-gradient(135deg,#00d4aa,#00b894)":"#1a1a2e",color:mercadosAtivos.length>0?"#000":"#444",fontWeight:"700",fontSize:"14px",cursor:mercadosAtivos.length>0?"pointer":"not-allowed",fontFamily:"Inter,sans-serif"}}>
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Primeira estratégia */}
        {step===2 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{margin:"0 0 8px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0"}}>Qual seu principal setup?</h2>
            <p style={{margin:"0 0 28px",color:"#555",fontSize:"14px"}}>Crie sua primeira estratégia. Você pode adicionar mais depois.</p>
            <div style={{marginBottom:"16px"}}>
              <label style={{color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"8px"}}>Nome da estratégia</label>
              <input style={inp} placeholder="Ex: Price Action, CF, Tape Reading..." value={nomeEst} onChange={e=>setNomeEst(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&setStep(3)}/>
            </div>
            <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"14px 16px",marginBottom:"28px"}}>
              <p style={{margin:0,color:"#555",fontSize:"12px",lineHeight:"1.6"}}>💡 <span style={{color:"#888"}}>Traders profissionais operam no máximo 2-3 estratégias. Foco é a chave.</span></p>
            </div>
            <div style={{display:"flex",gap:"10px"}}>
              <button onClick={()=>setStep(1)} style={{flex:1,padding:"14px",borderRadius:"12px",border:"1px solid #2a2a3a",background:"transparent",color:"#666",fontWeight:"600",fontSize:"14px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Voltar</button>
              <button onClick={()=>setStep(3)}
                style={{flex:2,padding:"14px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"14px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                {nomeEst.trim() ? "Próximo →" : "Pular →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Features */}
        {step===3 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h2 style={{margin:"0 0 8px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0"}}>Tudo pronto! 🎯</h2>
            <p style={{margin:"0 0 28px",color:"#555",fontSize:"14px"}}>Explore os 3 recursos que vão transformar seu trading:</p>
            <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"32px"}}>
              {FEATURES.map((f,i)=>(
                <div key={i} style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"16px 20px",display:"flex",gap:"16px",alignItems:"flex-start"}}>
                  <div style={{flexShrink:0,marginTop:"2px"}}>{f.icon}</div>
                  <div>
                    <p style={{margin:"0 0 4px",color:"#f0f0f0",fontWeight:"700",fontSize:"14px"}}>{f.titulo}</p>
                    <p style={{margin:0,color:"#666",fontSize:"13px",lineHeight:"1.5"}}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={finalizar} disabled={salvando}
              style={{width:"100%",padding:"15px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"15px",cursor:salvando?"not-allowed":"pointer",opacity:salvando?0.7:1,fontFamily:"Inter,sans-serif"}}>
              {salvando ? "Configurando..." : "Entrar no app →"}
            </button>
          </div>
        )}

        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    </div>
  );
}
