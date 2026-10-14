import { useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ContasConfig from "../components/ContasConfig";

export default function Config({ config, saveConfig, nomeUsuario, setPagina, isAdmin, entries }) {
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
    await saveConfig({ ...config, bancaB3: b3, bancaForex: forex }); // preserva saques e outras bancas
    setMsg("✓ Banca atualizada com sucesso!"); setTimeout(()=>setMsg(""),3000);
  }

  async function trocarSenha() {
    if (!senhaAtual || !senhaNova) { setMsgSenha("❌ Preencha os dois campos."); return; }
    if (senhaNova.length < 6) { setMsgSenha("❌ Nova senha deve ter ao menos 6 caracteres."); return; }
    try {
      const { error: erroAuth } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual });
      if (erroAuth) throw erroAuth;
      const { error } = await supabase.auth.updateUser({ password: senhaNova });
      if (error) throw error;
      setMsgSenha("✓ Senha alterada com sucesso!"); setSenhaAtual(""); setSenhaNova("");
      setTimeout(()=>setMsgSenha(""),3000);
    } catch(e) {
      setMsgSenha("❌ Senha atual incorreta."); setTimeout(()=>setMsgSenha(""),3000);
    }
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #26352e", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)" };
  const inpMono = { ...inp, fontFamily:"var(--font-mono)", fontSize:"16px", fontWeight:"700" };

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Configurações</h1>
        <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Personalize o app para sua realidade</p>
      </div>

      {/* Info conta */}
      <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 14px", color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Sua conta</p>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"linear-gradient(135deg,#2ee6a033,#0099ff33)", border:"1px solid #2ee6a044", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>
            {nomeUsuario?nomeUsuario[0].toUpperCase():"👤"}
          </div>
          <div>
            <p style={{ margin:"0 0 2px", color:"#f0f0f0", fontWeight:"700", fontSize:"15px" }}>{nomeUsuario || "Trader"}</p>
            <p style={{ margin:0, color:"#555", fontSize:"13px" }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Banca inicial */}
      <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
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
          <button onClick={salvarBanca} style={{ background:"linear-gradient(135deg,#2ee6a0,#1fc98a)", color:"#000", border:"none", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer" }}>
            Salvar banca
          </button>
          {msg && <span style={{ color:"#2ee6a0", fontSize:"13px", fontWeight:"600" }}>{msg}</span>}
        </div>
        <p style={{ margin:"12px 0 0", color:"#444", fontSize:"12px" }}>Todos os calculos de risco, meta e stop diario se baseiam nesses valores. Altere sempre que sua banca mudar significativamente.</p>
      </div>

      {/* Contas de trading */}
      <ContasConfig config={config} saveConfig={saveConfig} entries={entries}/>

      {/* Trocar senha */}
      <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
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
          <button onClick={trocarSenha} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid #26352e", color:"#ccc", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
            Alterar senha
          </button>
          {msgSenha && <span style={{ color:msgSenha.includes("✓")?"#2ee6a0":"#ff7a90", fontSize:"13px", fontWeight:"600" }}>{msgSenha}</span>}
        </div>
      </div>

      {/* Administração (só admin) */}
      {isAdmin && setPagina && (
        <div onClick={()=>setPagina("usuarios")} style={{background:"var(--card)",border:"1px solid #f5b94133",borderRadius:"14px",padding:"18px 22px",marginBottom:"16px",cursor:"pointer",display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"rgba(245,185,65,0.1)",border:"1px solid #f5b94144",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5b941" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 3px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Usuários e assinaturas <span style={{marginLeft:"6px",fontSize:"10px",fontWeight:"800",letterSpacing:"0.8px",color:"#f5b941",border:"1px solid #f5b94144",background:"#f5b94112",borderRadius:"20px",padding:"1px 7px",verticalAlign:"middle"}}>ADMIN</span></p>
            <p style={{margin:0,color:"#666",fontSize:"12.5px"}}>Criar contas para clientes, renovar, suspender e redefinir senhas.</p>
          </div>
          <span style={{color:"#f5b941",fontSize:"18px"}}>→</span>
        </div>
      )}

      {/* Termos */}
      {setPagina && (
        <div style={{background:"var(--panel)",border:"1px solid #18241f",borderRadius:"14px",padding:"18px 22px",marginBottom:"0"}}>
          <p style={{margin:"0 0 4px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Documentos Legais</p>
          <p style={{margin:"0 0 14px",color:"#555",fontSize:"13px"}}>Termos de uso e política de privacidade da plataforma.</p>
          <button onClick={()=>setPagina("termos")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",color:"#aaa",borderRadius:"10px",padding:"10px 20px",fontWeight:"600",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            📄 Ver Termos & Privacidade
          </button>
        </div>
      )}

      {/* Sair */}
      <div style={{ background:"var(--panel)", border:"1px solid #ff547022", borderRadius:"14px", padding:"22px" }}>
        <p style={{ margin:"0 0 8px", color:"#ff5470", fontSize:"14px", fontWeight:"700" }}>Sair da conta</p>
        <p style={{ margin:"0 0 14px", color:"#555", fontSize:"13px" }}>Seus dados ficam salvos no Firebase. Pode entrar novamente quando quiser.</p>
        <button onClick={logout} style={{ background:"rgba(255,84,112,0.1)", border:"1px solid #ff547033", color:"#ff7a90", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
          🚪 Sair da conta
        </button>
      </div>
    </div>
  );
}
