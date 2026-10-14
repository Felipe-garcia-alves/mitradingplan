import { useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export default function NovaSenha() {
  const { concluirRecovery, cancelarRecovery } = useAuth();
  const [senha,     setSenha]     = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro,      setErro]      = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit() {
    setErro("");
    if (senha.length < 6)     { setErro("Senha deve ter ao menos 6 caracteres."); return; }
    if (senha !== confirmar)  { setErro("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (!error) { concluirRecovery(); return; }

    const expirado = ["session_not_found", "session_expired", "bad_jwt", "refresh_token_not_found"].includes(error.code)
      || error.name === "AuthSessionMissingError";
    const msgs = {
      same_password: "A nova senha deve ser diferente da atual.",
      weak_password: "Senha muito fraca. Escolha uma senha mais forte.",
    };
    setErro(expirado
      ? "Este link expirou ou já foi usado. Volte ao login e peça um novo."
      : msgs[error.code] || "Não foi possível alterar a senha. Tente novamente.");
  }

  const inp = {
    width:"100%", background:"rgba(255,255,255,0.04)",
    border:"1px solid #26352e", borderRadius:"10px",
    padding:"13px 14px", color:"#f0f0f0", fontSize:"14px",
    outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)"
  };
  const lbl = {color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"};

  return (
    <div style={{minHeight:"100vh",background:"#050907",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{width:"48px",height:"48px",borderRadius:"12px",background:"linear-gradient(135deg,#2ee6a0,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>Mi Trading Plan</h1>
          <p style={{margin:0,color:"#555",fontSize:"13px"}}>Plataforma profissional para traders</p>
        </div>

        <div style={{background:"var(--panel)",border:"1px solid #18241f",borderRadius:"16px",padding:"32px"}}>
          <p style={{margin:"0 0 20px",color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>Definir nova senha</p>

          {erro && (
            <div style={{background:"rgba(255,84,112,0.1)",border:"1px solid rgba(255,84,112,0.2)",borderRadius:"8px",padding:"10px 14px",color:"#ff7a90",fontSize:"13px",marginBottom:"16px"}}>
              {erro}
            </div>
          )}

          <div style={{marginBottom:"14px"}}>
            <label style={lbl}>Nova senha</label>
            <input style={inp} type="password" autoComplete="new-password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)}/>
          </div>

          <div style={{marginBottom:"22px"}}>
            <label style={lbl}>Confirmar senha</label>
            <input style={inp} type="password" autoComplete="new-password" placeholder="••••••••" value={confirmar} onChange={e=>setConfirmar(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",fontWeight:"700",fontSize:"14px",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:"var(--font-sans)",marginBottom:"16px"}}>
            {loading?"Aguarde...":"Salvar nova senha"}
          </button>

          <div style={{display:"flex",justifyContent:"center"}}>
            <button onClick={cancelarRecovery} style={{background:"none",border:"none",color:"#555",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              ← Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
