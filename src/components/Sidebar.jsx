import { useAuth } from "../context/AuthContext";
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

export default function Sidebar({ pagina, setPagina, nomeUsuario, mobile, onClose, compliance, pendentesRevisao = 0 }) {
  const now = new Date();
  const ym = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const daysThisMonth = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  const valsMes = daysThisMonth
    .map(k => { const v = (compliance||{})[k]; return typeof v==="number" ? v : v===true ? 100 : v===false ? 0 : null; })
    .filter(v => v!==null);
  const compliancePct = valsMes.length>0 ? Math.round(valsMes.reduce((a,b)=>a+b,0)/valsMes.length) : null;
  const { logout } = useAuth();

  const item = id => {
    const m = MENU.find(x=>x.id===id);
    const active = pagina === id;
    const badgeCor = compliancePct>=80 ? "var(--pos)" : compliancePct>=50 ? "var(--warn)" : "var(--neg)";
    return (
      <button key={id} className={"mtp-nav-item"+(active?" active":"")} onClick={()=>{setPagina(id);if(onClose)onClose();}}>
        <span className="mtp-nav-icon">{m.icon}</span>
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
      <div className="mtp-sidebar" style={{width:"240px",height:"100vh",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,zIndex:200,fontFamily:"var(--font-sans)"}}>

        {/* Logo */}
        <div className="mtp-brand" style={{padding:"44px 20px 30px 38px",cursor:"default"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div className="mtp-logo" style={{width:"40px",height:"40px",borderRadius:"11px",background:"linear-gradient(135deg,var(--accent),var(--accent-2))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 6px 24px -6px rgba(46,230,160,0.45)"}}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#04110b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p style={{margin:0,color:"var(--text)",fontWeight:"800",fontSize:"15.5px",letterSpacing:"-0.3px"}}>Mi Trading Plan</p>
              <p style={{margin:"1px 0 0",color:"var(--accent)",fontSize:"10px",fontWeight:"700",letterSpacing:"1.4px",textTransform:"uppercase",opacity:0.8}}>Pro Trader</p>
            </div>
          </div>
        </div>


        {/* Menu */}
        {/* Menu centralizado na altura disponível (margin:auto num flex em coluna
            centraliza e ainda deixa rolar quando a tela é baixa) */}
        <nav className="mtp-nav" style={{flex:1,minHeight:0,padding:"clamp(10px,2.5vh,24px) 12px",overflowY:"auto",display:"flex",flexDirection:"column"}}>
          <div style={{margin:"auto 0",display:"flex",flexDirection:"column",gap:"clamp(14px,3.4vh,38px)"}}>
            {SECOES.map(s=>(
              <div key={s.titulo}>
                <p className="mtp-section-label">{s.titulo}</p>
                {s.ids.map(item)}
              </div>
            ))}
          </div>
        </nav>

        {/* Rodapé */}
        <div style={{padding:"12px",borderTop:"1px solid var(--line)"}}>
          {item("config")}
          <button className="mtp-nav-item mtp-logout" onClick={logout} style={{color:"var(--text-3)"}}>
            <span className="mtp-nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
            <span className="mtp-nav-label">Sair da conta</span>
          </button>
        </div>
      </div>
    </>
  );
}
