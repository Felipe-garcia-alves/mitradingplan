import { useState, useMemo } from "react";
import { Select, Modal, Valores } from "../components/ui";
import { somaPorMoeda, fmtMoeda, moedaDoMercado } from "../lib/moedas";
import { VEREDITOS, VEREDITO, FASES_ERRO, rotuloErro, MARCAS, estrelasDe, motivosRevisao, listarTrades, desdeDias } from "../lib/revisao";
import { fonteDoEditor, trocarFotoAnotada, apagarArquivos } from "../lib/fotos";
import ImageEditor, { uploadTradeImage, ImageViewer, ImagemSegura } from "../components/ImageEditor";

const PERIODOS = [{ value:7, label:"Últimos 7 dias" }, { value:30, label:"Últimos 30 dias" }, { value:90, label:"Últimos 90 dias" }, { value:0, label:"Todo o período" }];
const EMOCAO_COLORS = {"Focado":"#2ee6a0","Confiante":"#0099ff","Neutro":"#888","Atento":"#a78bfa","Cauteloso":"#f59e0b","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};

function dataCurta(dia) {
  return new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday:"short", day:"numeric", month:"short" }).replace(/\./g, "");
}
const rotulo = { margin:"0 0 10px", color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" };

function Chip({ cor, children, style }) {
  return <span style={{padding:"3px 9px",borderRadius:"20px",fontSize:"11.5px",fontWeight:"700",whiteSpace:"nowrap",color:cor,background:cor+"17",border:"1px solid "+cor+"40",...style}}>{children}</span>;
}
function Estrelas({ q }) {
  const n = estrelasDe(q);
  if (!n) return null;
  return <span title="Execução" style={{color:"#f5b941",fontSize:"12px",letterSpacing:"1px"}}>{"★".repeat(n)}<span style={{opacity:0.25}}>{"★".repeat(3 - n)}</span></span>;
}
function Resultado({ t, size = 14 }) {
  if (typeof t.resultado !== "number") return t.pontos != null ? <span style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:size,color:t.pontos>=0?"#2ee6a0":"#ff5470"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span> : null;
  return <span style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:size,color:t.resultado>=0?"#2ee6a0":"#ff5470"}}>{fmtMoeda(t.resultado, moedaDoMercado(t.mercado))}</span>;
}
function Kpi({ titulo, children, sub }) {
  return (
    <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"14px",padding:"14px 16px",minWidth:0}}>
      <p style={{...rotulo,margin:"0 0 6px"}}>{titulo}</p>
      <div style={{fontSize:"22px",fontWeight:"800",color:"var(--text)",fontFamily:"var(--font-mono)"}}>{children}</div>
      {sub && <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12px"}}>{sub}</p>}
    </div>
  );
}

