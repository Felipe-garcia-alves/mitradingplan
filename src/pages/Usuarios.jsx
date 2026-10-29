// Mi Trading Plan - gestão de usuários e assinaturas (só admin)
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";
import { CountUp, Modal } from "../components/ui";
import { gerarSenha, validarSenha, REGRA_SENHA } from "../lib/senha";
import { alfa } from "../lib/cor.js";

// Chamada à Edge Function admin-usuarios (a chave secreta fica só no servidor)
async function chamarAdmin(body) {
  const { data, error } = await supabase.functions.invoke("admin-usuarios", { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.erro) msg = j.erro; } catch { /* resposta sem JSON */ }
    throw new Error(msg);
  }
  if (data?.erro) throw new Error(data.erro);
  return data;
}

const PLANOS = {
  mensal:   { label:"Mensal",          status:"ativa", dias:30 },
  teste:    { label:"Teste grátis",    status:"teste", dias:15 },
  cortesia: { label:"Cortesia",        status:"ativa", dias:null },
};

const STATUS_COR = { ativa:"var(--accent)", teste:"var(--info)", suspensa:"var(--warn)", cancelada:"var(--neg)", vencida:"var(--neg)" };
const STATUS_TXT = { ativa:"Ativa", teste:"Teste", suspensa:"Suspensa", cancelada:"Cancelada", vencida:"Vencida" };

