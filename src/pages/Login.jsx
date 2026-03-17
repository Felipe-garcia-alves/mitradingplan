import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
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
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        if (!nome.trim()) { setErro("Digite seu nome."); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome, email,
          criadoEm: new Date().toISOString(),
          config: { bancaB3: 3000, bancaForex: 200 }
        });
      }
    } catch(e) {
      const msgs = {
        "auth/user-not-found":       "Email nao encontrado.",
        "auth/wrong-password":       "Senha incorreta.",
        "auth/email-already-in-use": "Email ja cadastrado.",
        "auth/weak-password":        "Senha deve ter ao menos 6 caracteres.",
        "auth/invalid-email":        "Email invalido.",
        "auth/invalid-credential":   "Email ou senha incorretos."
      };
      setErro(msgs[e.code] || "Erro ao autenticar. Tente novamente.");
    }
    setLoading(false);
  }

  const inp = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid #2a2a3a", borderRadius:"10px", padding:"12px 14px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"Inter,sans-serif" };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Inter,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"420px", background:"#111118", border:"1px solid #1e1e2e", borderRadius:"20px", padding:"40px", boxShadow:"0 25px 60px rgba(0,0,0,0.5)" }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"32px", justifyContent:"center" }}>
          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"linear-gradient(135deg,#00d4aa,#0099ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>⚡</div>
          <span style={{ fontSize:"20px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Mi Trading Plan</span>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", background:"rgba(255,255,255,0.04)", borderRadius:"10px", padding:"3px", marginBottom:"28px" }}>
          {["login","cadastro"].map(m => (
            <button key={m} onClick={() => { setModo(m); setErro(""); }} style={{ flex:1, padding:"9px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"600", fontSize:"13px", transition:"all 0.2s", background:modo===m?"rgba(255,255,255,0.08)":"transparent", color:modo===m?"#f0f0f0":"#666" }}>
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {erro && <div style={{ background:"rgba(255,77,77,0.1)", border:"1px solid rgba(255,77,77,0.2)", borderRadius:"8px", padding:"10px 14px", color:"#ff6b6b", fontSize:"13px", marginBottom:"14px" }}>{erro}</div>}

        {modo === "cadastro" && (
          <div style={{ marginBottom:"14px" }}>
            <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Seu nome</label>
            <input style={inp} placeholder="Ex: Felipe" value={nome} onChange={e => setNome(e.target.value)}/>
          </div>
        )}

        <div style={{ marginBottom:"14px" }}>
          <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Email</label>
          <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)}/>
        </div>

        <div style={{ marginBottom:"20px" }}>
          <label style={{ color:"#777", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Senha</label>
          <input style={inp} type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSubmit()}/>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:"10px", border:"none", background:"linear-gradient(135deg,#00d4aa,#00b894)", color:"#000", fontWeight:"700", fontSize:"14px", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
          {loading ? "Aguarde..." : modo === "login" ? "Entrar" : "Criar conta"}
        </button>

        <p style={{ textAlign:"center", color:"#444", fontSize:"12px", marginTop:"24px", lineHeight:"1.6" }}>
          Seus dados sao privados e protegidos.<br/>Cada usuario ve apenas suas proprias operacoes.
        </p>
      </div>
    </div>
  );
}
