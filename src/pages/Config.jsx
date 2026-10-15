import { useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ContasConfig from "../components/ContasConfig";
import { Confirmar } from "../components/ui";
import { validarSenha, erroDeSenha, REGRA_SENHA } from "../lib/senha";

export default function Config({ config, saveConfig, nomeUsuario, setPagina, isAdmin, entries, compliance, saveCompliance }) {
  const { user, logout } = useAuth();
  const [senhaAtual,  setSenhaAtual]  = useState("");
  const [senhaNova,   setSenhaNova]   = useState("");
  const [msgSenha,   setMsgSenha]   = useState("");
  const [zerarDisc,  setZerarDisc]  = useState(false);
  const [msgDados,   setMsgDados]   = useState("");
  const diasDisciplina = Object.keys(compliance || {}).length;



  async function trocarSenha() {
    if (!senhaAtual || !senhaNova) { setMsgSenha("❌ Preencha os dois campos."); return; }
    const regra = validarSenha(senhaNova);
    if (regra) { setMsgSenha("❌ "+regra); return; }
    const { error: erroAuth } = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual });
    if (erroAuth) { setMsgSenha("❌ Senha atual incorreta."); setTimeout(()=>setMsgSenha(""),4000); return; }
    const { error } = await supabase.auth.updateUser({ password: senhaNova });
    if (error) { setMsgSenha("❌ "+(erroDeSenha(error) || "Não foi possível alterar a senha. Tente novamente.")); return; }
    setMsgSenha("✓ Senha alterada com sucesso!"); setSenhaAtual(""); setSenhaNova("");
    setTimeout(()=>setMsgSenha(""),3000);
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #26352e", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)" };

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Configurações</h1>
        <p style={{ margin:0, color:"#7a8c84", fontSize:"13px" }}>Personalize o app para sua realidade</p>
      </div>

      {/* Info conta */}
      <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 14px", color:"#93a39c", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Sua conta</p>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"linear-gradient(135deg,#2ee6a033,#0099ff33)", border:"1px solid #2ee6a044", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>
            {nomeUsuario?nomeUsuario[0].toUpperCase():"👤"}
          </div>
          <div>
            <p style={{ margin:"0 0 2px", color:"#f0f0f0", fontWeight:"700", fontSize:"15px" }}>{nomeUsuario || "Trader"}</p>
            <p style={{ margin:0, color:"#7a8c84", fontSize:"13px" }}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Contas de trading */}
      <ContasConfig config={config} saveConfig={saveConfig} entries={entries}/>

      {/* Dados */}
      {saveCompliance && (
        <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
          <p style={{ margin:"0 0 6px", color:"#93a39c", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Dados</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
            <div>
              <p style={{ margin:0, color:"var(--text)", fontSize:"14px", fontWeight:"700" }}>Histórico de disciplina</p>
              <p style={{ margin:"3px 0 0", color:"var(--text-3)", fontSize:"12.5px" }}>
                {diasDisciplina ? diasDisciplina+" dia"+(diasDisciplina===1?"":"s")+" registrados — alimenta a Streak de Disciplina e a % de disciplina." : "Nenhum dia registrado."}
              </p>
            </div>
            <button disabled={!diasDisciplina} onClick={()=>setZerarDisc(true)}
              style={{ background:"rgba(255,84,112,0.06)", border:"1px solid #ff547033", borderRadius:"10px", padding:"9px 16px", color: diasDisciplina ? "#ff7a90" : "var(--text-3)", fontSize:"12.5px", fontWeight:"700", cursor: diasDisciplina ? "pointer" : "not-allowed", fontFamily:"var(--font-sans)", opacity: diasDisciplina ? 1 : 0.5 }}>
              Apagar histórico de disciplina
            </button>
          </div>
          {msgDados && <p style={{ margin:"10px 0 0", color: msgDados.startsWith("✓") ? "#2ee6a0" : "#ff7a90", fontSize:"13px" }}>{msgDados}</p>}
        </div>
      )}
      {zerarDisc && (
        <Confirmar titulo="Apagar todo o histórico de disciplina?"
          texto={"Os "+diasDisciplina+" dias registrados serão apagados e a Streak de Disciplina volta a zero. Suas operações do Diário não são afetadas. Não dá para desfazer."}
          botao="Apagar histórico" onCancelar={()=>setZerarDisc(false)}
          onConfirmar={async()=>{ await saveCompliance({}); setZerarDisc(false); setMsgDados("✓ Histórico de disciplina apagado."); setTimeout(()=>setMsgDados(""),3000); }}/>
      )}

      {/* Trocar senha */}
      <div style={{ background:"var(--panel)", border:"1px solid #18241f", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 16px", color:"#93a39c", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Alterar senha</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
          <div>
            <label style={{ color:"#93a39c", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Senha atual</label>
            <input style={inp} type="password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} placeholder="••••••••"/>
          </div>
          <div>
            <label style={{ color:"#93a39c", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Nova senha</label>
            <input style={inp} type="password" value={senhaNova} onChange={e=>setSenhaNova(e.target.value)} placeholder={REGRA_SENHA}/>
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
            <p style={{margin:0,color:"#86978f",fontSize:"12.5px"}}>Criar contas para clientes, renovar, suspender e redefinir senhas.</p>
          </div>
          <span style={{color:"#f5b941",fontSize:"18px"}}>→</span>
        </div>
      )}

      {/* Termos */}
      {setPagina && (
        <div style={{background:"var(--panel)",border:"1px solid #18241f",borderRadius:"14px",padding:"18px 22px",marginBottom:"0"}}>
          <p style={{margin:"0 0 4px",color:"#f0f0f0",fontSize:"14px",fontWeight:"700"}}>Documentos Legais</p>
          <p style={{margin:"0 0 14px",color:"#7a8c84",fontSize:"13px"}}>Termos de uso e política de privacidade da plataforma.</p>
          <button onClick={()=>setPagina("termos")} style={{background:"rgba(255,255,255,0.04)",border:"1px solid #26352e",color:"#aaa",borderRadius:"10px",padding:"10px 20px",fontWeight:"600",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            📄 Ver Termos & Privacidade
          </button>
        </div>
      )}

      {/* Sair */}
      <div style={{ background:"var(--panel)", border:"1px solid #ff547022", borderRadius:"14px", padding:"22px" }}>
        <p style={{ margin:"0 0 8px", color:"#ff5470", fontSize:"14px", fontWeight:"700" }}>Sair da conta</p>
        <p style={{ margin:"0 0 14px", color:"#7a8c84", fontSize:"13px" }}>Seus dados ficam salvos no Firebase. Pode entrar novamente quando quiser.</p>
        <button onClick={logout} style={{ background:"rgba(255,84,112,0.1)", border:"1px solid #ff547033", color:"#ff7a90", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
          🚪 Sair da conta
        </button>
      </div>
    </div>
  );
}
