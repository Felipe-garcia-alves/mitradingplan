import { useState } from "react";
import { supabase } from "../supabase";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Login() {
  const [modo,    setModo]    = useState("login");
  const [email,   setEmail]   = useState("");
  const [senha,   setSenha]   = useState("");
  const [nome,    setNome]    = useState("");
  const [erro,    setErro]    = useState("");
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(false);
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } }
        });
        if (error) throw error;
        // Cria o documento no Firestore com o uid do Supabase
        if (data.user) {
          await setDoc(doc(db, "usuarios", data.user.id), {
            nome, email,
            criadoEm: new Date().toISOString(),
            config: { bancaB3: 3000, bancaForex: 200 }
          });
        }
        setMsg("Cadastro realizado! Verifique seu email para confirmar a conta.");
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
      setErro(msgs[e.message] || e.message || "Erro ao autenticar.");
    }
    setLoading(false);
  }

  const inp = {
    width:"100%", background:"rgba(255,255,255,0.04)",
    border:"1px solid #2a2a3a", borderRadius:"10px",
    padding:"13px 14px", color:"#f0f0f0", fontSize:"14px",
    outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif"
  };

  return (
    <div style={{minHeight:"100vh",background:"#0d0d1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{width:"48px",height:"48px",borderRadius:"12px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h1 style={{margin:"0 0 4px",fontSize:"22px",fontWeight:"800",color:"#f0f0f0",letterSpacing:"-0.5px"}}>Mi Trading Plan</h1>
          <p style={{margin:0,color:"#555",fontSize:"13px"}}>Plataforma profissional para traders</p>
        </div>

        <div style={{background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"16px",padding:"32px"}}>

          {!resetMode && (
            <div style={{display:"flex",background:"rgba(255,255,255,0.03)",borderRadius:"10px",padding:"3px",marginBottom:"24px"}}>
              {["login","cadastro"].map(m=>(
                <button key={m} onClick={()=>{setModo(m);setErro("");setMsg("");}} style={{flex:1,padding:"9px",borderRadius:"8px",border:"none",cursor:"pointer",fontWeight:"600",fontSize:"13px",transition:"all 0.2s",background:modo===m?"rgba(255,255,255,0.07)":"transparent",color:modo===m?"#f0f0f0":"#666",fontFamily:"Inter,sans-serif"}}>
                  {m==="login"?"Entrar":"Criar conta"}
                </button>
              ))}
            </div>
          )}

          {resetMode && (
            <p style={{margin:"0 0 20px",color:"#f0f0f0",fontSize:"15px",fontWeight:"700"}}>Recuperar senha</p>
          )}

          {erro && (
            <div style={{background:"rgba(255,77,77,0.1)",border:"1px solid rgba(255,77,77,0.2)",borderRadius:"8px",padding:"10px 14px",color:"#ff6b6b",fontSize:"13px",marginBottom:"16px"}}>
              {erro}
            </div>
          )}

          {msg && (
            <div style={{background:"rgba(0,212,170,0.1)",border:"1px solid rgba(0,212,170,0.2)",borderRadius:"8px",padding:"10px 14px",color:"#00d4aa",fontSize:"13px",marginBottom:"16px"}}>
              {msg}
            </div>
          )}

          {!resetMode && modo==="cadastro" && (
            <div style={{marginBottom:"14px"}}>
              <label style={{color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Nome</label>
              <input style={inp} placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)}/>
            </div>
          )}

          <div style={{marginBottom:"14px"}}>
            <label style={{color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Email</label>
            <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>

          {!resetMode && (
            <div style={{marginBottom:"22px"}}>
              <label style={{color:"#666",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:"6px"}}>Senha</label>
              <input style={inp} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{width:"100%",padding:"13px",borderRadius:"10px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"14px",cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:"Inter,sans-serif",marginBottom:"16px"}}>
            {loading?"Aguarde...":resetMode?"Enviar email":modo==="login"?"Entrar":"Criar conta"}
          </button>

          <div style={{display:"flex",justifyContent:"center",gap:"16px"}}>
            {!resetMode && modo==="login" && (
              <button onClick={()=>{setResetMode(true);setErro("");setMsg("");}} style={{background:"none",border:"none",color:"#555",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                Esqueci minha senha
              </button>
            )}
            {resetMode && (
              <button onClick={()=>{setResetMode(false);setErro("");setMsg("");}} style={{background:"none",border:"none",color:"#555",fontSize:"12px",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                ← Voltar ao login
              </button>
            )}
          </div>

          <p style={{textAlign:"center",color:"#ccc",fontSize:"12px",marginTop:"20px",lineHeight:"1.6"}}>
            Seus dados são privados e protegidos.<br/>
            Ao criar conta você concorda com os{" "}
            <span onClick={()=>window.open("/termos","_blank")} style={{color:"#00d4aa",cursor:"pointer",textDecoration:"underline"}}>Termos de Uso</span>
            {" "}e a{" "}
            <span onClick={()=>window.open("/termos","_blank")} style={{color:"#00d4aa",cursor:"pointer",textDecoration:"underline"}}>Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
