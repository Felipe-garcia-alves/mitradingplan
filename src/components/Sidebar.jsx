import { useAuth } from "../context/AuthContext";

const MENU = [
  { id:"dashboard",   icon:"📊", label:"Dashboard"   },
  { id:"diario",      icon:"📒", label:"Diario"       },
  { id:"banca",       icon:"💰", label:"Banca"        },
  { id:"regras",      icon:"📋", label:"Regras"       },
  { id:"estrategias", icon:"🎯", label:"Estrategias"  },
  { id:"crescimento", icon:"📈", label:"Crescimento"  },
  { id:"patrimonio",  icon:"📉", label:"Patrimonio"   },
  { id:"parciais",    icon:"✂️", label:"Parciais"     },
  { id:"config",      icon:"⚙️", label:"Configuracoes"},
];

export default function Sidebar({ pagina, setPagina, nomeUsuario }) {
  const { logout } = useAuth();

  return (
    <div style={{ width:"220px", minHeight:"100vh", background:"#0d0d14", borderRight:"1px solid #1a1a2e", display:"flex", flexDirection:"column", position:"fixed", left:0, top:0, zIndex:100, fontFamily:"Inter,sans-serif" }}>

      {/* Logo */}
      <div style={{ padding:"24px 20px", borderBottom:"1px solid #1a1a2e" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(135deg,#00d4aa,#0099ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>⚡</div>
          <div>
            <p style={{ margin:0, color:"#f0f0f0", fontWeight:"700", fontSize:"14px", letterSpacing:"-0.3px" }}>Mi Trading Plan</p>
            <p style={{ margin:0, color:"#555", fontSize:"11px" }}>Pro Trader</p>
          </div>
        </div>
      </div>

      {/* Usuario */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid #1a1a2e" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#00d4aa33,#0099ff33)", border:"1px solid #00d4aa44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", flexShrink:0 }}>
            {nomeUsuario ? nomeUsuario[0].toUpperCase() : "👤"}
          </div>
          <div style={{ overflow:"hidden" }}>
            <p style={{ margin:0, color:"#ccc", fontWeight:"600", fontSize:"13px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nomeUsuario || "Trader"}</p>
            <p style={{ margin:0, color:"#555", fontSize:"11px" }}>Online</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav style={{ flex:1, padding:"12px 10px", overflowY:"auto" }}>
        {MENU.map(item => {
          const active = pagina === item.id;
          return (
            <button key={item.id} onClick={() => setPagina(item.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"10px", border:"none", cursor:"pointer", marginBottom:"2px", transition:"all 0.15s", background:active?"rgba(0,212,170,0.12)":"transparent", color:active?"#00d4aa":"#666", fontWeight:active?"600":"500", fontSize:"13px", textAlign:"left", fontFamily:"Inter,sans-serif" }}>
              <span style={{ fontSize:"16px", flexShrink:0 }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ marginLeft:"auto", width:"4px", height:"4px", borderRadius:"50%", background:"#00d4aa" }}/>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding:"12px 10px", borderTop:"1px solid #1a1a2e" }}>
        <button onClick={logout} style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", borderRadius:"10px", border:"none", cursor:"pointer", background:"rgba(255,77,77,0.06)", color:"#ff6b6b", fontWeight:"500", fontSize:"13px", fontFamily:"Inter,sans-serif" }}>
          <span>🚪</span> Sair da conta
        </button>
      </div>
    </div>
  );
}
