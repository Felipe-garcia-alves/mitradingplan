import { useState } from "react";
import { validarSenha, erroDeSenha } from "../lib/senha";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export default function NovaSenha() {
  const { concluirRecovery, cancelarRecovery, convite } = useAuth();
  const [senha,     setSenha]     = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro,      setErro]      = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit() {
    setErro("");
    const regra = validarSenha(senha);
    if (regra)                { setErro(regra); return; }
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
      : erroDeSenha(error) || msgs[error.code] || "Não foi possível alterar a senha. Tente novamente.");
  }

  const inp = {
    width:"100%", background:"color-mix(in srgb, var(--ink) 4%, transparent)",
    border:"1px solid var(--line-strong)", borderRadius:"10px",
    padding:"13px 14px", color:"var(--text)", fontSize:"14px",
    outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)"
  };
  const lbl = {color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"};

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-sans)",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{width:"48px",height:"48px",borderRadius:"12px",background:"linear-gradient(135deg,#2ee6a0,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"var(--text)",letterSpacing:"-0.5px"}}>Mi Trading Plan</h1>
          <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>Plataforma profissional para traders</p>
        </div>

        <div style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"16px",padding:"32px"}}>
          <p style={{margin:convite?"0 0 6px":"0 0 20px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>{convite ? "Bem-vindo! Crie sua senha" : "Definir nova senha"}</p>
          {convite && <p style={{margin:"0 0 20px",color:"var(--text-3)",fontSize:"13px",lineHeight:1.5}}>Seu acesso ao Mi Trading Plan está pronto. Escolha a senha que vai usar para entrar.</p>}

          {erro && (
            <div style={{background:"color-mix(in srgb, var(--neg) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)",borderRadius:"8px",padding:"10px 14px",color:"var(--neg-soft)",fontSize:"13px",marginBottom:"16px"}}>
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
            {loading?"Aguarde...":convite?"Criar senha e entrar":"Salvar nova senha"}
          </button>

          <div style={{display:"flex",justifyContent:"center"}}>
            <button onClick={cancelarRecovery} style={{background:"none",border:"none",color:"var(--text-3)",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
              ← Voltar ao login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
