import { useAuth } from "../context/AuthContext";
import { hojeLocal } from "../lib/datas";
import { useTema } from "../lib/tema";
import { somaPorMoeda, fmtMoeda, corDasPartes } from "../lib/moedas";
const MENU = [
  { id:"evolucao",    label:"Evolução",      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id:"macro", label:"Macro", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { id:"regras",      label:"Disciplina", compliance:true, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  { id:"diario",      label:"Diário",        icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id:"estrategias", label:"Estratégias",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
  { id:"historico",   label:"Histórico",     icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id:"revisao",     label:"Revisão",       contador:true, icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7.5"/><line x1="21" y1="21" x2="16.4" y2="16.4"/><polyline points="7.5 12.5 9.8 10 11.8 12 14.5 9"/></svg> },
  { id:"banca",       label:"Banca",         icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { id:"crescimento", label:"Crescimento",   icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> },
  { id:"patrimonio",  label:"Patrimônio",    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
  { id:"config",      label:"Configurações", icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41"/></svg> },
];

const SECOES = [
  { titulo:"Análise",  ids:["evolucao","macro"] },
  { titulo:"Operação", ids:["regras","diario","estrategias","historico","revisao"] },
  { titulo:"Capital",  ids:["banca","crescimento","patrimonio"] },
];

export default function Sidebar({ pagina, setPagina, mobile, onClose, compliance, pendentesRevisao = 0, entries, fixa, setFixa, onNovoTrade }) {
  // Resultado de hoje, separado por moeda (R$ da B3, $ dos demais)
  const tradesHoje = entries?.[hojeLocal()]?.trades || [];
  const partesHoje = somaPorMoeda(tradesHoje);
  const corHoje = tradesHoje.length ? corDasPartes(partesHoje) : "var(--text-3)";
  const now = new Date();
  const ym = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const daysThisMonth = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  const valsMes = daysThisMonth
    .map(k => { const v = (compliance||{})[k]; return typeof v==="number" ? v : v===true ? 100 : v===false ? 0 : null; })
    .filter(v => v!==null);
  const compliancePct = valsMes.length>0 ? Math.round(valsMes.reduce((a,b)=>a+b,0)/valsMes.length) : null;
  const { logout } = useAuth();
  const [tema, trocarTema] = useTema();

  const item = id => {
    const m = MENU.find(x=>x.id===id);
    const active = pagina === id;
    const badgeCor = compliancePct>=80 ? "var(--pos)" : compliancePct>=50 ? "var(--warn)" : "var(--neg)";
    return (
      <button key={id} className={"mtp-nav-item"+(active?" active":"")} onClick={()=>{setPagina(id);if(onClose)onClose();}}>
        <span className="mtp-nav-icon">
          {m.icon}
          {/* bolinha que substitui o badge quando a barra está recolhida */}
          {m.compliance && compliancePct!==null && <i className="mtp-nav-dot" style={{background:badgeCor}}/>}
          {m.contador && pendentesRevisao > 0 && <i className="mtp-nav-dot" style={{background:"var(--warn)"}}/>}
        </span>
        <span className="mtp-nav-label">{m.label}</span>
        {m.compliance && compliancePct!==null && (
          <span className="mtp-nav-badge" style={{color:badgeCor,background:"color-mix(in srgb, "+badgeCor+" 12%, transparent)",border:"1px solid color-mix(in srgb, "+badgeCor+" 25%, transparent)"}}>{compliancePct}%</span>
        )}
        {m.contador && pendentesRevisao > 0 && (
          <span className="mtp-nav-badge" title={pendentesRevisao+" trades para revisar (últimos 30 dias)"} style={{color:"var(--warn)",background:"color-mix(in srgb, var(--warn) 12%, transparent)",border:"1px solid color-mix(in srgb, var(--warn) 25%, transparent)"}}>{pendentesRevisao}</span>
        )}
      </button>
    );
  };

  return (
    <>
      {mobile && <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",zIndex:199}}/>}
      {/* No desktop vira um trilho de ícones (72px) que se abre por cima do
          conteúdo ao passar o mouse; no celular continua a gaveta completa */}
      <div className={"mtp-sidebar"+(mobile?"":" mtp-rail")+(!mobile&&fixa?" fixa":"")} style={{width:mobile?"240px":undefined,height:mobile?"100vh":"calc(100vh - 24px)",display:"flex",flexDirection:"column",position:"fixed",left:mobile?0:"20px",top:mobile?0:"12px",zIndex:200,fontFamily:"var(--font-sans)"}}>

        {/* Logo */}
        {/* Logo sozinho no topo, com respiro até as ações */}
        <div className="mtp-brand" style={{padding:mobile?"44px 20px 30px 38px":undefined,cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",whiteSpace:"nowrap"}}>
            <div className="mtp-logo" style={{width:"40px",height:"40px",borderRadius:"11px",background:"linear-gradient(135deg,var(--accent),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 6px 24px -6px color-mix(in srgb, var(--accent) 45%, transparent)"}}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#04110b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className="mtp-brand-text">
              <p style={{margin:0,color:"var(--text)",fontWeight:"800",fontSize:"15.5px",letterSpacing:"-0.3px"}}>Mi Trading Plan</p>
              <p style={{margin:"1px 0 0",color:"var(--accent)",fontSize:"10px",fontWeight:"700",letterSpacing:"1.4px",textTransform:"uppercase",opacity:0.8}}>Pro Trader</p>
            </div>
          </div>
        </div>

        {/* Ação principal + resultado do dia */}
        <div className="mtp-acoes">
          <button className="mtp-nav-item mtp-novo-trade" onClick={()=>{onNovoTrade?.();onClose?.();}} title="Registrar um trade de hoje">
            <span className="mtp-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
            <span className="mtp-nav-label">Novo trade</span>
          </button>
          <button className="mtp-nav-item mtp-hoje" onClick={()=>{setPagina("diario");onClose?.();}}
            title={"Hoje: "+(tradesHoje.length ? partesHoje.map(p=>fmtMoeda(p.valor,p.moeda)).join(" · ") : "sem operações")}>
            <span className="mtp-nav-icon" style={{width:"18px",justifyContent:"center"}}><i style={{width:"8px",height:"8px",borderRadius:"50%",background:corHoje,boxShadow:tradesHoje.length?"0 0 10px "+corHoje:"none"}}/></span>
            <span className="mtp-nav-label" style={{display:"flex",flexDirection:"column",gap:"1px",minWidth:0}}>
              <span style={{color:"var(--text-3)",fontSize:"10px",fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase"}}>Hoje</span>
              <span style={{color:corHoje,fontFamily:"var(--font-mono)",fontSize:"13px",fontWeight:650,overflow:"hidden",textOverflow:"ellipsis"}}>
                {tradesHoje.length ? partesHoje.map(p=>fmtMoeda(p.valor,p.moeda,{compacto:partesHoje.length>1})).join(" · ") : "Sem operações"}
              </span>
            </span>
          </button>
        </div>

        {/* Menu */}
        {/* Menu centralizado na altura disponível (margin:auto num flex em coluna
            centraliza e ainda deixa rolar quando a tela é baixa) */}
        <nav className="mtp-nav" style={{flex:1,minHeight:0,overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div className="mtp-nav-secoes">
            {SECOES.map(s=>(
              <div key={s.titulo} className="mtp-secao">
                <p className="mtp-section-label"><span>{s.titulo}</span></p>
                {s.ids.map(item)}
              </div>
            ))}
          </div>
        </nav>

        {/* Rodapé */}
        {/* Rodapé: ações secundárias, mais baixas e discretas */}
        <div className="mtp-rodape">
          {mobile && item("config")}
          {!mobile && (
            <button className={"mtp-nav-item mtp-pin"+(fixa?" on":"")} onClick={()=>setFixa(!fixa)} title={fixa?"Recolher a barra":"Manter a barra aberta"} aria-pressed={!!fixa}>
              <span className="mtp-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="3" x2="9" y2="21"/>{fixa ? <polyline points="16 9 13 12 16 15"/> : <polyline points="13 9 16 12 13 15"/>}</svg></span>
              <span className="mtp-nav-label">{fixa ? "Recolher barra" : "Manter aberta"}</span>
            </button>
          )}
          <button className="mtp-nav-item" onClick={trocarTema} title={tema==="light"?"Mudar para o tema escuro":"Mudar para o tema claro"} style={{color:"var(--text-3)"}}>
            <span className="mtp-nav-icon">{tema==="light" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>)}</span>
            <span className="mtp-nav-label">{tema==="light" ? "Tema escuro" : "Tema claro"}</span>
          </button>
          <button className="mtp-nav-item mtp-logout" onClick={logout} style={{color:"var(--text-3)"}}>
            <span className="mtp-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span className="mtp-nav-label">Sair da conta</span>
          </button>
        </div>
      </div>
    </>
  );
}
