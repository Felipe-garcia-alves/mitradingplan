import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Login() {
  const [modo, setModo]       = useState("login");
  const [email, setEmail]     = useState("");
  const [senha, setSenha]     = useState("");
  const [nome, setNome]       = useState("");
  const [erro, setErro]       = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setErro(""); setLoading(true);
    try {
      if (modo === "login") {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setErro("Email não verificado. Verifique sua caixa de entrada.");
          setLoading(false); return;
        }
      } else {
        if (!nome.trim()) { setErro("Digite seu nome."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await sendEmailVerification(cred.user);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome, email, criadoEm: new Date().toISOString(),
          config: { bancaB3: 3000, bancaForex: 200 }
        });
        await signOut(auth);
        setModo("login");
        setErro("✅ Conta criada! Verifique seu email antes de entrar.");
        setLoading(false); return;
      }
    } catch(e) {
      const msgs = {
        "auth/user-not-found":"Email não encontrado.",
        "auth/wrong-password":"Senha incorreta.",
        "auth/email-already-in-use":"Email já cadastrado.",
        "auth/weak-password":"Senha deve ter ao menos 6 caracteres.",
        "auth/invalid-email":"Email inválido.",
        "auth/invalid-credential":"Email ou senha incorretos."
      };
      setErro(msgs[e.code] || "Erro ao autenticar.");
    }
    setLoading(false);
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"13px 14px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif", transition:"border 0.2s" };

  return (
    <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,sans-serif", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:"400px" }}>
        <div style={{ textAlign:"center", marginBottom:"32px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4aa,#0099ff)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Mi Trading Plan</h1>
          <p style={{ margin:0, color:"#444", fontSize:"13px" }}>Plataforma profissional para traders</p>
        </div>

        <div style={{ background:"#0d0d14", border:"1px solid #1a1a2e", borderRadius:"16px", padding:"32px" }}>
          <div style={{ display:"flex", background:"rgba(255,255,255,0.03)", borderRadius:"10px", padding:"3px", marginBottom:"24px" }}>
            {["login","cadastro"].map(m => (
              <button key={m} onClick={() => { setModo(m); setErro(""); }} style={{ flex:1, padding:"9px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"600", fontSize:"13px", transition:"all 0.2s", background:modo===m?"rgba(255,255,255,0.07)":"transparent", color:modo===m?"#f0f0f0":"#555", fontFamily:"Inter,sans-serif" }}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {erro && (
            <div style={{ background:erro.includes("✅")?"rgba(0,212,170,0.1)":"rgba(255,77,77,0.1)", border:"1px solid "+(erro.includes("✅")?"#00d4aa44":"rgba(255,77,77,0.2)"), borderRadius:"8px", padding:"10px 14px", color:erro.includes("✅")?"#00d4aa":"#ff6b6b", fontSize:"13px", marginBottom:"16px" }}>
              {erro}
            </div>
          )}

          {modo === "cadastro" && (
            <div style={{ marginBottom:"14px" }}>
              <label style={{ color:"#555", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Nome</label>
              <input style={inp} placeholder="Seu nome" value={nome} onChange={e=>setNome(e.target.value)}/>
            </div>
          )}
          <div style={{ marginBottom:"14px" }}>
            <label style={{ color:"#555", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Email</label>
            <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>
          <div style={{ marginBottom:"22px" }}>
            <label style={{ color:"#555", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Senha</label>
            <input style={inp} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", fontWeight:"700", fontSize:"14px", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, fontFamily:"Inter,sans-serif" }}>
            {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
          </button>

          <p style={{ textAlign:"center", color:"#333", fontSize:"12px", marginTop:"20px", lineHeight:"1.6" }}>
            Seus dados são privados e protegidos.<br/>Cada usuário vê apenas suas próprias operações.
          </p>
        </div>
      </div>
    </div>
  );
}
