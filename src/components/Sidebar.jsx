import { useAuth } from "../context/AuthContext";
const MENU = [
  { id:"evolucao",    label:"Evolução",      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id:"diario",      label:"Diário",        icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { id:"historico",   label:"Histórico",     icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { id:"banca",       label:"Banca",         icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
  { id:"regras",      label:"Regras", compliance:true, icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id:"estrategias", label:"Estratégias",   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
  { id:"crescimento", label:"Crescimento",   icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> },
  { id:"patrimonio",  label:"Patrimônio",    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg> },
  { id:"config",      label:"Configurações", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41"/></svg> },
];

export default function Sidebar({ pagina, setPagina, nomeUsuario, mobile, onClose, compliance }) {
  const now = new Date();
  const ym = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const daysThisMonth = Object.keys(compliance||{}).filter(k=>k.startsWith(ym));
  const compliedDays  = daysThisMonth.filter(k=>(compliance||{})[k]===true).length;
  const compliancePct = daysThisMonth.length>0 ? Math.round((compliedDays/daysThisMonth.length)*100) : null;
  const { logout } = useAuth();

  return (
    <>
      {mobile && <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}}/>}
      <div style={{width:"240px",minHeight:"100vh",background:"#0a0a0f",borderRight:"1px solid #1a1a2e",display:"flex",flexDirection:"column",position:"fixed",left:0,top:0,zIndex:200,fontFamily:"Inter,sans-serif"}}>

        {/* Logo - bigger */}
        <div style={{padding:"24px 20px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"42px",height:"42px",borderRadius:"10px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div>
              <p style={{margin:0,color:"#f0f0f0",fontWeight:"800",fontSize:"16px",letterSpacing:"-0.3px"}}>Mi Trading Plan</p>
              <p style={{margin:0,color:"#666",fontSize:"11px"}}>Pro Trader</p>
            </div>
          </div>
        </div>

        {/* Menu - more spacing, bigger font, lighter color */}
        <nav style={{flex:1,padding:"80px 10px",overflowY:"auto"}}>
          {MENU.map(item => {
            const active = pagina === item.id;
            return (
              <button key={item.id} onClick={()=>{setPagina(item.id);if(onClose)onClose();}} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"13px 14px",borderRadius:"10px",border:"none",cursor:"pointer",marginBottom:"4px",transition:"all 0.15s",background:active?"#00d4aa1a":"transparent",color:active?"#00d4aa":"#aaa",fontWeight:active?"700":"500",fontSize:"16px",textAlign:"left",fontFamily:"Inter,sans-serif",letterSpacing:"0.1px"}}>
                <span style={{flexShrink:0,opacity:active?1:0.7}}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{padding:"12px 10px",borderTop:"1px solid #1a1a2e"}}>
          <button onClick={logout} style={{width:"100%",display:"flex",alignItems:"center",gap:"12px",padding:"11px 14px",borderRadius:"10px",border:"none",cursor:"pointer",background:"transparent",color:"#666",fontWeight:"500",fontSize:"16px",fontFamily:"Inter,sans-serif",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,77,77,0.08)";e.currentTarget.style.color="#ff6b6b";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#666";}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair da conta
          </button>
        </div>
      </div>
    </>
  );
}