function hojeISO() {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function maisDias(base, dias) {
  const ref = base && base > hojeISO() ? base : hojeISO();
  const d = new Date(ref+"T12:00:00"); d.setDate(d.getDate()+dias);
  return d.toISOString().slice(0,10);
}
function fmtData(s) { if (!s) return "—"; const p = s.slice(0,10).split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
function diasAte(s) { if (!s) return null; return Math.round((new Date(s+"T12:00:00") - new Date(hojeISO()+"T12:00:00"))/86400000); }
// status efetivo: assinatura com data passada conta como vencida
function statusEfetivo(u) {
  if (u.papel === "admin") return "ativa";
  if ((u.status_assinatura === "ativa" || u.status_assinatura === "teste") && u.assinatura_ate && u.assinatura_ate < hojeISO()) return "vencida";
  return u.status_assinatura || "ativa";
}

const kpiLabel = {margin:0,color:"var(--text-3)",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.2px"};
const inp = {width:"100%",background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line-strong)",borderRadius:"10px",padding:"11px 13px",color:"var(--text)",fontSize:"14px",outline:"none",boxSizing:"border-box",fontFamily:"var(--font-sans)"};
const btnSec = {background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line)",borderRadius:"8px",padding:"6px 11px",color:"var(--text-2)",fontSize:"11.5px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)",whiteSpace:"nowrap"};

export default function Usuarios({ onVoltar, api = chamarAdmin }) {
  const [lista,    setLista]    = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro,     setErro]     = useState("");
  const [busca,    setBusca]    = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [criado,   setCriado]   = useState(null);   // credenciais para repassar ao cliente
  const [senhaDe,  setSenhaDe]  = useState(null);   // usuário com troca de senha aberta
  const [excluirDe, setExcluirDe] = useState(null); // usuário com a confirmação de exclusão aberta
  const [ocupado,  setOcupado]  = useState("");

  const carregar = useCallback(async () => {
    try { const r = await api({ acao:"listar" }); setLista(r.usuarios || []); setErro(""); }
    catch (e) { setErro(e.message); }
    finally { setCarregando(false); }
  }, [api]);

  useEffect(() => { carregar(); }, [carregar]);

  async function acao(id, body, rotulo) {
    setOcupado(id+rotulo); setErro("");
    try { await api({ acao:"atualizar", id, ...body }); await carregar(); }
    catch (e) { setErro(e.message); }
    setOcupado("");
  }

  const comStatus = lista.map(u => ({ ...u, efetivo: statusEfetivo(u) }));
  const filtrados = comStatus.filter(u => !busca || (u.nome||"").toLowerCase().includes(busca.toLowerCase()) || (u.email||"").toLowerCase().includes(busca.toLowerCase()));
  const conta = st => comStatus.filter(u => u.papel!=="admin" && u.efetivo===st).length;
  const clientes = comStatus.filter(u => u.papel!=="admin").length;

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"24px",flexWrap:"wrap",gap:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          {onVoltar && <button onClick={onVoltar} style={{...btnSec,padding:"8px 12px"}}>← Voltar</button>}
          <div>
            <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"var(--text)",letterSpacing:"-0.8px"}}>Usuários</h1>
            <p style={{margin:"4px 0 0",color:"var(--text-mute)",fontSize:"13px"}}>Crie acessos e controle as assinaturas dos seus clientes</p>
          </div>
        </div>
        <button onClick={()=>{ setNovoAberto(true); setCriado(null); }} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"10px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>
          + Novo usuário
        </button>
      </div>

      {/* Resumo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"14px",marginBottom:"24px"}}>
        {[
          {l:"Clientes",          v:clientes,          c:"var(--text)"},
          {l:"Ativos",            v:conta("ativa"),    c:"var(--accent)"},
          {l:"Em teste",          v:conta("teste"),    c:"var(--info)"},
          {l:"Vencidos/suspensos",v:conta("vencida")+conta("suspensa")+conta("cancelada"), c:"var(--neg)"},
        ].map(k=>(
          <div key={k.l} style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"16px 20px",display:"flex",flexDirection:"column",gap:"8px"}}>
            <p style={kpiLabel}>{k.l}</p>
            <p style={{margin:0,color:k.c,fontSize:"24px",fontWeight:"700",fontFamily:"var(--font-mono)"}}><CountUp value={k.v}/></p>
          </div>
        ))}
      </div>

      {erro && <div style={{padding:"12px 16px",borderRadius:"12px",background:"color-mix(in srgb, var(--neg) 8%, transparent)",border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)",color:"var(--neg-soft)",fontSize:"13px",marginBottom:"16px"}}>{erro}</div>}

      {/* Lista */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",marginBottom:"14px",flexWrap:"wrap"}}>
        <p className="mtp-section-title">Contas</p>
        <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail" style={{...inp,width:"260px",padding:"8px 12px",fontSize:"13px"}}/>
      </div>

      <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",overflow:"hidden"}}>
        {carregando ? (
          <p style={{margin:0,padding:"28px",color:"var(--text-3)",fontSize:"13px",textAlign:"center"}}>Carregando usuários...</p>
        ) : filtrados.length===0 ? (
          <p style={{margin:0,padding:"28px",color:"var(--text-3)",fontSize:"13px",textAlign:"center"}}>{busca?"Nenhum usuário encontrado.":"Nenhum usuário ainda. Clique em \"Novo usuário\"."}</p>
        ) : filtrados.map((u,i)=>{
          const cor = STATUS_COR[u.efetivo] || "var(--text-mute)";
          const dias = diasAte(u.assinatura_ate);
          const admin = u.papel==="admin";
          return (
            <div key={u.id} style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) 130px 210px 300px",alignItems:"center",gap:"16px",padding:"14px 20px",borderBottom:i<filtrados.length-1?"1px solid var(--line)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",minWidth:0}}>
                <div style={{width:"36px",height:"36px",borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,"+alfa(cor,"33")+","+alfa(cor,"0d")+")",border:"1px solid "+alfa(cor,"55"),display:"flex",alignItems:"center",justifyContent:"center",color:cor,fontWeight:"800",fontSize:"14px"}}>{(u.nome||u.email||"?")[0].toUpperCase()}</div>
                <div style={{minWidth:0}}>
                  <p style={{margin:0,color:"var(--text)",fontSize:"14px",fontWeight:"700",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {u.nome||"Sem nome"} {admin && <span style={{marginLeft:"6px",fontSize:"10px",fontWeight:"800",letterSpacing:"0.8px",color:"var(--warn)",border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)",background:"color-mix(in srgb, var(--warn) 7.1%, transparent)",borderRadius:"20px",padding:"1px 7px",verticalAlign:"middle"}}>ADMIN</span>}
                  </p>
                  <p style={{margin:"2px 0 0",color:"var(--text-3)",fontSize:"12px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.email}</p>
                </div>
              </div>
              <div>
                <span style={{fontSize:"10.5px",fontWeight:"700",letterSpacing:"0.6px",textTransform:"uppercase",padding:"3px 9px",borderRadius:"20px",color:cor,border:"1px solid "+alfa(cor,"44"),background:alfa(cor,"12")}}>{STATUS_TXT[u.efetivo]||u.efetivo}</span>
                <p style={{margin:"6px 0 0",color:"var(--text-3)",fontSize:"11.5px"}}>{admin ? "dono" : (PLANOS[u.plano]?.label || u.plano)}</p>
              </div>
              <div style={{fontFamily:"var(--font-mono)",fontSize:"12px"}}>
                <p style={{margin:0,color:"var(--text-2)"}}>{admin ? "sem vencimento" : u.assinatura_ate ? "até "+fmtData(u.assinatura_ate) : "sem vencimento"}</p>
                <p style={{margin:"3px 0 0",color: dias!==null && dias<0 ? "var(--neg-soft)" : dias!==null && dias<=5 ? "var(--warn)" : "var(--text-3)",fontSize:"11px"}}>
                  {admin ? "" : dias===null ? "" : dias<0 ? "venceu há "+Math.abs(dias)+"d" : dias===0 ? "vence hoje" : "faltam "+dias+"d"}
                  {u.ultimo_acesso && <span style={{color:"var(--text-3)"}}>{dias!==null && !admin ? " · " : ""}acesso {fmtData(u.ultimo_acesso)}</span>}
                </p>
              </div>
              <div style={{display:"flex",gap:"6px",justifyContent:"flex-end",flexWrap:"wrap"}}>
                {!admin && <>
                  <button style={btnSec} disabled={!!ocupado} onClick={()=>acao(u.id,{ status_assinatura:"ativa", assinatura_ate: maisDias(u.assinatura_ate,30) },"+30")}>{ocupado===u.id+"+30"?"...":"+30 dias"}</button>
                  {u.status_assinatura==="suspensa" || u.status_assinatura==="cancelada" ? (
                    <button style={{...btnSec,color:"var(--accent)",borderColor:"color-mix(in srgb, var(--accent) 20%, transparent)"}} disabled={!!ocupado} onClick={()=>acao(u.id,{ status_assinatura:"ativa" },"reativar")}>Reativar</button>
                  ) : (
                    <button style={{...btnSec,color:"var(--warn)",borderColor:"color-mix(in srgb, var(--warn) 20%, transparent)"}} disabled={!!ocupado} onClick={()=>{ if(window.confirm("Suspender o acesso de "+(u.nome||u.email)+"?")) acao(u.id,{ status_assinatura:"suspensa" },"suspender"); }}>Suspender</button>
                  )}
                </>}
                <button style={btnSec} onClick={()=>setSenhaDe(u)}>Senha</button>
                {!admin && <button style={{...btnSec,color:"var(--neg-soft)",borderColor:"color-mix(in srgb, var(--neg) 20%, transparent)"}} disabled={!!ocupado} onClick={()=>setExcluirDe(u)}>Excluir</button>}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{margin:"14px 0 0",color:"var(--text-3)",fontSize:"11.5px",lineHeight:1.6}}>
        Assinaturas vencidas ou suspensas perdem o acesso ao app na próxima vez que o cliente abrir. Para reativar, use "+30 dias" ou "Reativar".
      </p>

      {novoAberto && <NovoUsuario api={api} onClose={()=>setNovoAberto(false)} onCriado={c=>{ setNovoAberto(false); setCriado(c); carregar(); }}/>}
      {criado && <Credenciais dados={criado} onClose={()=>setCriado(null)}/>}
      {senhaDe && <TrocarSenha api={api} usuario={senhaDe} onClose={()=>setSenhaDe(null)}/>}
      {excluirDe && <ExcluirUsuario api={api} usuario={excluirDe} onClose={()=>setExcluirDe(null)} onExcluido={()=>{ setExcluirDe(null); carregar(); }}/>}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <p style={{...kpiLabel,marginBottom:"8px"}}>{label}</p>
      {children}
    </div>
  );
}

function NovoUsuario({ api, onClose, onCriado }) {
  // convite: o cliente recebe e-mail e cria a própria senha; senão o admin define e repassa
  const [f, setF] = useState({ nome:"", email:"", convite:true, senha:gerarSenha(), plano:"mensal", ate:maisDias(null, 30) });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false); // trava o duplo clique (o estado só desabilita o botão no próximo render)

  function escolherPlano(p) {
    setF(x => ({ ...x, plano:p, ate: PLANOS[p].dias ? maisDias(null, PLANOS[p].dias) : "" }));
  }

  async function criar() {
    const regra = f.convite ? null : validarSenha(f.senha);
    if (regra) { setErro(regra); return; }
    if (enviando.current) return;
    enviando.current = true;
    setErro(""); setSalvando(true);
    try {
      await api({ acao:"criar", nome:f.nome, email:f.email, convite:f.convite, redirect:window.location.origin,
        senha:f.convite ? undefined : f.senha, plano:f.plano, status_assinatura:PLANOS[f.plano].status, assinatura_ate: f.ate || null });
      onCriado({ nome:f.nome, email:f.email.trim().toLowerCase(), senha:f.convite ? null : f.senha, ate:f.ate });
    } catch (e) { setErro(e.message); }
    enviando.current = false;
    setSalvando(false);
  }

  return (
    <Modal onClose={onClose} width={500}>
      <div style={{padding:"24px 26px",display:"flex",flexDirection:"column",gap:"16px"}}>
        <div>
          <p style={{margin:0,color:"var(--text)",fontSize:"18px",fontWeight:"800"}}>Novo usuário</p>
          <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12.5px"}}>{f.convite ? "O cliente recebe um e-mail para criar a própria senha." : "A conta já nasce confirmada. Envie o e-mail e a senha ao cliente."}</p>
        </div>
        <Campo label="Nome"><input style={inp} value={f.nome} autoFocus onChange={e=>setF(x=>({...x,nome:e.target.value}))} placeholder="Nome do cliente"/></Campo>
        <Campo label="E-mail"><input style={inp} type="email" value={f.email} onChange={e=>setF(x=>({...x,email:e.target.value}))} placeholder="cliente@email.com"/></Campo>
        <Campo label="Acesso">
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            <button onClick={()=>setF(x=>({...x,convite:true}))} className={"mtp-pill"+(f.convite?" active":"")}>✉️ Convite por e-mail</button>
            <button onClick={()=>setF(x=>({...x,convite:false}))} className={"mtp-pill"+(!f.convite?" active":"")}>Eu defino a senha</button>
          </div>
        </Campo>
        {!f.convite && (
          <Campo label={"Senha temporária · "+REGRA_SENHA.toLowerCase()}>
            <div style={{display:"flex",gap:"8px"}}>
              <input style={{...inp,fontFamily:"var(--font-mono)"}} value={f.senha} onChange={e=>setF(x=>({...x,senha:e.target.value}))}/>
              <button onClick={()=>setF(x=>({...x,senha:gerarSenha()}))} style={{...btnSec,padding:"0 14px"}}>Gerar</button>
            </div>
          </Campo>
        )}
        <Campo label="Plano">
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {Object.entries(PLANOS).map(([k,p])=>(
              <button key={k} onClick={()=>escolherPlano(k)} className={"mtp-pill"+(f.plano===k?" active":"")}>{p.label}{p.dias?" · "+p.dias+"d":""}</button>
            ))}
          </div>
        </Campo>
        <Campo label="Acesso até">
          <input type="date" style={{...inp,colorScheme:"dark"}} value={f.ate} min={hojeISO()} onChange={e=>setF(x=>({...x,ate:e.target.value}))}/>
          <p style={{margin:"6px 0 0",color:"var(--text-3)",fontSize:"11.5px"}}>{f.ate ? "Depois dessa data o acesso é bloqueado até renovar." : "Sem vencimento."}</p>
        </Campo>
        {erro && <p style={{margin:0,color:"var(--neg-soft)",fontSize:"12.5px"}}>{erro}</p>}
        <div style={{display:"flex",gap:"10px",marginTop:"4px"}}>
          <button onClick={criar} disabled={salvando} style={{flex:1,background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",fontSize:"13px",cursor:salvando?"wait":"pointer"}}>{salvando?"Criando...":f.convite?"Criar e enviar convite":"Criar usuário"}</button>
          <button onClick={onClose} style={{...btnSec,padding:"12px 16px",fontSize:"13px"}}>Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

// Convite ou link de senha enviados pelo Supabase (SMTP do Gmail configurado no Auth)
function ConviteEnviado({ email, titulo = "Convite enviado", onClose }) {
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{padding:"24px 26px",display:"flex",flexDirection:"column",gap:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"12px",background:"color-mix(in srgb, var(--accent) 12%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 26.7%, transparent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>✉️</div>
          <div>
            <p style={{margin:0,color:"var(--text)",fontSize:"17px",fontWeight:"800"}}>{titulo}</p>
            <p style={{margin:0,color:"var(--text-3)",fontSize:"12px"}}>para <b style={{color:"var(--text-2)"}}>{email}</b></p>
          </div>
        </div>
        <p style={{margin:0,color:"var(--text-2)",fontSize:"13px",lineHeight:1.6}}>
          O cliente vai receber um e-mail com um link para criar a senha e entrar. Se não aparecer em alguns minutos, peça para olhar a caixa de spam.
        </p>
        <button onClick={onClose} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",fontSize:"13px",cursor:"pointer"}}>Ok</button>
      </div>
    </Modal>
  );
}

// Mensagem com o acesso quando o admin define a senha: abre o e-mail ou o WhatsApp
// do admin já com o texto pronto, ou copia para colar onde quiser.
function mensagemAcesso({ nome, email, senha }, nova = false) {
  return nova
    ? `Olá ${nome||""}! Sua senha do Mi Trading Plan foi redefinida.\n\nLink: ${window.location.origin}\nE-mail: ${email}\nNova senha: ${senha}\n\nRecomendo trocar a senha ao entrar (Configurações > Alterar senha).`
    : `Olá ${nome}! Seu acesso ao Mi Trading Plan está pronto.\n\nLink: ${window.location.origin}\nE-mail: ${email}\nSenha: ${senha}\n\nRecomendo trocar a senha no primeiro acesso (Configurações > Alterar senha).`;
}

function EnviarAcesso({ email, texto }) {
  const assunto = "Seu acesso ao Mi Trading Plan";
  const link = { ...btnSec, flex:1, padding:"10px", fontSize:"12.5px", textAlign:"center", textDecoration:"none" };
  return (
    <div style={{display:"flex",gap:"8px"}}>
      <a style={link} href={"mailto:"+encodeURIComponent(email)+"?subject="+encodeURIComponent(assunto)+"&body="+encodeURIComponent(texto)}>✉️ Enviar por e-mail</a>
      <a style={link} href={"https://wa.me/?text="+encodeURIComponent(texto)} target="_blank" rel="noreferrer">💬 Enviar no WhatsApp</a>
    </div>
  );
}

function Credenciais({ dados, onClose }) {
  const [copiado, setCopiado] = useState(false);
  if (!dados.senha) return <ConviteEnviado email={dados.email} onClose={onClose}/>;
  const texto = mensagemAcesso(dados);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(()=>setCopiado(false),2000); } catch { /* sem permissão de clipboard */ }
  }
  return (
    <Modal onClose={onClose} width={480}>
      <div style={{padding:"24px 26px",display:"flex",flexDirection:"column",gap:"14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{width:"40px",height:"40px",borderRadius:"12px",background:"color-mix(in srgb, var(--accent) 12%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 26.7%, transparent)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p style={{margin:0,color:"var(--text)",fontSize:"17px",fontWeight:"800"}}>Usuário criado</p>
            <p style={{margin:0,color:"var(--text-3)",fontSize:"12px"}}>A senha não fica salva aqui. Copie agora e envie ao cliente.</p>
          </div>
        </div>
        <pre style={{margin:0,padding:"14px 16px",borderRadius:"12px",background:"rgba(0,0,0,0.3)",border:"1px solid var(--line)",color:"var(--text-2)",fontSize:"12.5px",lineHeight:1.6,whiteSpace:"pre-wrap",fontFamily:"var(--font-mono)"}}>{texto}</pre>
        <EnviarAcesso email={dados.email} texto={texto}/>
        <div style={{display:"flex",gap:"10px"}}>
          <button onClick={copiar} style={{flex:1,background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",fontSize:"13px",cursor:"pointer"}}>{copiado?"✓ Copiado":"Copiar mensagem"}</button>
          <button onClick={onClose} style={{...btnSec,padding:"12px 16px",fontSize:"13px"}}>Fechar</button>
        </div>
      </div>
    </Modal>
  );
}

// Exclusão definitiva: pede o e-mail digitado para não apagar ninguém por engano
function ExcluirUsuario({ api, usuario, onClose, onExcluido }) {
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const confere = digitado.trim().toLowerCase() === (usuario.email||"").toLowerCase();
  async function excluir() {
    if (!confere || excluindo) return;
    setErro(""); setExcluindo(true);
    try { await api({ acao:"excluir", id:usuario.id }); onExcluido(); }
    catch (e) { setErro(e.message); setExcluindo(false); }
  }
  return (
    <Modal onClose={onClose} width={460}>
      <div style={{padding:"24px 26px",display:"flex",flexDirection:"column",gap:"14px"}}>
        <div>
          <p style={{margin:0,color:"var(--neg-soft)",fontSize:"17px",fontWeight:"800"}}>Excluir {usuario.nome || usuario.email}?</p>
          <p style={{margin:"6px 0 0",color:"var(--text-3)",fontSize:"12.5px",lineHeight:1.6}}>
            Apaga a conta e tudo o que é dela: diário, estratégias, disciplina e fotos. Não dá para desfazer.
            Se a ideia é só bloquear o acesso, use <b style={{color:"var(--text-2)"}}>Suspender</b>.
          </p>
        </div>
        <div>
          <p style={{...kpiLabel,marginBottom:"8px"}}>Digite o e-mail para confirmar</p>
          <input style={inp} value={digitado} onChange={e=>setDigitado(e.target.value)} placeholder={usuario.email} autoFocus/>
        </div>
        {erro && <p style={{margin:0,color:"var(--neg-soft)",fontSize:"12.5px"}}>{erro}</p>}
        <div style={{display:"flex",gap:"10px"}}>
          <button onClick={excluir} disabled={!confere || excluindo}
            style={{flex:1,background:confere?"var(--neg)":"color-mix(in srgb, var(--neg) 20%, transparent)",color:confere?"#fff":"var(--neg-soft)",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",fontSize:"13px",cursor:confere&&!excluindo?"pointer":"not-allowed"}}>
            {excluindo ? "Excluindo..." : "Excluir definitivamente"}
          </button>
          <button onClick={onClose} style={{...btnSec,padding:"12px 16px",fontSize:"13px"}}>Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function TrocarSenha({ api, usuario, onClose }) {
  const [senha, setSenha] = useState(gerarSenha());
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [enviandoLink, setEnviandoLink] = useState(false);
  async function salvar() {
    const regra = validarSenha(senha);
    if (regra) { setErro(regra); return; }
    setErro("");
    try { await api({ acao:"senha", id:usuario.id, senha }); setOk(true); }
    catch (e) { setErro(e.message); }
  }
  async function mandarLink() {
    if (enviandoLink) return;
    setErro(""); setEnviandoLink(true);
    try { await api({ acao:"link_senha", id:usuario.id, redirect:window.location.origin }); setLinkEnviado(true); }
    catch (e) { setErro(e.message); }
    setEnviandoLink(false);
  }
  if (linkEnviado) return <ConviteEnviado email={usuario.email} titulo="Link enviado" onClose={onClose}/>;
  return (
    <Modal onClose={onClose} width={440}>
      <div style={{padding:"24px 26px",display:"flex",flexDirection:"column",gap:"14px"}}>
        <div>
          <p style={{margin:0,color:"var(--text)",fontSize:"17px",fontWeight:"800"}}>Redefinir senha</p>
          <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12.5px"}}>{usuario.nome || usuario.email}</p>
        </div>
        {!ok && <>
          <button onClick={mandarLink} disabled={enviandoLink} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"12px",fontWeight:"800",fontSize:"13px",cursor:enviandoLink?"wait":"pointer"}}>
            {enviandoLink ? "Enviando..." : "✉️ Mandar link por e-mail"}
          </button>
          <p style={{margin:"-6px 0 0",color:"var(--text-3)",fontSize:"11.5px"}}>Ele recebe um e-mail e cria a senha sozinho. Serve também para reenviar o convite.</p>
          <p style={{...kpiLabel,margin:"6px 0 0"}}>Ou defina você mesmo</p>
        </>}
        <div style={{display:"flex",gap:"8px"}}>
          <input style={{...inp,fontFamily:"var(--font-mono)"}} value={senha} onChange={e=>setSenha(e.target.value)} disabled={ok}/>
          {!ok && <button onClick={()=>setSenha(gerarSenha())} style={{...btnSec,padding:"0 14px"}}>Gerar</button>}
        </div>
        {erro && <p style={{margin:0,color:"var(--neg-soft)",fontSize:"12.5px"}}>{erro}</p>}
        {ok && <p style={{margin:0,color:"var(--accent)",fontSize:"12.5px"}}>✓ Senha alterada. Envie a nova senha ao cliente.</p>}
        {ok && <EnviarAcesso email={usuario.email} texto={mensagemAcesso({ nome:usuario.nome, email:usuario.email, senha }, true)}/>}
        <div style={{display:"flex",gap:"10px"}}>
          {!ok && <button onClick={salvar} style={{...btnSec,flex:1,padding:"12px",fontSize:"13px"}}>Salvar esta senha</button>}
          <button onClick={onClose} style={{...btnSec,padding:"12px 16px",fontSize:"13px",flex:ok?1:"none"}}>{ok?"Fechar":"Cancelar"}</button>
        </div>
      </div>
    </Modal>
  );
}
