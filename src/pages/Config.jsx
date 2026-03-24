import { useState } from "react";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

export default function Config({ config, saveConfig, nomeUsuario, setPagina }) {
  const { user, logout } = useAuth();
  const [bancaB3,    setBancaB3]    = useState(String(config?.bancaB3    || 3000));
  const [bancaForex, setBancaForex] = useState(String(config?.bancaForex || 200));
  const [msg,        setMsg]        = useState("");
  const [senhaAtual,  setSenhaAtual]  = useState("");
  const [senhaNova,   setSenhaNova]   = useState("");
  const [msgSenha,   setMsgSenha]   = useState("");

  async function salvarBanca() {
    const b3    = parseFloat(bancaB3)    || 3000;
    const forex = parseFloat(bancaForex) || 200;
    await saveConfig({ bancaB3: b3, bancaForex: forex });
    setMsg("✓ Banca atualizada com sucesso!"); setTimeout(()=>setMsg(""),3000);
  }

  async function trocarSenha() {
    if (!senhaAtual || !senhaNova) { setMsgSenha("❌ Preencha os dois campos."); return; }
    if (senhaNova.length < 6) { setMsgSenha("❌ Nova senha deve ter ao menos 6 caracteres."); return; }
    try {
      const cred = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, senhaNova);
      setMsgSenha("✓ Senha alterada com sucesso!"); setSenhaAtual(""); setSenhaNova("");
      setTimeout(()=>setMsgSenha(""),3000);
    } catch(e) {
      setMsgSenha("❌ Senha atual incorreta."); setTimeout(()=>setMsgSenha(""),3000);
    }
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };
  const inpMono = { ...inp, fontFamily:"JetBrains Mono,monospace", fontSize:"16px", fontWeight:"700" };

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Configuracoes</h1>
        <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Personalize o app para sua realidade</p>
      </div>

      {/* Info conta */}
      <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 14px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Sua conta</p>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"linear-gradient(135deg,#00d4aa33,#0099ff33)", border:"1px solid #00d4aa44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>
            {nomeUsuario?nomeUsuario[0].toUpperCase():"👤"}
          </div>
          <div>
            <p style={{ margin:"0 0 2px", color:"#f0f0f0", fontWeight:"700", fontSize:"15px" }}>{nomeUsuario || "Trader"}</p>
            <p style={{ margin:0, color:"#555", fontSize:"13px" }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Banca inicial */}
      <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 16px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Banca inicial</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"16px" }}>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🇧🇷 Mini Indice B3 (R$)</label>
            <input style={inpMono} type="number" value={bancaB3} onChange={e=>setBancaB3(e.target.value)} placeholder="Ex: 3000"/>
          </div>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>🌍 Forex ($)</label>
            <input style={inpMono} type="number" value={bancaForex} onChange={e=>setBancaForex(e.target.value)} placeholder="Ex: 200"/>
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <button onClick={salvarBanca} style={{ background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
            💾 Salvar banca
          </button>
          {msg && <span style={{ color:"#00d4aa", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
        </div>
        <p style={{ margin:"12px 0 0", color:"#444", fontSize:"12px" }}>Todos os calculos de risco, meta e stop diario se baseiam nesses valores. Altere sempre que sua banca mudar significativamente.</p>
      </div>

      {/* Trocar senha */}
      <div style={{ background:"#111118", border:"1px solid #1a1a2e", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 16px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Alterar senha</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Senha atual</label>
            <input style={inp} type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} placeholder="••••••••"/>
          </div>
          <div>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Nova senha</label>
            <input style={inp} type="password" value={senhaNova} onChange={e=>setSenhaNova(e.target.value)} placeholder="Minimo 6 caracteres"/>
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <button onClick={trocarSenha} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid #2a2a3a", color:"#ccc", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
            🔒 Alterar senha
          </button>
          {msgSenha && <span style={{ color:msgSenha.includes("✓")?"#00d4aa":"#ff6b6b", fontSize:"13px", fontWeight:"600" }}>{msgSenha}</span>}
        </div>
      </div>

      {/* Termos */}
      {setPagina && (
        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"14px",padding:"18px 22px",marginBottom:"0"}}>
          <p style={{margin:"0 0 4px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Documentos Legais</p>
          <p style={{margin:"0 0 14px",color:"#555",fontSize:"13px"}}>Termos de uso e política de privacidade da plataforma.</p>
          <button onClick={()=>setPagina("termos")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #2a2a3a",color:"#aaa",borderRadius:"10px",padding:"10px 20px",fontWeight:"600",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
            📄 Ver Termos & Privacidade
          </button>
        </div>
      )}

      {/* Sair */}
      <div style={{ background:"#111118", border:"1px solid #ff4d4d22", borderRadius:"14px", padding:"22px" }}>
        <p style={{ margin:"0 0 8px", color:"#ff4d4d", fontSize:"14px", fontWeight:"700" }}>Sair da conta</p>
        <p style={{ margin:"0 0 14px", color:"#555", fontSize:"13px" }}>Seus dados ficam salvos no Firebase. Pode entrar novamente quando quiser.</p>
        <button onClick={logout} style={{ background:"rgba(255,77,77,0.1)", border:"1px solid #ff4d4d33", color:"#ff6b6b", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
          🚪 Sair da conta
        </button>
      </div>
    </div>
  );
}