export default function Revisao({ entries, saveEntry, estrategias, uid }) {
  const [aba, setAba] = useState("fila");
  const [periodo, setPeriodo] = useState(30);
  const [filtroEst, setFiltroEst] = useState("todas");
  const [todos, setTodos] = useState(false); // fila: incluir trades sem alerta
  const [aberto, setAberto] = useState(null); // chave "dia#idx" do trade na ficha

  const todosTrades = useMemo(() => listarTrades(entries), [entries]);
  const desde = desdeDias(periodo);
  const base = todosTrades.filter(it => it.dia >= desde && (filtroEst === "todas" || it.t.estrategia === filtroEst));
  const pendentes = base.filter(it => !it.t.revisao && (todos || motivosRevisao(it.t, it.entry).length));
  const revisados = base.filter(it => it.t.revisao);
  const lista = aba === "revisados" ? revisados : pendentes;

  const comErro = revisados.filter(it => it.t.revisao.veredito !== "sem_erro");
  const custoErros = somaPorMoeda(comErro.filter(it => it.t.resultado < 0));
  const lossesRevisados = revisados.filter(it => it.t.tipo === "LOSS");
  const lossNoPlano = lossesRevisados.filter(it => it.t.revisao.veredito === "sem_erro").length;

  const itemAberto = aberto ? todosTrades.find(it => it.chave === aberto) : null;
  const posAberto = itemAberto ? lista.findIndex(it => it.chave === aberto) : -1;

  async function salvarRevisao(it, rev, proximo) {
    const entry = entries[it.dia];
    const trades = entry.trades.map((t, i) => {
      if (i !== it.idx) return t;
      const novo = { ...t };
      if (rev) novo.revisao = rev; else delete novo.revisao;
      return novo;
    });
    const ok = await saveEntry(it.dia, { ...entry, trades });
    if (ok === false) return false;
    setAberto(proximo || null);
    return true;
  }

  const abas = [["fila", "Para revisar", pendentes.length], ["revisados", "Revisados", revisados.length], ["padroes", "Padrões", null]];

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:"22px"}}>
        <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"var(--text)",letterSpacing:"-0.8px"}}>Revisão</h1>
        <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"13px"}}>Estude os trades, separe erro de mercado e descubra quanto cada erro está custando.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"12px",marginBottom:"20px"}}>
        <Kpi titulo="Para revisar" sub={todos ? "todos os trades do período" : "trades com alerta no período"}>
          <span style={{color:pendentes.length?"#f5b941":"#2ee6a0"}}>{pendentes.length}</span>
        </Kpi>
        <Kpi titulo="Revisados" sub={comErro.length + " com erro · " + (revisados.length - comErro.length) + " dentro do plano"}>{revisados.length}</Kpi>
        <Kpi titulo="Custo dos erros" sub="soma dos losses em que houve erro">
          <Valores partes={custoErros} vazio="—" style={{fontSize:"20px"}}/>
        </Kpi>
        <Kpi titulo="Losses dentro do plano" sub={lossesRevisados.length ? lossNoPlano + " de " + lossesRevisados.length + " losses revisados" : "revise seus losses para ver"}>
          {lossesRevisados.length ? Math.round(lossNoPlano / lossesRevisados.length * 100) + "%" : "—"}
        </Kpi>
      </div>

      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",marginBottom:"16px"}}>
        <div style={{display:"flex",gap:"4px",background:"var(--card)",border:"1px solid var(--line)",borderRadius:"12px",padding:"4px"}}>
          {abas.map(([id, rot, n]) => (
            <button key={id} onClick={()=>setAba(id)} style={{padding:"7px 14px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-sans)",background:aba===id?"rgba(46,230,160,0.12)":"transparent",color:aba===id?"#2ee6a0":"var(--text-3)",display:"flex",alignItems:"center",gap:"7px"}}>
              {rot}{n !== null && <span style={{fontSize:"11px",fontFamily:"var(--font-mono)",opacity:0.8}}>{n}</span>}
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <Select value={periodo} onChange={setPeriodo} options={PERIODOS} popWidth={190}
          style={{padding:"6px 12px",minHeight:"34px",borderRadius:"20px",fontSize:"12px"}}/>
        <Select value={filtroEst} onChange={setFiltroEst} popWidth={220}
          style={{padding:"6px 12px",minHeight:"34px",borderRadius:"20px",fontSize:"12px",color:filtroEst==="todas"?"var(--text-3)":"#2ee6a0"}}
          options={[{value:"todas",label:"Todas estratégias"}, ...(estrategias||[]).map(e=>({value:e.nome,label:e.nome}))]}/>
      </div>

      {aba === "padroes"
        ? <Padroes revisados={revisados} onAbrir={setAberto}/>
        : (
          <>
            {aba === "fila" && (
              <label style={{display:"inline-flex",alignItems:"center",gap:"8px",color:"var(--text-3)",fontSize:"12.5px",marginBottom:"12px",cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={todos} onChange={e=>setTodos(e.target.checked)} style={{accentColor:"#2ee6a0"}}/>
                Incluir trades sem alerta (estudar também os acertos)
              </label>
            )}
            {lista.length === 0 ? (
              <div style={{background:"var(--card)",border:"1px dashed var(--line-strong)",borderRadius:"16px",padding:"36px 20px",textAlign:"center"}}>
                <p style={{margin:"0 0 6px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>{aba === "fila" ? "Fila zerada" : "Nenhum trade revisado ainda"}</p>
                <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>
                  {aba === "fila"
                    ? "Nenhum trade com alerta (LOSS, execução regular/ruim ou emoção de risco) esperando revisão neste período."
                    : "Abra um trade em “Para revisar” e responda as três perguntas da ficha."}
                </p>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {lista.map(it => <LinhaTrade key={it.chave} it={it} onAbrir={()=>setAberto(it.chave)}/>)}
              </div>
            )}
          </>
        )}

      {itemAberto && (
        <Ficha key={aberto} it={itemAberto} entries={entries} saveEntry={saveEntry} uid={uid}
          anterior={posAberto > 0 ? lista[posAberto - 1].chave : null}
          proximo={posAberto >= 0 && posAberto < lista.length - 1 ? lista[posAberto + 1].chave : null}
          onIr={setAberto} onFechar={()=>setAberto(null)} onSalvar={salvarRevisao}/>
      )}
    </div>
  );
}

function LinhaTrade({ it, onAbrir }) {
  const { t, dia, entry } = it;
  const rev = t.revisao;
  const motivos = rev ? [] : motivosRevisao(t, entry);
  const foto = (t.imagens || [])[0];
  return (
    <button onClick={onAbrir} className="mtp-op-card" style={{"--op":t.tipo==="WIN"?"#2ee6a0":"#ff5470",display:"flex",alignItems:"center",gap:"14px",textAlign:"left",cursor:"pointer",width:"100%",fontFamily:"var(--font-sans)",color:"inherit"}}>
      <div style={{width:"72px",height:"48px",borderRadius:"8px",overflow:"hidden",flexShrink:0,border:"1px solid var(--line-strong)",background:"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)"}}>
        {foto
          ? <ImagemSegura url={foto} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:"6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
          <span style={{color:"var(--text-2)",fontSize:"12.5px",fontWeight:"600",minWidth:"92px"}}>{dataCurta(dia)}{t.horario && <span style={{color:"var(--text-3)",fontFamily:"var(--font-mono)",marginLeft:"6px"}}>{t.horario}</span>}</span>
          <span style={{padding:"2px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"800",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470"}}>{t.tipo}</span>
          <Resultado t={t}/>
          {(t.ativo || t.estrategia) && <span style={{color:"var(--text-3)",fontSize:"12px"}}>{[t.ativo, t.estrategia].filter(Boolean).join(" · ")}</span>}
          <Estrelas q={t.qualidade}/>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
          {motivos.map(m => <Chip key={m.rot} cor={m.cor}>{m.rot}</Chip>)}
          {rev && <Chip cor={VEREDITO[rev.veredito]?.cor || "#888"}>{VEREDITO[rev.veredito]?.rot || rev.veredito}</Chip>}
          {rev?.erros?.map(e => <Chip key={e} cor="#a3b2ab">{rotuloErro(e)}</Chip>)}
          {rev?.marca && MARCAS[rev.marca] && <Chip cor={MARCAS[rev.marca].cor}>★ {MARCAS[rev.marca].rot}</Chip>}
          {rev?.licao && <span style={{color:"var(--text-3)",fontSize:"12px",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>“{rev.licao}”</span>}
        </div>
      </div>
      <span style={{color:rev?"var(--text-3)":"#2ee6a0",fontSize:"12.5px",fontWeight:"700",flexShrink:0}}>{rev ? "Abrir" : "Revisar →"}</span>
    </button>
  );
}

// ── Ficha de revisão: foto grande com as camadas + as três perguntas
function Ficha({ it, entries, saveEntry, uid, anterior, proximo, onIr, onFechar, onSalvar }) {
  const { t, dia, entry } = it;
  const inicial = t.revisao || {};
  const [veredito, setVeredito] = useState(inicial.veredito || "");
  const [erros, setErros] = useState(inicial.erros || []);
  const [licao, setLicao] = useState(inicial.licao || "");
  const [marca, setMarca] = useState(inicial.marca || "");
  const [fotoSel, setFotoSel] = useState(0);
  const [editor, setEditor] = useState(null); // { url, src, formas }
  const [viewer, setViewer] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const avisar = m => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const fotos = t.imagens || [];
  const foto = fotos[Math.min(fotoSel, fotos.length - 1)];
  const comErro = veredito && veredito !== "sem_erro";
  const motivos = motivosRevisao(t, entry);

  function alternarErro(id) { setErros(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]); }

  async function salvar(irProximo) {
    if (!veredito) { avisar("Responda primeiro: foi erro ou foi o mercado?"); return; }
    const rev = { veredito, em: new Date().toISOString() };
    if (comErro && erros.length) rev.erros = erros;
    if (licao.trim()) rev.licao = licao.trim();
    if (marca) rev.marca = marca;
    const ok = await onSalvar(it, rev, irProximo ? proximo : null);
    if (ok === false) avisar("Não foi possível salvar. Tente de novo.");
  }

  // Fotos: o trade é atualizado direto no diário
  async function gravarTrade(novo) {
    const e = entries[dia];
    return saveEntry(dia, { ...e, trades: e.trades.map((x, i) => i === it.idx ? novo : x) });
  }
  async function adicionarFoto(file) {
    if (!uid || !file) return;
    setEnviando(true);
    try {
      const url = await uploadTradeImage(file, uid, dia, "rev");
      if (await gravarTrade({ ...t, imagens: [...fotos, url] }) !== false) setFotoSel(fotos.length);
    } catch (e) { console.error(e); avisar("A foto não subiu. Tente de novo."); }
    setEnviando(false);
  }
  async function salvarAnotacao(file, formas) {
    const { trade, apagar } = await trocarFotoAnotada(t, editor.url, file, formas, uid, dia);
    if (await gravarTrade(trade) === false) throw new Error("não salvou o dia");
    await apagarArquivos(apagar);
  }

  const btnNav = ativo => ({width:"34px",height:"34px",borderRadius:"9px",border:"1px solid var(--line-strong)",background:"transparent",color:ativo?"var(--text-2)":"var(--text-3)",cursor:ativo?"pointer":"default",opacity:ativo?1:0.35,fontSize:"16px"});

  return (
    <>
    {/* Esc com o editor ou a foto abertos não fecha a ficha */}
    <Modal onClose={()=>{ if (!editor && !viewer) onFechar(); }} width={1180}>
      <div style={{padding:"clamp(16px,3vw,28px)"}}>
        {/* Cabeçalho */}
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px",marginBottom:"18px",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:"240px"}}>
            <p style={{...rotulo,margin:"0 0 6px"}}>{new Date(dia + "T12:00:00").toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}{t.horario ? " · " + t.horario : ""}</p>
            <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
              <span style={{padding:"3px 10px",borderRadius:"6px",fontSize:"12px",fontWeight:"800",background:t.tipo==="WIN"?"rgba(46,230,160,0.15)":"rgba(255,84,112,0.15)",color:t.tipo==="WIN"?"#2ee6a0":"#ff5470"}}>{t.tipo}</span>
              <Resultado t={t} size={20}/>
              {t.pontos != null && typeof t.resultado === "number" && <span style={{color:"var(--text-2)",fontFamily:"var(--font-mono)",fontSize:"13px"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
              <span style={{color:"var(--text-2)",fontSize:"13px"}}>{[t.mercado, t.ativo, t.estrategia, t.contratos ? t.contratos + "×" : null].filter(Boolean).join(" · ")}</span>
              <Estrelas q={t.qualidade}/>
            </div>
            {motivos.length > 0 && <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"8px"}}>{motivos.map(m => <Chip key={m.rot} cor={m.cor}>{m.rot}</Chip>)}</div>}
          </div>
          <div style={{display:"flex",gap:"6px"}}>
            <button onClick={()=>anterior && onIr(anterior)} disabled={!anterior} title="Trade anterior" style={btnNav(!!anterior)}>‹</button>
            <button onClick={()=>proximo && onIr(proximo)} disabled={!proximo} title="Próximo trade" style={btnNav(!!proximo)}>›</button>
            <button onClick={onFechar} title="Fechar" style={btnNav(true)}>✕</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:"22px",alignItems:"start"}}>
          {/* Foto + contexto */}
          <div style={{minWidth:0}}>
            {foto ? (
              <>
                <div style={{borderRadius:"12px",overflow:"hidden",border:"1px solid var(--line-strong)",background:"#050907",display:"flex",justifyContent:"center"}}>
                  <ImagemSegura url={foto} onClick={()=>setViewer(foto)} style={{maxWidth:"100%",maxHeight:"440px",objectFit:"contain",display:"block",cursor:"zoom-in"}}/>
                </div>
                <div style={{display:"flex",gap:"8px",alignItems:"center",marginTop:"10px",flexWrap:"wrap"}}>
                  {fotos.length > 1 && fotos.map((u, i) => (
                    <button key={u} onClick={()=>setFotoSel(i)} style={{width:"58px",height:"40px",padding:0,borderRadius:"7px",overflow:"hidden",cursor:"pointer",border:"2px solid "+(u===foto?"#2ee6a0":"var(--line-strong)"),background:"none"}}>
                      <ImagemSegura url={u} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    </button>
                  ))}
                  <div style={{flex:1}}/>
                  <button onClick={()=>setEditor({ url: foto, ...fonteDoEditor(t, foto) })} className="mtp-btn-sec" style={{minHeight:"34px",color:"#f5b941",borderColor:"#f5b94155"}}>
                    ✏️ Anotar na revisão
                  </button>
                  <label className="mtp-btn-sec" style={{minHeight:"34px",cursor:"pointer"}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ adicionarFoto(e.target.files[0]); e.target.value=""; }}/>
                    {enviando ? "enviando…" : "+ Foto"}
                  </label>
                </div>
                {t.camadas?.[foto] && <p style={{margin:"8px 0 0",color:"var(--text-3)",fontSize:"11.5px"}}>Os desenhos desta foto continuam editáveis: a camada <b style={{color:"#2ee6a0"}}>Na hora</b> e a de <b style={{color:"#f5b941"}}>Revisão</b>.</p>}
              </>
            ) : (
              <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",minHeight:"220px",borderRadius:"12px",border:"1px dashed var(--line-strong)",color:"var(--text-3)",cursor:"pointer",textAlign:"center",padding:"20px"}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ adicionarFoto(e.target.files[0]); e.target.value=""; }}/>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style={{fontSize:"13px",fontWeight:"600",color:"var(--text-2)"}}>{enviando ? "Enviando…" : "Adicionar o print deste trade"}</span>
                <span style={{fontSize:"12px"}}>Estudar com o gráfico na frente faz toda a diferença.</span>
              </label>
            )}

            {(t.observacao || entry.observacao || (entry.emocoes || []).length > 0) && (
              <div style={{marginTop:"18px",display:"flex",flexDirection:"column",gap:"12px"}}>
                {t.observacao && <div><p style={rotulo}>Anotado no trade</p><p style={{margin:0,color:"var(--text-2)",fontSize:"13px",fontStyle:"italic"}}>“{t.observacao}”</p></div>}
                {(entry.emocoes || []).length > 0 && (
                  <div>
                    <p style={rotulo}>Emoções do dia</p>
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{entry.emocoes.map(em => <Chip key={em} cor={EMOCAO_COLORS[em] || "#888"}>{em}</Chip>)}</div>
                  </div>
                )}
                {entry.observacao && <div><p style={rotulo}>Observação do dia</p><p style={{margin:0,color:"var(--text-2)",fontSize:"13px",lineHeight:1.6,fontStyle:"italic",whiteSpace:"pre-wrap"}}>{entry.observacao}</p></div>}
              </div>
            )}
          </div>

          {/* As três perguntas */}
          <div style={{minWidth:0,display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <p style={rotulo}>1 · Foi erro ou foi o mercado?</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {VEREDITOS.map(v => {
                  const on = veredito === v.id;
                  return (
                    <button key={v.id} onClick={()=>setVeredito(v.id)} style={{textAlign:"left",padding:"10px 12px",borderRadius:"11px",cursor:"pointer",fontFamily:"var(--font-sans)",border:"1px solid "+(on?v.cor+"88":"var(--line-strong)"),background:on?v.cor+"16":"transparent",transition:"all .15s"}}>
                      <span style={{display:"block",color:on?v.cor:"var(--text)",fontSize:"13.5px",fontWeight:"800"}}>{v.rot}</span>
                      <span style={{display:"block",color:"var(--text-3)",fontSize:"11.5px",marginTop:"2px",lineHeight:1.35}}>{v.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {comErro && (
              <div>
                <p style={rotulo}>2 · O que deu errado?</p>
                <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                  {FASES_ERRO.map(f => (
                    <div key={f.fase}>
                      <p style={{margin:"0 0 6px",color:"var(--text-3)",fontSize:"11.5px",fontWeight:"600"}}>{f.fase}</p>
                      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                        {f.erros.map(([id, rot]) => {
                          const on = erros.includes(id);
                          return <button key={id} onClick={()=>alternarErro(id)} style={{padding:"5px 11px",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"var(--font-sans)",border:"1px solid "+(on?"#ff547088":"var(--line-strong)"),background:on?"rgba(255,84,112,0.12)":"transparent",color:on?"#ff7a90":"var(--text-2)"}}>{rot}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p style={rotulo}>{comErro ? "3" : "2"} · Lição</p>
              <textarea value={licao} onChange={e=>setLicao(e.target.value)} rows={3}
                placeholder={veredito === "sem_erro" ? "O que confirmou que o trade estava dentro do plano?" : "Na próxima vez, eu vou…"}
                style={{width:"100%",boxSizing:"border-box",resize:"vertical",background:"var(--card)",border:"1px solid var(--line-strong)",borderRadius:"10px",padding:"10px 12px",color:"var(--text)",fontSize:"13.5px",lineHeight:1.55,fontFamily:"var(--font-sans)",outline:"none"}}/>
            </div>

            <div>
              <p style={rotulo}>Guardar na biblioteca</p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {Object.entries(MARCAS).map(([id, m]) => {
                  const on = marca === id;
                  return <button key={id} onClick={()=>setMarca(on ? "" : id)} style={{padding:"6px 12px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-sans)",border:"1px solid "+(on?m.cor+"88":"var(--line-strong)"),background:on?m.cor+"16":"transparent",color:on?m.cor:"var(--text-3)"}}>★ {m.rot}</button>;
                })}
              </div>
            </div>

            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",borderTop:"1px solid var(--line)",paddingTop:"16px"}}>
              <button onClick={()=>salvar(true)} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"0 18px",minHeight:"40px",fontWeight:"800",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                {proximo ? "Salvar e próximo →" : "Salvar revisão"}
              </button>
              {proximo && <button onClick={()=>salvar(false)} className="mtp-btn-sec" style={{minHeight:"40px"}}>Salvar</button>}
              {t.revisao && <button onClick={()=>onSalvar(it, null, null)} className="mtp-btn-sec" style={{minHeight:"40px",color:"var(--text-3)"}} title="Volta o trade para a fila">Desfazer revisão</button>}
              {msg && <span role="alert" style={{color:"#ff7a90",fontSize:"12.5px"}}>{msg}</span>}
            </div>
          </div>
        </div>
      </div>
    </Modal>
    {/* fora do modal: a animação dele deixa um transform que prenderia o position:fixed */}
    {editor && (
      <ImageEditor src={editor.src} formasIniciais={editor.formas} camadaInicial="revisao"
        onClose={()=>setEditor(null)} onSave={salvarAnotacao}/>
    )}
    {viewer && <ImageViewer url={viewer} onClose={()=>setViewer(null)}/>}
    </>
  );
}

// ── Padrões: quanto cada erro custa e o que você já aprendeu
function Padroes({ revisados, onAbrir }) {
  if (!revisados.length) {
    return (
      <div style={{background:"var(--card)",border:"1px dashed var(--line-strong)",borderRadius:"16px",padding:"36px 20px",textAlign:"center"}}>
        <p style={{margin:"0 0 6px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>Os padrões aparecem com as revisões</p>
        <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>A cada trade revisado, esta tela mostra quais erros mais se repetem e quanto cada um já custou.</p>
      </div>
    );
  }
  const porVeredito = VEREDITOS.map(v => ({ ...v, n: revisados.filter(it => it.t.revisao.veredito === v.id).length }));

  const porErro = {};
  for (const it of revisados) for (const e of it.t.revisao.erros || []) (porErro[e] ||= []).push(it);
  const ranking = Object.entries(porErro).map(([id, its]) => ({
    id, n: its.length,
    custo: somaPorMoeda(its.filter(it => it.t.resultado < 0).map(it => it.t)),
    peso: its.reduce((s, it) => s + Math.min(0, Number(it.t.resultado) || 0), 0),
  })).sort((a, b) => a.peso - b.peso || b.n - a.n);
  const maxN = Math.max(1, ...ranking.map(r => r.n));
  const licoes = revisados.filter(it => it.t.revisao.licao).slice(0, 8);
  const card = {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
      <div style={card}>
        <p style={rotulo}>Erro ou mercado? · {revisados.length} trades revisados</p>
        <div style={{display:"flex",height:"12px",borderRadius:"6px",overflow:"hidden",background:"rgba(255,255,255,0.04)",marginBottom:"12px"}}>
          {porVeredito.filter(v => v.n).map(v => <div key={v.id} title={v.rot + ": " + v.n} style={{width:(v.n / revisados.length * 100) + "%",background:v.cor}}/>)}
        </div>
        <div style={{display:"flex",gap:"18px",flexWrap:"wrap"}}>
          {porVeredito.map(v => (
            <span key={v.id} style={{display:"flex",alignItems:"center",gap:"7px",fontSize:"12.5px",color:"var(--text-2)"}}>
              <span style={{width:"9px",height:"9px",borderRadius:"3px",background:v.cor}}/>{v.rot}
              <b style={{fontFamily:"var(--font-mono)",color:"var(--text)"}}>{v.n}</b>
              <span style={{color:"var(--text-3)"}}>{Math.round(v.n / revisados.length * 100)}%</span>
            </span>
          ))}
        </div>
      </div>

      <div style={card}>
        <p style={rotulo}>Quanto cada erro custou</p>
        {ranking.length === 0 ? (
          <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>Nenhum erro marcado ainda. Na ficha, quando o veredito for análise, execução ou emocional, marque o que deu errado.</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            {ranking.map((r, i) => (
              <div key={r.id} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:"4px 14px",alignItems:"center"}}>
                <span style={{color:"var(--text)",fontSize:"13.5px",fontWeight:i===0?"800":"600"}}>
                  {rotuloErro(r.id)} <span style={{color:"var(--text-3)",fontWeight:500,fontSize:"12px"}}>· {r.n} {r.n === 1 ? "vez" : "vezes"}</span>
                </span>
                <Valores partes={r.custo} vazio="sem custo" style={{fontSize:"13.5px",textAlign:"right"}}/>
                <div style={{gridColumn:"1 / -1",height:"6px",borderRadius:"3px",background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
                  <div style={{width:(r.n / maxN * 100) + "%",height:"100%",background:i===0?"#ff5470":"#ff547077",borderRadius:"3px"}}/>
                </div>
              </div>
            ))}
            <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12px"}}>Custo = soma dos losses em que o erro apareceu. Sem o primeiro da lista, esse dinheiro estaria na sua conta.</p>
          </div>
        )}
      </div>

      {licoes.length > 0 && (
        <div style={card}>
          <p style={rotulo}>Suas lições mais recentes</p>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {licoes.map(it => (
              <button key={it.chave} onClick={()=>onAbrir(it.chave)} style={{display:"flex",gap:"12px",alignItems:"baseline",textAlign:"left",background:"none",border:"none",borderBottom:"1px solid var(--line)",padding:"0 0 8px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                <span style={{color:"var(--text-3)",fontSize:"12px",minWidth:"84px",flexShrink:0}}>{dataCurta(it.dia)}</span>
                <span style={{color:"var(--text)",fontSize:"13.5px",lineHeight:1.5}}>{it.t.revisao.licao}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
