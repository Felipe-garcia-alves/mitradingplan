import { useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ContasConfig from "../components/ContasConfig";
import { Confirmar, CampoSenha } from "../components/ui";
import { validarSenha, erroDeSenha, REGRA_SENHA } from "../lib/senha";
import { FUNDOS, CARDS, useAparencia, aplicarTema, aplicarFundo, aplicarCards, aplicarFlutuar } from "../lib/tema";

const rotulo = { margin:"0 0 10px", color:"var(--text-2)", fontSize:"13px", fontWeight:"700" };

// Tema, cor de fundo e movimento dos cards — vale para este navegador
function Aparencia() {
  const { tema, fundo, cards, flutuar } = useAparencia();
  const escuro = tema !== "light";
  // a amostra mostra a combinação: o fundo escolhido com os cards escolhidos
  const corFundo = FUNDOS.find(f => f.id === fundo).cor;
  const [corCard, corBorda] = CARDS.find(c => c.id === cards).cores;
  const amostra = (bg, card, borda) => (
    <div className="mtp-fundo-amostra" style={{ background:bg }}>
      <i style={{ left:"10px", top:"12px", width:"58%", height:"30px", background:card, border:"1px solid "+borda }}/>
      <i style={{ left:"18px", top:"30px", width:"30%", height:"3px", background:"#2ee6a0", borderRadius:"2px" }}/>
      <i style={{ right:"10px", top:"12px", width:"22%", height:"30px", background:card, border:"1px solid "+borda }}/>
      <i style={{ left:"10px", right:"10px", bottom:"10px", height:"14px", background:card, border:"1px solid "+borda }}/>
    </div>
  );
  const opcao = (id, ativo, nome, desc, onClick, visual) => (
    <button key={id} type="button" disabled={!escuro} onClick={onClick} className={"mtp-fundo-opcao"+(escuro && ativo?" on":"")}>
      {visual}
      <span>
        <span style={{ display:"block", fontSize:"13px", fontWeight:"700" }}>{nome}</span>
        <span style={{ display:"block", marginTop:"2px", color:"var(--text-3)", fontSize:"11.5px" }}>{desc}</span>
      </span>
    </button>
  );
  const so = !escuro && <span style={{ color:"var(--text-3)", fontWeight:500 }}>· só no tema escuro</span>;
  return (
    <div style={{ background:"var(--panel)", border:"1px solid var(--line)", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
      <p style={{ margin:"0 0 4px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Aparência</p>
      <p style={{ margin:"0 0 18px", color:"var(--text-3)", fontSize:"12.5px" }}>Escolha o visual que mais combina com você. Fica salvo neste navegador.</p>

      <p style={rotulo}>Tema</p>
      <div className="mtp-seg" style={{ marginBottom:"22px" }}>
        {[["dark","Escuro"],["light","Claro"]].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>aplicarTema(v)} className={tema===v?"on":""} style={{ "--seg":"var(--accent)", fontFamily:"var(--font-sans)" }}>{l}</button>
        ))}
      </div>

      <p style={rotulo}>Cor do fundo {so}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"12px", marginBottom:"22px" }}>
        {FUNDOS.map(f => opcao(f.id, fundo===f.id, f.nome, f.desc, ()=>aplicarFundo(f.id), amostra(f.cor, corCard, corBorda)))}
      </div>

      <p style={rotulo}>Cor dos cards {so}</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"12px", marginBottom:"22px" }}>
        {CARDS.map(c => opcao(c.id, cards===c.id, c.nome, c.desc, ()=>aplicarCards(c.id), amostra(corFundo, c.cores[0], c.cores[1])))}
      </div>

      <label style={{ display:"flex", alignItems:"center", gap:"12px", cursor:"pointer" }}>
        <input type="checkbox" checked={flutuar} onChange={e=>aplicarFlutuar(e.target.checked)} style={{ width:"18px", height:"18px", accentColor:"var(--accent)", cursor:"pointer" }}/>
        <span>
          <span style={{ display:"block", color:"var(--text-2)", fontSize:"13px", fontWeight:"700" }}>Cards flutuando</span>
          <span style={{ display:"block", color:"var(--text-3)", fontSize:"12px" }}>o leve movimento dos cards na Evolução</span>
        </span>
      </label>
    </div>
  );
}

