import { useState } from "react";
import { validarSenha, erroDeSenha } from "../lib/senha";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import Termos from "./Termos";

// Duração do teste grátis do cadastro público — manter igual à trigger handle_new_user
const DIAS_TESTE = 15;

export default function Login() {
  const { erroLink } = useAuth();
  const [modo,    setModo]    = useState("login");
  const [email,   setEmail]   = useState("");
  const [senha,   setSenha]   = useState("");
  const [nome,    setNome]    = useState("");
  const [erro,    setErro]    = useState(erroLink);
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showTermos, setShowTermos] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function handleSubmit() {
    setErro(""); setMsg(""); setLoading(true);
    try {
      if (resetMode) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMsg("Email de recuperação enviado! Verifique sua caixa de entrada.");
        setLoading(false);
        return;
      }

      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;

      } else {
        if (!nome.trim()) { setErro("Digite seu nome."); setLoading(false); return; }
        const regra = validarSenha(senha);
        if (regra) { setErro(regra); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } }
        });
        if (error) throw error;
        // O perfil em public.usuarios é criado pela trigger on_auth_user_created
        setMsg("Cadastro realizado! Confirme seu email para começar seus "+DIAS_TESTE+" dias de teste grátis.");
        setLoading(false);
        return;
      }
    } catch(e) {
      const msgs = {
        "Invalid login credentials":        "Email ou senha incorretos.",
        "Email not confirmed":              "Confirme seu email antes de entrar.",
        "User already registered":          "Email já cadastrado.",
        "Password should be at least 6 characters": "Senha deve ter ao menos 6 caracteres.",
      };
      setErro(msgs[e.message] || erroDeSenha(e) || e.message || "Erro ao autenticar.");
    }
    setLoading(false);
  }

  const inp = {
    width:"100%", background:"color-mix(in srgb, var(--ink) 4%, transparent)",
    border:"1px solid var(--line-strong)", borderRadius:"10px",
    padding:"13px 14px", color:"var(--text)", fontSize:"14px",
    outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)"
  };

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

          {!resetMode && (
            <div style={{display:"flex",background:"color-mix(in srgb, var(--ink) 3%, transparent)",borderRadius:"10px",padding:"3px",marginBottom:"24px"}}>
              {["login","cadastro"].map(m=>(
                <button key={m} onClick={()=>{setModo(m);setErro("");setMsg("");}} style={{flex:1,padding:"9px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"13px",transition:"all 0.2s",background:modo===m?"color-mix(in srgb, var(--ink) 7%, transparent)":"transparent",color:modo===m?"var(--text)":"var(--text-4)",fontFamily:"var(--font-sans)"}}>
                  {m==="login"?"Entrar":"Criar conta"}
                </button>
              ))}
            </div>
          )}

          {resetMode && (
            <p style={{margin:"0 0 20px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>Recuperar senha</p>
          )}

          {erro && (
            <div style={{background:"color-mix(in srgb, var(--neg) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)",borderRadius:"8px",padding:"10px 14px",color:"var(--neg-soft)",fontSize:"13px",marginBottom:"16px"}}>
              {erro}
            </div>
          )}

          {msg && (
            <div style={{background:"color-mix(in srgb, var(--accent) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)",borderRadius:"8px",padding:"10px 14px",color:"var(--accent)",fontSize:"13px",marginBottom:"16px"}}>
              {msg}
            </div>
          )}

          {!resetMode && modo==="cadastro" && (
            <div style={{display:"flex",gap:"12px",alignItems:"center",padding:"12px 14px",borderRadius:"12px",marginBottom:"18px",background:"linear-gradient(135deg,rgba(46,230,160,0.12),color-mix(in srgb, var(--accent-2) 6%, transparent))",border:"1px solid color-mix(in srgb, var(--accent) 30%, transparent)"}}>
              <div style={{width:"36px",height:"36px",borderRadius:"10px",flexShrink:0,background:"color-mix(in srgb, var(--accent) 15%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 40%, transparent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <p style={{margin:0,color:"var(--text)",fontSize:"14px",fontWeight:"800"}}>{DIAS_TESTE} dias grátis para testar</p>
                <p style={{margin:"2px 0 0",color:"var(--text-2)",fontSize:"12px",lineHeight:1.5}}>Acesso completo, sem cartão de crédito. Depois é só assinar para continuar.</p>
              </div>
            </div>
          )}

          {!resetMode && modo==="cadastro" && (
            <div style={{marginBottom:"14px"}}>
              <label style={{color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Nome</label>
              <input style={inp} placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)}/>
            </div>
          )}

          <div style={{marginBottom:"14px"}}>
            <label style={{color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Email</label>
            <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>

          {!resetMode && (
            <div style={{marginBottom:"22px"}}>
              <label style={{color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Senha</label>
              <input style={inp} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",fontWeight:"700",fontSize:"14px",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:"var(--font-sans)",marginBottom:"16px"}}>
            {loading?"Aguarde...":resetMode?"Enviar email":modo==="login"?"Entrar":"Criar conta"}
          </button>

          <div style={{display:"flex",justifyContent:"center",gap:"16px"}}>
            {!resetMode && modo==="login" && (
              <button onClick={()=>{setResetMode(true);setErro("");setMsg("");}} style={{background:"none",border:"none",color:"var(--text-3)",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                Esqueci minha senha
              </button>
            )}
            {resetMode && (
              <button onClick={()=>{setResetMode(false);setErro("");setMsg("");}} style={{background:"none",border:"none",color:"var(--text-3)",fontSize:"12px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                ← Voltar ao login
              </button>
            )}
          </div>

          <p style={{textAlign:"center",color:"var(--text-2)",fontSize:"12px",marginTop:"20px",lineHeight:"1.6"}}>
            Seus dados são privados e protegidos.<br/>
            Ao criar conta você concorda com os{" "}
            <span onClick={()=>setShowTermos(true)} style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}}>Termos de Uso</span>
            {" "}e a{" "}
            <span onClick={()=>setShowTermos(true)} style={{color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}}>Política de Privacidade</span>.

      {showTermos && (
        <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.85)",overflowY:"auto"}}>
          <Termos onVoltar={()=>setShowTermos(false)}/>
        </div>
      )}
          </p>
        </div>
      </div>
    </div>
  );
}