export default function Config({ config, saveConfig, nomeUsuario, setPagina, isAdmin, entries, compliance, saveCompliance }) {
  const { user, logout } = useAuth();
  const [senhaAtual,  setSenhaAtual]  = useState("");
  const [senhaNova,   setSenhaNova]   = useState("");
  const [msgSenha,   setMsgSenha]   = useState("");
  const [zerarDisc,  setZerarDisc]  = useState(false);
  const [msgDados,   setMsgDados]   = useState("");
  const diasDisciplina = Object.keys(compliance || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).length;



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

  const inp = { width:"100%", background:"color-mix(in srgb, var(--ink) 5%, transparent)", border:"1px solid var(--line-strong)", borderRadius:"10px", padding:"11px 13px", color:"var(--text)", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)" };

  return (
    <div style={{ fontFamily:"var(--font-sans)" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"var(--text)", letterSpacing:"-0.5px" }}>Configurações</h1>
        <p style={{ margin:0, color:"var(--text-3)", fontSize:"13px" }}>Personalize o app para sua realidade</p>
      </div>

      {/* Info conta */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--line)", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 14px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Sua conta</p>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"linear-gradient(135deg,#2ee6a033,#0099ff33)", border:"1px solid color-mix(in srgb, var(--accent) 26.7%, transparent)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", flexShrink:0 }}>
            {nomeUsuario?nomeUsuario[0].toUpperCase():"👤"}
          </div>
          <div>
            <p style={{ margin:"0 0 2px", color:"var(--text)", fontWeight:"700", fontSize:"15px" }}>{nomeUsuario || "Trader"}</p>
            <p style={{ margin:0, color:"var(--text-3)", fontSize:"13px" }}>{user?.email}</p>
          </div>
        </div>
      </div>

      <Aparencia/>

      {/* Contas de trading */}
      <ContasConfig config={config} saveConfig={saveConfig} entries={entries}/>

      {/* Dados */}
      {saveCompliance && (
        <div style={{ background:"var(--panel)", border:"1px solid var(--line)", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
          <p style={{ margin:"0 0 6px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Dados</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
            <div>
              <p style={{ margin:0, color:"var(--text)", fontSize:"14px", fontWeight:"700" }}>Histórico de disciplina</p>
              <p style={{ margin:"3px 0 0", color:"var(--text-3)", fontSize:"12.5px" }}>
                {diasDisciplina ? diasDisciplina+" dia"+(diasDisciplina===1?"":"s")+" registrados — alimenta a Streak de Disciplina e a % de disciplina." : "Nenhum dia registrado."}
              </p>
            </div>
            <button disabled={!diasDisciplina} onClick={()=>setZerarDisc(true)}
              style={{ background:"color-mix(in srgb, var(--neg) 6%, transparent)", border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)", borderRadius:"10px", padding:"9px 16px", color: diasDisciplina ? "var(--neg-soft)" : "var(--text-3)", fontSize:"12.5px", fontWeight:"700", cursor: diasDisciplina ? "pointer" : "not-allowed", fontFamily:"var(--font-sans)", opacity: diasDisciplina ? 1 : 0.5 }}>
              Apagar histórico de disciplina
            </button>
          </div>
          {msgDados && <p style={{ margin:"10px 0 0", color: msgDados.startsWith("✓") ? "var(--accent)" : "var(--neg-soft)", fontSize:"13px" }}>{msgDados}</p>}
        </div>
      )}
      {zerarDisc && (
        <Confirmar titulo="Apagar todo o histórico de disciplina?"
          texto={"Os "+diasDisciplina+" dias registrados serão apagados e a Streak de Disciplina volta a zero. Suas operações do Diário não são afetadas. Não dá para desfazer."}
          botao="Apagar histórico" onCancelar={()=>setZerarDisc(false)}
          onConfirmar={async()=>{ await saveCompliance({}); setZerarDisc(false); setMsgDados("✓ Histórico de disciplina apagado."); setTimeout(()=>setMsgDados(""),3000); }}/>
      )}

      {/* Trocar senha */}
      <div style={{ background:"var(--panel)", border:"1px solid var(--line)", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
        <p style={{ margin:"0 0 16px", color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Alterar senha</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
          <div>
            <label style={{ color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Senha atual</label>
            <CampoSenha style={inp} autoComplete="current-password" value={senhaAtual} onChange={e=>setSenhaAtual(e.target.value)} placeholder="••••••••"/>
          </div>
          <div>
            <label style={{ color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px", display:"block", marginBottom:"6px" }}>Nova senha</label>
            <CampoSenha style={inp} autoComplete="new-password" value={senhaNova} onChange={e=>setSenhaNova(e.target.value)} placeholder={REGRA_SENHA}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <button onClick={trocarSenha} style={{ background:"color-mix(in srgb, var(--ink) 6%, transparent)", border:"1px solid var(--line-strong)", color:"var(--text-2)", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
            Alterar senha
          </button>
          {msgSenha && <span style={{ color:msgSenha.includes("✓")?"var(--accent)":"var(--neg-soft)", fontSize:"13px", fontWeight:"600" }}>{msgSenha}</span>}
        </div>
      </div>

      {/* Administração (só admin) */}
      {isAdmin && setPagina && (
        <div onClick={()=>setPagina("usuarios")} style={{background:"var(--card)",border:"1px solid color-mix(in srgb, var(--warn) 20%, transparent)",borderRadius:"14px",padding:"18px 22px",marginBottom:"16px",cursor:"pointer",display:"flex",alignItems:"center",gap:"16px"}}>
          <div style={{width:"44px",height:"44px",borderRadius:"12px",background:"color-mix(in srgb, var(--warn) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 3px",color:"var(--text)",fontSize:"14px",fontWeight:"700"}}>Usuários e assinaturas <span style={{marginLeft:"6px",fontSize:"10px",fontWeight:"800",letterSpacing:"0.8px",color:"var(--warn)",border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)",background:"color-mix(in srgb, var(--warn) 7.1%, transparent)",borderRadius:"20px",padding:"1px 7px",verticalAlign:"middle"}}>ADMIN</span></p>
            <p style={{margin:0,color:"var(--text-mute)",fontSize:"12.5px"}}>Criar contas para clientes, renovar, suspender e redefinir senhas.</p>
          </div>
          <span style={{color:"var(--warn)",fontSize:"18px"}}>→</span>
        </div>
      )}

      {/* Termos */}
      {setPagina && (
        <div style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"14px",padding:"18px 22px",marginBottom:"0"}}>
          <p style={{margin:"0 0 4px",color:"var(--text)",fontSize:"14px",fontWeight:"700"}}>Documentos Legais</p>
          <p style={{margin:"0 0 14px",color:"var(--text-3)",fontSize:"13px"}}>Termos de uso e política de privacidade da plataforma.</p>
          <button onClick={()=>setPagina("termos")} style={{background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line-strong)",color:"var(--text-soft)",borderRadius:"10px",padding:"10px 20px",fontWeight:"600",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
            📄 Ver Termos & Privacidade
          </button>
        </div>
      )}

      {/* Sair */}
      <div style={{ background:"var(--panel)", border:"1px solid color-mix(in srgb, var(--neg) 13.3%, transparent)", borderRadius:"14px", padding:"22px" }}>
        <p style={{ margin:"0 0 8px", color:"var(--neg)", fontSize:"14px", fontWeight:"700" }}>Sair da conta</p>
        <p style={{ margin:"0 0 14px", color:"var(--text-3)", fontSize:"13px" }}>Seus dados ficam salvos no Firebase. Pode entrar novamente quando quiser.</p>
        <button onClick={logout} style={{ background:"color-mix(in srgb, var(--neg) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)", color:"var(--neg-soft)", borderRadius:"10px", padding:"11px 22px", fontWeight:"700", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>
          🚪 Sair da conta
        </button>
      </div>
    </div>
  );
}
