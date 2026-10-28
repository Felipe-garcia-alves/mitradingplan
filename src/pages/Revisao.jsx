import { useState, useMemo } from "react";
import { Select, Modal, Valores } from "../components/ui";
import { somaPorMoeda, fmtMoeda, moedaDoMercado } from "../lib/moedas";
import { VEREDITOS, VEREDITO, vereditosDo, vereditoDo, perguntaDo, FASES_ERRO, rotuloErro, MARCAS, estrelasDe, motivosRevisao, listarTrades, desdeDias, precisaRevisar,
  somarDias, segundaDe, rotuloSemana, respostaSugerida, proximoTreino, cartaoVence, INTERVALOS_TREINO } from "../lib/revisao";
import { hojeLocal } from "../lib/datas";
import { fonteDoEditor, trocarFotoAnotada, apagarArquivos } from "../lib/fotos";
import ImageEditor, { uploadTradeImage, ImageViewer, ImagemSegura } from "../components/ImageEditor";
import { alfa } from "../lib/cor.js";

const PERIODOS = [{ value:7, label:"Últimos 7 dias" }, { value:30, label:"Últimos 30 dias" }, { value:90, label:"Últimos 90 dias" }, { value:0, label:"Todo o período" }];
const EMOCAO_COLORS = {"Focado":"var(--accent)","Confiante":"#0099ff","Neutro":"var(--text-mute)","Atento":"#a78bfa","Cauteloso":"var(--warn-2)","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};

function dataCurta(dia) {
  return new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday:"short", day:"numeric", month:"short" }).replace(/\./g, "");
}
const rotulo = { margin:"0 0 10px", color:"var(--text-3)", fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1px" };

function Chip({ cor, children, style }) {
  return <span style={{padding:"3px 9px",borderRadius:"20px",fontSize:"11.5px",fontWeight:"700",whiteSpace:"nowrap",color:cor,background:alfa(cor,"17"),border:"1px solid "+alfa(cor,"40"),...style}}>{children}</span>;
}
function Estrelas({ q }) {
  const n = estrelasDe(q);
  if (!n) return null;
  return <span title="Execução" style={{color:"var(--warn)",fontSize:"12px",letterSpacing:"1px"}}>{"★".repeat(n)}<span style={{opacity:0.25}}>{"★".repeat(3 - n)}</span></span>;
}
function Resultado({ t, size = 14 }) {
  if (typeof t.resultado !== "number") return t.pontos != null ? <span style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:size,color:t.pontos>=0?"var(--accent)":"var(--neg)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span> : null;
  return <span style={{fontFamily:"var(--font-mono)",fontWeight:800,fontSize:size,color:t.resultado>=0?"var(--accent)":"var(--neg)"}}>{fmtMoeda(t.resultado, moedaDoMercado(t.mercado))}</span>;
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

export default function Revisao({ entries, saveEntry, estrategias, uid, config, saveConfig }) {
  const [aba, setAba] = useState("fila");
  const [periodo, setPeriodo] = useState(30);
  const [filtroEst, setFiltroEst] = useState("todas");
  const [todos, setTodos] = useState(false); // fila: incluir trades sem alerta
  const [aberto, setAberto] = useState(null); // chave "dia#idx" do trade na ficha
  const [semanaAberta, setSemanaAberta] = useState(null); // segunda-feira da semana sendo fechada

  const todosTrades = useMemo(() => listarTrades(entries), [entries]);
  const desde = desdeDias(periodo);
  const base = todosTrades.filter(it => it.dia >= desde && (filtroEst === "todas" || it.t.estrategia === filtroEst));
  const pendentes = base.filter(it => !it.t.revisao && (todos || motivosRevisao(it.t, it.entry).length));
  const revisados = base.filter(it => it.t.revisao);
  const biblioteca = todosTrades.filter(it => it.t.revisao?.marca && (filtroEst === "todas" || it.t.estrategia === filtroEst));
  const lista = aba === "revisados" ? revisados : aba === "biblioteca" ? biblioteca : pendentes;

  const hoje = hojeLocal();
  const cartoes = todosTrades.filter(it => it.t.revisao?.treino);
  const cartoesHoje = cartoes.filter(it => cartaoVence(it, hoje));

  // Revisão semanal: a semana passada fica pendente até ser fechada (se teve trade)
  const semanas = config?.revisaoSemanal || {};
  const segAtual = segundaDe(hoje), segPassada = somarDias(segAtual, -7);
  const passadaTeveTrade = todosTrades.some(it => it.dia >= segPassada && it.dia < segAtual);
  const fecharPassada = passadaTeveTrade && !semanas[segPassada]?.fechadaEm;
  const focoAtual = semanas[segAtual]?.foco;

  const comErro = revisados.filter(it => it.t.revisao.veredito !== "sem_erro");
  const custoErros = somaPorMoeda(comErro.filter(it => it.t.resultado < 0));
  const lossesRevisados = revisados.filter(it => it.t.tipo === "LOSS");
  const lossNoPlano = lossesRevisados.filter(it => it.t.revisao.veredito === "sem_erro").length;

  const itemAberto = aberto ? todosTrades.find(it => it.chave === aberto) : null;
  const posAberto = itemAberto ? lista.findIndex(it => it.chave === aberto) : -1;

  async function gravarRevisao(it, rev) {
    const entry = entries[it.dia];
    const trades = entry.trades.map((t, i) => {
      if (i !== it.idx) return t;
      const novo = { ...t };
      if (rev) novo.revisao = rev; else delete novo.revisao;
      return novo;
    });
    return saveEntry(it.dia, { ...entry, trades });
  }
  async function salvarRevisao(it, rev, proximo) {
    if (await gravarRevisao(it, rev) === false) return false;
    setAberto(proximo || null);
    return true;
  }
  async function responderTreino(it, acertou) {
    const rev = it.t.revisao;
    return gravarRevisao(it, { ...rev, treino: proximoTreino(rev.treino, acertou, hoje) });
  }
  // Fecha a semana (balanço + se cumpriu o foco) e grava o foco da semana seguinte
  async function salvarSemana(seg, dados, focoProxima) {
    const novo = { ...semanas, [seg]: { ...(semanas[seg] || {}), ...dados } };
    const prox = somarDias(seg, 7);
    if (focoProxima) novo[prox] = { ...(novo[prox] || {}), foco: focoProxima };
    else if (novo[prox]) { novo[prox] = { ...novo[prox] }; delete novo[prox].foco; }
    await saveConfig({ ...config, revisaoSemanal: novo });
    setSemanaAberta(null);
  }

  const abas = [["fila", "Para revisar", pendentes.length], ["revisados", "Revisados", revisados.length], ["padroes", "Padrões", null],
    ["biblioteca", "Biblioteca", biblioteca.length], ["treino", "Treino", cartoesHoje.length || null]];
  const usaPeriodo = ["fila", "revisados", "padroes"].includes(aba);

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:"22px"}}>
        <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"var(--text)",letterSpacing:"-0.8px"}}>Revisão</h1>
        <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"13px"}}>Estude os trades, separe erro de mercado e descubra quanto cada erro está custando.</p>
      </div>

      {(fecharPassada || focoAtual) && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:"12px",marginBottom:"14px"}}>
          {fecharPassada && (
            <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px 16px",borderRadius:"14px",background:"color-mix(in srgb, var(--warn) 7%, transparent)",border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)",flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:"200px"}}>
                <p style={{margin:0,color:"var(--warn)",fontSize:"13.5px",fontWeight:"800"}}>Feche a semana de {rotuloSemana(segPassada)}</p>
                <p style={{margin:"2px 0 0",color:"var(--text-3)",fontSize:"12.5px"}}>2 minutos: o que custou caro, o que você aprendeu e um foco para esta semana.</p>
              </div>
              <button onClick={()=>setSemanaAberta(segPassada)} style={{background:"var(--warn)",color:"#000",border:"none",borderRadius:"9px",padding:"0 14px",minHeight:"36px",fontWeight:"800",fontSize:"12.5px",cursor:"pointer",fontFamily:"var(--font-sans)",flexShrink:0}}>Fechar semana</button>
            </div>
          )}
          {focoAtual && (
            <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px",borderRadius:"14px",background:"color-mix(in srgb, var(--accent) 6%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)"}}>
              <span style={{fontSize:"20px"}}>🎯</span>
              <div style={{minWidth:0}}>
                <p style={{...rotulo,margin:"0 0 2px",color:"var(--accent)"}}>Foco desta semana</p>
                <p style={{margin:0,color:"var(--text)",fontSize:"14px",fontWeight:"700"}}>{focoAtual}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:"12px",marginBottom:"20px"}}>
        <Kpi titulo="Para revisar" sub={todos ? "todos os trades do período" : "trades com alerta no período"}>
          <span style={{color:pendentes.length?"var(--warn)":"var(--accent)"}}>{pendentes.length}</span>
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
            <button key={id} onClick={()=>setAba(id)} style={{padding:"7px 14px",borderRadius:"9px",border:"none",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-sans)",background:aba===id?"color-mix(in srgb, var(--accent) 12%, transparent)":"transparent",color:aba===id?"var(--accent)":"var(--text-3)",display:"flex",alignItems:"center",gap:"7px"}}>
              {rot}{n !== null && <span style={{fontSize:"11px",fontFamily:"var(--font-mono)",opacity:0.8}}>{n}</span>}
            </button>
          ))}
        </div>
        <div style={{flex:1}}/>
        {!fecharPassada && passadaTeveTrade && <button onClick={()=>setSemanaAberta(segPassada)} className="mtp-btn-sec" style={{minHeight:"34px",borderRadius:"20px",fontSize:"12px"}}>Semana passada</button>}
        {usaPeriodo && <Select value={periodo} onChange={setPeriodo} options={PERIODOS} popWidth={190}
          style={{padding:"6px 12px",minHeight:"34px",borderRadius:"20px",fontSize:"12px"}}/>}
        {aba !== "treino" && <Select value={filtroEst} onChange={setFiltroEst} popWidth={220}
          style={{padding:"6px 12px",minHeight:"34px",borderRadius:"20px",fontSize:"12px",color:filtroEst==="todas"?"var(--text-3)":"var(--accent)"}}
          options={[{value:"todas",label:"Todas estratégias"}, ...(estrategias||[]).map(e=>({value:e.nome,label:e.nome}))]}/>}
      </div>

      {aba === "padroes" ? <Padroes revisados={revisados} onAbrir={setAberto}/>
        : aba === "biblioteca" ? <Biblioteca itens={biblioteca} onAbrir={setAberto}/>
        : aba === "treino" ? <Treino key={hoje} cartoes={cartoes} cartoesHoje={cartoesHoje} onResponder={responderTreino} onAbrir={setAberto}/>
        : (
          <>
            {aba === "fila" && (
              <label style={{display:"inline-flex",alignItems:"center",gap:"8px",color:"var(--text-3)",fontSize:"12.5px",marginBottom:"12px",cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={todos} onChange={e=>setTodos(e.target.checked)} style={{accentColor:"var(--accent)"}}/>
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
      {semanaAberta && (
        <FecharSemana seg={semanaAberta} todosTrades={todosTrades} semana={semanas[semanaAberta] || {}} focoProxima={semanas[somarDias(semanaAberta, 7)]?.foco || ""}
          onFechar={()=>setSemanaAberta(null)} onSalvar={salvarSemana}
          onRevisar={()=>{ setSemanaAberta(null); setAba("fila"); setPeriodo(30); }} onAbrir={setAberto}/>
      )}
    </div>
  );
}

// Foto com a parte da direita (depois do ponto de decisão) escondida
function FotoCortada({ url, corte, revelar }) {
  return (
    <div style={{position:"relative",borderRadius:"10px",overflow:"hidden",border:"1px solid var(--line-strong)",background:"var(--bg)"}}>
      <ImagemSegura url={url} style={{width:"100%",display:"block",minHeight:"120px"}}/>
      {!revelar && (
        <div style={{position:"absolute",top:0,bottom:0,right:0,left:(corte * 100) + "%",background:"repeating-linear-gradient(135deg,var(--surface) 0 10px,var(--surface) 10px 20px)",borderLeft:"2px dashed var(--warn)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--warn)",fontSize:"30px",fontWeight:"800"}}>?</div>
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
    <button onClick={onAbrir} className="mtp-op-card" style={{"--op":t.tipo==="WIN"?"var(--accent)":"var(--neg)",display:"flex",alignItems:"center",gap:"14px",textAlign:"left",cursor:"pointer",width:"100%",fontFamily:"var(--font-sans)",color:"inherit"}}>
      <div style={{width:"72px",height:"48px",borderRadius:"8px",overflow:"hidden",flexShrink:0,border:"1px solid var(--line-strong)",background:"color-mix(in srgb, var(--ink) 3%, transparent)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)"}}>
        {foto
          ? <ImagemSegura url={foto} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:"6px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
          <span style={{color:"var(--text-2)",fontSize:"12.5px",fontWeight:"600",minWidth:"92px"}}>{dataCurta(dia)}{t.horario && <span style={{color:"var(--text-3)",fontFamily:"var(--font-mono)",marginLeft:"6px"}}>{t.horario}</span>}</span>
          <span style={{padding:"2px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"800",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)"}}>{t.tipo}</span>
          <Resultado t={t}/>
          {(t.ativo || t.estrategia) && <span style={{color:"var(--text-3)",fontSize:"12px"}}>{[t.ativo, t.estrategia].filter(Boolean).join(" · ")}</span>}
          <Estrelas q={t.qualidade}/>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
          {motivos.map(m => <Chip key={m.rot} cor={m.cor}>{m.rot}</Chip>)}
          {rev && <Chip cor={vereditoDo(t, rev.veredito)?.cor || "var(--text-mute)"}>{vereditoDo(t, rev.veredito)?.rot || rev.veredito}</Chip>}
          {rev?.erros?.map(e => <Chip key={e} cor="var(--text-soft)">{rotuloErro(e)}</Chip>)}
          {rev?.marca && MARCAS[rev.marca] && <Chip cor={MARCAS[rev.marca].cor}>★ {MARCAS[rev.marca].rot}</Chip>}
          {rev?.licao && <span style={{color:"var(--text-3)",fontSize:"12px",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>“{rev.licao}”</span>}
        </div>
      </div>
      <span style={{color:rev?"var(--text-3)":"var(--accent)",fontSize:"12.5px",fontWeight:"700",flexShrink:0}}>{rev ? "Abrir" : "Revisar →"}</span>
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
  const [fotoSel, setFotoSel] = useState(() => Math.max(0, (t.imagens || []).indexOf(inicial.treino?.foto)));
  const [treinoOn, setTreinoOn] = useState(!!inicial.treino);
  const [corte, setCorte] = useState(inicial.treino?.corte ?? 0.65);
  const [respTreino, setRespTreino] = useState(inicial.treino?.resposta || "");
  const [editor, setEditor] = useState(null); // { url, src, formas }
  const [viewer, setViewer] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const avisar = m => { setMsg(m); setTimeout(() => setMsg(""), 3500); };

  const fotos = t.imagens || [];
  const foto = fotos[Math.min(fotoSel, fotos.length - 1)];
  const comErro = veredito && veredito !== "sem_erro";
  const motivos = motivosRevisao(t, entry);
  const respEfetiva = respTreino || respostaSugerida({ veredito, erros: comErro ? erros : [], marca });

  function alternarErro(id) { setErros(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]); }

  async function salvar(irProximo) {
    if (!veredito) { avisar("Responda primeiro: " + perguntaDo(t).toLowerCase()); return; }
    const rev = { veredito, em: new Date().toISOString() };
    if (comErro && erros.length) rev.erros = erros;
    if (licao.trim()) rev.licao = licao.trim();
    if (marca) rev.marca = marca;
    if (treinoOn && foto) {
      if (!respEfetiva) { avisar("No treino, escolha a resposta certa: entrar ou não entrar."); return; }
      // mantém a caixa e a data da próxima vez se o cartão já existia
      rev.treino = { caixa: 1, proxima: hojeLocal(), ...(inicial.treino || {}), foto, corte, resposta: respEfetiva };
    }
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
    let { trade, apagar } = await trocarFotoAnotada(t, editor.url, file, formas, uid, dia);
    if (trade.revisao?.treino?.foto === editor.url) {
      const nova = trade.imagens[fotos.indexOf(editor.url)];
      trade = { ...trade, revisao: { ...trade.revisao, treino: { ...trade.revisao.treino, foto: nova } } };
    }
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
              <span style={{padding:"3px 10px",borderRadius:"6px",fontSize:"12px",fontWeight:"800",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)"}}>{t.tipo}</span>
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
                <div style={{borderRadius:"12px",overflow:"hidden",border:"1px solid var(--line-strong)",background:"var(--bg)",display:"flex",justifyContent:"center"}}>
                  <ImagemSegura url={foto} onClick={()=>setViewer(foto)} style={{maxWidth:"100%",maxHeight:"440px",objectFit:"contain",display:"block",cursor:"zoom-in"}}/>
                </div>
                <div style={{display:"flex",gap:"8px",alignItems:"center",marginTop:"10px",flexWrap:"wrap"}}>
                  {fotos.length > 1 && fotos.map((u, i) => (
                    <button key={u} onClick={()=>setFotoSel(i)} style={{width:"58px",height:"40px",padding:0,borderRadius:"7px",overflow:"hidden",cursor:"pointer",border:"2px solid "+(u===foto?"var(--accent)":"var(--line-strong)"),background:"none"}}>
                      <ImagemSegura url={u} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    </button>
                  ))}
                  <div style={{flex:1}}/>
                  <button onClick={()=>setEditor({ url: foto, ...fonteDoEditor(t, foto) })} className="mtp-btn-sec" style={{minHeight:"34px",color:"var(--warn)",borderColor:"color-mix(in srgb, var(--warn) 33.3%, transparent)"}}>
                    ✏️ Anotar na revisão
                  </button>
                  <label className="mtp-btn-sec" style={{minHeight:"34px",cursor:"pointer"}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ adicionarFoto(e.target.files[0]); e.target.value=""; }}/>
                    {enviando ? "enviando…" : "+ Foto"}
                  </label>
                </div>
                {t.camadas?.[foto] && <p style={{margin:"8px 0 0",color:"var(--text-3)",fontSize:"11.5px"}}>Os desenhos desta foto continuam editáveis: a camada <b style={{color:"var(--accent)"}}>Na hora</b> e a de <b style={{color:"var(--warn)"}}>Revisão</b>.</p>}
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
                    <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>{entry.emocoes.map(em => <Chip key={em} cor={EMOCAO_COLORS[em] || "var(--text-mute)"}>{em}</Chip>)}</div>
                  </div>
                )}
                {entry.observacao && <div><p style={rotulo}>Observação do dia</p><p style={{margin:0,color:"var(--text-2)",fontSize:"13px",lineHeight:1.6,fontStyle:"italic",whiteSpace:"pre-wrap"}}>{entry.observacao}</p></div>}
              </div>
            )}
          </div>

          {/* As três perguntas */}
          <div style={{minWidth:0,display:"flex",flexDirection:"column",gap:"20px"}}>
            <div>
              <p style={rotulo}>1 · {perguntaDo(t)}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                {vereditosDo(t).map(v => {
                  const on = veredito === v.id;
                  return (
                    <button key={v.id} onClick={()=>setVeredito(v.id)} style={{textAlign:"left",padding:"10px 12px",borderRadius:"11px",cursor:"pointer",fontFamily:"var(--font-sans)",border:"1px solid "+(on?alfa(v.cor,"88"):"var(--line-strong)"),background:on?alfa(v.cor,"16"):"transparent",transition:"all .15s"}}>
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
                          return <button key={id} onClick={()=>alternarErro(id)} style={{padding:"5px 11px",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"var(--font-sans)",border:"1px solid "+(on?"color-mix(in srgb, var(--neg) 53.3%, transparent)":"var(--line-strong)"),background:on?"color-mix(in srgb, var(--neg) 12%, transparent)":"transparent",color:on?"var(--neg-soft)":"var(--text-2)"}}>{rot}</button>;
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
                placeholder={veredito === "sem_erro" ? (t.tipo === "WIN" ? "O que fez este trade dar certo? (para repetir)" : "O que confirmou que o trade estava dentro do plano?") : "Na próxima vez, eu vou…"}
                style={{width:"100%",boxSizing:"border-box",resize:"vertical",background:"var(--card)",border:"1px solid var(--line-strong)",borderRadius:"10px",padding:"10px 12px",color:"var(--text)",fontSize:"13.5px",lineHeight:1.55,fontFamily:"var(--font-sans)",outline:"none"}}/>
            </div>

            <div>
              <p style={rotulo}>Guardar na biblioteca</p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {Object.entries(MARCAS).map(([id, m]) => {
                  const on = marca === id;
                  return <button key={id} onClick={()=>setMarca(on ? "" : id)} style={{padding:"6px 12px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-sans)",border:"1px solid "+(on?alfa(m.cor,"88"):"var(--line-strong)"),background:on?alfa(m.cor,"16"):"transparent",color:on?m.cor:"var(--text-3)"}}>★ {m.rot}</button>;
                })}
              </div>
            </div>

            {foto && (
              <div>
                <p style={rotulo}>Treino “Você entraria?”</p>
                <label style={{display:"inline-flex",alignItems:"center",gap:"8px",color:"var(--text-2)",fontSize:"13px",cursor:"pointer",userSelect:"none"}}>
                  <input type="checkbox" checked={treinoOn} onChange={e=>setTreinoOn(e.target.checked)} style={{accentColor:"var(--accent)"}}/>
                  Usar a foto selecionada no treino
                </label>
                {treinoOn && (
                  <div style={{marginTop:"10px",display:"flex",flexDirection:"column",gap:"10px"}}>
                    <FotoCortada url={fonteDoEditor(t, foto).src} corte={corte}/>
                    <input type="range" min={0.15} max={0.95} step={0.01} value={corte} onChange={e=>setCorte(+e.target.value)} aria-label="Ponto de corte da foto" style={{width:"100%",accentColor:"var(--warn)"}}/>
                    <p style={{margin:0,color:"var(--text-3)",fontSize:"12px"}}>Arraste até o momento da decisão, antes da entrada. A parte da direita fica escondida no treino{t.camadas?.[foto] ? " (o treino usa a foto sem desenhos)" : ""}.</p>
                    <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{color:"var(--text-3)",fontSize:"12.5px"}}>Resposta certa:</span>
                      {[["entrar","Entrar","var(--accent)"],["nao_entrar","Não entrar","var(--neg)"]].map(([id, rot, cor]) => {
                        const on = respEfetiva === id;
                        return <button key={id} onClick={()=>setRespTreino(id)} style={{padding:"5px 12px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-sans)",border:"1px solid "+(on?alfa(cor,"88"):"var(--line-strong)"),background:on?alfa(cor,"16"):"transparent",color:on?cor:"var(--text-3)"}}>{rot}</button>;
                      })}
                      {!respTreino && respEfetiva && <span style={{color:"var(--text-3)",fontSize:"11.5px"}}>sugerida pela revisão</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",borderTop:"1px solid var(--line)",paddingTop:"16px"}}>
              <button onClick={()=>salvar(true)} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"0 18px",minHeight:"40px",fontWeight:"800",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>
                {proximo ? "Salvar e próximo →" : "Salvar revisão"}
              </button>
              {proximo && <button onClick={()=>salvar(false)} className="mtp-btn-sec" style={{minHeight:"40px"}}>Salvar</button>}
              {t.revisao && <button onClick={()=>onSalvar(it, null, null)} className="mtp-btn-sec" style={{minHeight:"40px",color:"var(--text-3)"}} title="Volta o trade para a fila">Desfazer revisão</button>}
              {msg && <span role="alert" style={{color:"var(--neg-soft)",fontSize:"12.5px"}}>{msg}</span>}
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

  // Taxa de erro por recorte: estratégia, horário e emoção do dia
  const agrupar = chaveDe => {
    const g = {};
    for (const it of revisados) for (const k of [].concat(chaveDe(it) || [])) (g[k] ||= []).push(it);
    return Object.entries(g).map(([k, its]) => {
      const erro = its.filter(it => it.t.revisao.veredito !== "sem_erro");
      return { k, n: its.length, erro: erro.length, taxa: erro.length / its.length, custo: somaPorMoeda(erro.filter(it => it.t.resultado < 0).map(it => it.t)) };
    }).sort((a, b) => b.taxa - a.taxa || b.n - a.n);
  };
  const recortes = [
    ["Por estratégia", agrupar(it => it.t.estrategia || "Sem estratégia")],
    ["Por horário", agrupar(it => /^\d{1,2}:/.test(it.t.horario || "") ? it.t.horario.split(":")[0].padStart(2, "0") + "h" : null)],
    ["Por emoção do dia", agrupar(it => it.entry.emocoes || [])],
  ].filter(([, linhas]) => linhas.length);
  const meses = Object.entries(revisados.reduce((m, it) => { (m[it.dia.slice(0, 7)] ||= []).push(it); return m; }, {}))
    .sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    .map(([ym, its]) => ({ ym, n: its.length, taxa: its.filter(it => it.t.revisao.veredito !== "sem_erro").length / its.length }));
  const card = {background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"18px 20px"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
      <div style={card}>
        <p style={rotulo}>Erro ou mercado? · {revisados.length} trades revisados</p>
        <div style={{display:"flex",height:"12px",borderRadius:"6px",overflow:"hidden",background:"color-mix(in srgb, var(--ink) 4%, transparent)",marginBottom:"12px"}}>
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
                <div style={{gridColumn:"1 / -1",height:"6px",borderRadius:"3px",background:"color-mix(in srgb, var(--ink) 4%, transparent)",overflow:"hidden"}}>
                  <div style={{width:(r.n / maxN * 100) + "%",height:"100%",background:i===0?"var(--neg)":"color-mix(in srgb, var(--neg) 46.7%, transparent)",borderRadius:"3px"}}/>
                </div>
              </div>
            ))}
            <p style={{margin:"4px 0 0",color:"var(--text-3)",fontSize:"12px"}}>Custo = soma dos losses em que o erro apareceu. Sem o primeiro da lista, esse dinheiro estaria na sua conta.</p>
          </div>
        )}
      </div>

      {recortes.length > 0 && (
        <div style={card}>
          <p style={rotulo}>Onde os erros acontecem</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:"20px"}}>
            {recortes.map(([titulo, linhas]) => (
              <div key={titulo}>
                <p style={{margin:"0 0 8px",color:"var(--text-2)",fontSize:"12.5px",fontWeight:"700"}}>{titulo}</p>
                <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                  {linhas.slice(0, 6).map(l => {
                    const cor = l.taxa >= 0.6 ? "var(--neg)" : l.taxa >= 0.3 ? "var(--warn)" : "var(--accent)";
                    return (
                      <div key={l.k} title={l.erro + " com erro em " + l.n + " revisados"} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 44px",gap:"3px 10px",alignItems:"center"}}>
                        <span style={{color:"var(--text)",fontSize:"12.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.k} <span style={{color:"var(--text-3)"}}>· {l.n}</span></span>
                        <span style={{color:cor,fontSize:"12.5px",fontWeight:"800",fontFamily:"var(--font-mono)",textAlign:"right"}}>{Math.round(l.taxa * 100)}%</span>
                        <div style={{gridColumn:"1 / -1",height:"4px",borderRadius:"2px",background:"color-mix(in srgb, var(--ink) 4%, transparent)"}}>
                          <div style={{width:(l.taxa * 100) + "%",height:"100%",borderRadius:"2px",background:cor}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p style={{margin:"12px 0 0",color:"var(--text-3)",fontSize:"12px"}}>% dos trades revisados em que houve erro (análise, execução ou emocional).</p>
        </div>
      )}

      {meses.length > 1 && (
        <div style={card}>
          <p style={rotulo}>Os erros estão diminuindo?</p>
          <div style={{display:"flex",gap:"10px",alignItems:"flex-end",height:"120px"}}>
            {meses.map(m => (
              <div key={m.ym} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",height:"100%",justifyContent:"flex-end"}}>
                <span style={{color:"var(--text-2)",fontSize:"11.5px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{Math.round(m.taxa * 100)}%</span>
                <div title={m.n + " revisados"} style={{width:"100%",maxWidth:"46px",height:Math.max(4, m.taxa * 80) + "px",borderRadius:"6px 6px 2px 2px",background:m.taxa >= 0.6 ? "var(--neg)" : m.taxa >= 0.3 ? "var(--warn)" : "var(--accent)"}}/>
                <span style={{color:"var(--text-3)",fontSize:"11px"}}>{new Date(m.ym + "-15T12:00:00").toLocaleDateString("pt-BR",{month:"short"}).replace(".", "")}</span>
              </div>
            ))}
          </div>
          <p style={{margin:"10px 0 0",color:"var(--text-3)",fontSize:"12px"}}>% de trades com erro entre os revisados de cada mês. Barra baixando = você está aprendendo.</p>
        </div>
      )}

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

// ── Biblioteca: exemplos A+ e erros clássicos, por estratégia
function Biblioteca({ itens, onAbrir }) {
  const [tipo, setTipo] = useState("todos");
  const filtrados = itens.filter(it => tipo === "todos" || it.t.revisao.marca === tipo);
  if (!itens.length) {
    return (
      <div style={{background:"var(--card)",border:"1px dashed var(--line-strong)",borderRadius:"16px",padding:"36px 20px",textAlign:"center"}}>
        <p style={{margin:"0 0 6px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>Sua biblioteca está vazia</p>
        <p style={{margin:0,color:"var(--text-3)",fontSize:"13px"}}>Na ficha de revisão, marque um trade como <b style={{color:"var(--accent)"}}>Exemplo A+</b> ou <b style={{color:"var(--neg)"}}>Erro clássico</b>. Aqui vira o seu playbook visual: o que repetir e o que nunca mais fazer.</p>
      </div>
    );
  }
  const grupos = {};
  for (const it of filtrados) (grupos[it.t.estrategia || "Sem estratégia"] ||= []).push(it);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"22px"}}>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {[["todos","Todos","var(--text-soft)"], ...Object.entries(MARCAS).map(([id, m]) => [id, m.rot, m.cor])].map(([id, rot, cor]) => {
          const on = tipo === id;
          const n = id === "todos" ? itens.length : itens.filter(it => it.t.revisao.marca === id).length;
          return <button key={id} onClick={()=>setTipo(id)} style={{padding:"6px 13px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-sans)",border:"1px solid "+(on?alfa(cor,"88"):"var(--line-strong)"),background:on?alfa(cor,"16"):"transparent",color:on?cor:"var(--text-3)"}}>{rot} <span style={{opacity:0.7,fontFamily:"var(--font-mono)"}}>{n}</span></button>;
        })}
      </div>
      {Object.entries(grupos).map(([est, its]) => (
        <div key={est}>
          <p style={rotulo}>{est} · {its.length}</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:"12px"}}>
            {its.map(it => {
              const m = MARCAS[it.t.revisao.marca];
              const foto = (it.t.imagens || [])[0];
              return (
                <button key={it.chave} onClick={()=>onAbrir(it.chave)} style={{textAlign:"left",padding:0,borderRadius:"14px",overflow:"hidden",cursor:"pointer",background:"var(--card)",border:"1px solid "+alfa(m.cor,"33"),fontFamily:"var(--font-sans)",display:"flex",flexDirection:"column"}}>
                  <div style={{height:"140px",width:"100%",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-3)",fontSize:"12px"}}>
                    {foto ? <ImagemSegura url={foto} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/> : "sem foto"}
                  </div>
                  <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:"6px",width:"100%",boxSizing:"border-box"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
                      <Chip cor={m.cor}>★ {m.rot}</Chip>
                      <Resultado t={it.t} size={13}/>
                      <span style={{color:"var(--text-3)",fontSize:"11.5px",marginLeft:"auto"}}>{dataCurta(it.dia)}</span>
                    </div>
                    {it.t.revisao.licao && <p className="mtp-clamp-2" style={{margin:0,color:"var(--text-2)",fontSize:"12.5px",lineHeight:1.45}}>{it.t.revisao.licao}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Treino "Você entraria?": repetição espaçada com os seus próprios trades
function Treino({ cartoes, cartoesHoje, onResponder, onAbrir }) {
  const [fila] = useState(() => cartoesHoje.map(it => it.chave)); // fixa a sessão: responder muda a data do cartão
  const [pos, setPos] = useState(0);
  const [resposta, setResposta] = useState(null);
  const [placar, setPlacar] = useState({ certo: 0, errado: 0 });
  const caixas = [1, 2, 3, 4].map(c => cartoes.filter(it => (it.t.revisao.treino.caixa || 1) === c).length);
  // cartões da sessão que deixaram de existir (revisão desfeita) são pulados
  const restantes = fila.slice(pos).filter(k => cartoes.some(c => c.chave === k));

  const vazio = (titulo, texto) => (
    <div style={{background:"var(--card)",border:"1px dashed var(--line-strong)",borderRadius:"16px",padding:"36px 20px",textAlign:"center"}}>
      <p style={{margin:"0 0 6px",color:"var(--text)",fontSize:"15px",fontWeight:"700"}}>{titulo}</p>
      <p style={{margin:"0 auto",color:"var(--text-3)",fontSize:"13px",maxWidth:"560px",lineHeight:1.55}}>{texto}</p>
    </div>
  );
  const dominio = cartoes.length > 0 && (
    <div style={{display:"flex",gap:"14px",flexWrap:"wrap",color:"var(--text-3)",fontSize:"12px",marginTop:"14px",justifyContent:"center"}}>
      {["Aprendendo", "Revendo", "Firmando", "Dominado"].map((r, i) => (
        <span key={r}>{r} <b style={{color:"var(--text)",fontFamily:"var(--font-mono)"}}>{caixas[i]}</b> <span style={{opacity:0.7}}>· volta em {INTERVALOS_TREINO[i + 1]}d</span></span>
      ))}
    </div>
  );

  if (!cartoes.length) return vazio("Monte seu treino", "Na ficha de um trade revisado, ligue “Usar a foto no treino”, arraste o corte até o momento da decisão e diga se o certo era entrar ou não. O app mostra o gráfico cortado e você decide: quem acerta volta cada vez mais tarde, quem erra volta amanhã.");

  const chave = resposta ? fila[pos] : restantes[0];
  const it = chave && cartoes.find(c => c.chave === chave);
  if (!it) {
    const total = placar.certo + placar.errado;
    return <>{vazio(total ? "Treino do dia concluído" : "Nenhum cartão para hoje",
      total ? "Você acertou " + placar.certo + " de " + total + ". Os que você errou voltam amanhã." : "Seus " + cartoes.length + " cartões estão agendados para os próximos dias. Volte amanhã.")}{dominio}</>;
  }
  const { t } = it, tr = t.revisao.treino, rev = t.revisao;
  const fotoTreino = (t.imagens || []).includes(tr.foto) ? tr.foto : (t.imagens || [])[0];
  const acertou = resposta && resposta === tr.resposta;
  const numero = fila.indexOf(chave) + 1;

  async function responder(r) {
    setPos(fila.indexOf(chave));
    setResposta(r);
    setPlacar(p => r === tr.resposta ? { ...p, certo: p.certo + 1 } : { ...p, errado: p.errado + 1 });
    await onResponder(it, r === tr.resposta);
  }

  return (
    <div style={{maxWidth:"880px",margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",gap:"12px",flexWrap:"wrap"}}>
        <span style={{color:"var(--text-3)",fontSize:"12.5px"}}>Cartão <b style={{color:"var(--text)"}}>{numero}</b> de {fila.length}</span>
        <span style={{color:"var(--text-2)",fontSize:"13px"}}>{[t.mercado, t.ativo, t.estrategia].filter(Boolean).join(" · ")}</span>
        <span style={{color:"var(--text-3)",fontSize:"12.5px",fontFamily:"var(--font-mono)"}}>✓ {placar.certo} · ✗ {placar.errado}</span>
      </div>
      {fotoTreino
        ? <FotoCortada url={resposta ? fotoTreino : fonteDoEditor(t, fotoTreino).src} corte={tr.corte} revelar={!!resposta}/>
        : <p style={{color:"var(--text-3)"}}>Este cartão perdeu a foto.</p>}

      {!resposta ? (
        <div style={{textAlign:"center",marginTop:"18px"}}>
          <p style={{margin:"0 0 12px",color:"var(--text)",fontSize:"17px",fontWeight:"800"}}>Você entraria neste trade?</p>
          <div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={()=>responder("entrar")} style={{minWidth:"150px",minHeight:"46px",borderRadius:"12px",border:"1px solid color-mix(in srgb, var(--accent) 53.3%, transparent)",background:"color-mix(in srgb, var(--accent) 10%, transparent)",color:"var(--accent)",fontWeight:"800",fontSize:"14px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Entraria</button>
            <button onClick={()=>responder("nao_entrar")} style={{minWidth:"150px",minHeight:"46px",borderRadius:"12px",border:"1px solid color-mix(in srgb, var(--neg) 53.3%, transparent)",background:"color-mix(in srgb, var(--neg) 10%, transparent)",color:"var(--neg-soft)",fontWeight:"800",fontSize:"14px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Não entraria</button>
          </div>
        </div>
      ) : (
        <div style={{marginTop:"16px",padding:"16px 18px",borderRadius:"14px",background:acertou?"color-mix(in srgb, var(--accent) 7%, transparent)":"color-mix(in srgb, var(--neg) 7%, transparent)",border:"1px solid "+(acertou?"color-mix(in srgb, var(--accent) 26.7%, transparent)":"color-mix(in srgb, var(--neg) 26.7%, transparent)")}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"10px"}}>
            <span style={{color:acertou?"var(--accent)":"var(--neg-soft)",fontSize:"16px",fontWeight:"800"}}>{acertou ? "✓ Você acertou" : "✗ O certo era " + (tr.resposta === "entrar" ? "entrar" : "não entrar")}</span>
            <span style={{color:"var(--text-3)",fontSize:"12.5px"}}>{dataCurta(it.dia)}</span>
            <span style={{padding:"2px 8px",borderRadius:"5px",fontSize:"11px",fontWeight:"800",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)"}}>{t.tipo}</span>
            <Resultado t={t}/>
            {vereditoDo(t, rev.veredito) && <Chip cor={vereditoDo(t, rev.veredito).cor}>{vereditoDo(t, rev.veredito).rot}</Chip>}
            {(rev.erros || []).map(e => <Chip key={e} cor="var(--text-soft)">{rotuloErro(e)}</Chip>)}
          </div>
          {rev.licao && <p style={{margin:"0 0 12px",color:"var(--text)",fontSize:"14.5px",lineHeight:1.55,fontWeight:"600"}}>“{rev.licao}”</p>}
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            <button onClick={()=>{ setResposta(null); setPos(p => p + 1); }} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"0 18px",minHeight:"40px",fontWeight:"800",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{numero < fila.length ? "Próximo cartão →" : "Concluir"}</button>
            <button onClick={()=>onAbrir(it.chave)} className="mtp-btn-sec" style={{minHeight:"40px"}}>Abrir ficha</button>
          </div>
        </div>
      )}
      {dominio}
    </div>
  );
}

// ── Fechar a semana: balanço, erros que custaram, lições e o foco da semana seguinte
function FecharSemana({ seg, todosTrades, semana, focoProxima, onFechar, onSalvar, onRevisar, onAbrir }) {
  const [cumpriu, setCumpriu] = useState(semana.cumpriu || "");
  const [foco, setFoco] = useState(focoProxima);
  const [salvando, setSalvando] = useState(false);
  const fim = somarDias(seg, 7);
  const its = todosTrades.filter(it => it.dia >= seg && it.dia < fim);
  const trades = its.map(it => it.t);
  const wins = trades.filter(t => t.tipo === "WIN").length;
  const revisados = its.filter(it => it.t.revisao);
  const pend = its.filter(precisaRevisar);
  const porErro = {};
  for (const it of revisados) for (const e of it.t.revisao.erros || []) (porErro[e] ||= []).push(it.t);
  const ranking = Object.entries(porErro).map(([id, ts]) => ({ id, n: ts.length, custo: somaPorMoeda(ts.filter(t => t.resultado < 0)) }))
    .sort((a, b) => b.n - a.n);
  const licoes = revisados.filter(it => it.t.revisao.licao);
  const sugestoes = ranking.slice(0, 3).map(r => "Evitar: " + rotuloErro(r.id).toLowerCase());

  async function salvar() {
    setSalvando(true);
    const dados = { fechadaEm: new Date().toISOString() };
    if (cumpriu) dados.cumpriu = cumpriu;
    await onSalvar(seg, dados, foco.trim());
    setSalvando(false);
  }

  const bloco = { background:"var(--card)", border:"1px solid var(--line)", borderRadius:"14px", padding:"14px 16px" };
  const num = { color:"var(--text)", fontSize:"17px", fontWeight:"800", fontFamily:"var(--font-mono)" };
  return (
    <Modal onClose={onFechar} width={760}>
      <div style={{padding:"clamp(16px,3vw,28px)",display:"flex",flexDirection:"column",gap:"18px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:"12px"}}>
          <div style={{flex:1}}>
            <p style={{...rotulo,margin:"0 0 4px"}}>Revisão semanal</p>
            <h2 style={{margin:0,color:"var(--text)",fontSize:"21px",fontWeight:"800"}}>Semana de {rotuloSemana(seg)}</h2>
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{width:"34px",height:"34px",borderRadius:"9px",border:"1px solid var(--line-strong)",background:"transparent",color:"var(--text-2)",cursor:"pointer"}}>✕</button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"10px"}}>
          <div style={bloco}><p style={{...rotulo,margin:"0 0 4px"}}>Resultado</p><Valores partes={somaPorMoeda(trades)} style={{fontSize:"17px"}}/></div>
          <div style={bloco}><p style={{...rotulo,margin:"0 0 4px"}}>Trades</p><span style={num}>{trades.length}</span>{trades.length > 0 && <span style={{color:"var(--text-3)",fontSize:"12.5px"}}> · {Math.round(wins / trades.length * 100)}% acerto</span>}</div>
          <div style={bloco}><p style={{...rotulo,margin:"0 0 4px"}}>Revisados</p><span style={num}>{revisados.length}</span>{pend.length > 0 && <span style={{color:"var(--warn)",fontSize:"12.5px"}}> · {pend.length} pendente{pend.length > 1 ? "s" : ""}</span>}</div>
        </div>

        {pend.length > 0 && (
          <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",borderRadius:"12px",background:"color-mix(in srgb, var(--warn) 7%, transparent)",border:"1px solid color-mix(in srgb, var(--warn) 26.7%, transparent)",flexWrap:"wrap"}}>
            <span style={{flex:1,minWidth:"200px",color:"var(--text-2)",fontSize:"13px"}}>{pend.length} trade{pend.length > 1 ? "s" : ""} com alerta ainda sem revisão. O balanço fica mais honesto com eles revisados.</span>
            <button onClick={onRevisar} className="mtp-btn-sec" style={{minHeight:"34px",color:"var(--warn)",borderColor:"color-mix(in srgb, var(--warn) 33.3%, transparent)"}}>Revisar agora</button>
          </div>
        )}

        {ranking.length > 0 && (
          <div>
            <p style={rotulo}>Erros da semana</p>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {ranking.map(r => (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 12px",borderRadius:"10px",background:"color-mix(in srgb, var(--neg) 5%, transparent)",border:"1px solid color-mix(in srgb, var(--neg) 13.3%, transparent)"}}>
                  <span style={{flex:1,color:"var(--text)",fontSize:"13.5px",fontWeight:"600"}}>{rotuloErro(r.id)} <span style={{color:"var(--text-3)",fontWeight:500}}>· {r.n}×</span></span>
                  <Valores partes={r.custo} vazio="sem custo" style={{fontSize:"13px"}}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {licoes.length > 0 && (
          <div>
            <p style={rotulo}>Lições da semana</p>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {licoes.map(it => (
                <button key={it.chave} onClick={()=>onAbrir(it.chave)} style={{textAlign:"left",background:"none",border:"none",borderLeft:"3px solid "+(VEREDITO[it.t.revisao.veredito]?.cor || "var(--text-mute)"),padding:"4px 0 4px 12px",cursor:"pointer",color:"var(--text)",fontSize:"13.5px",lineHeight:1.5,fontFamily:"var(--font-sans)"}}>{it.t.revisao.licao}</button>
              ))}
            </div>
          </div>
        )}

        {semana.foco && (
          <div>
            <p style={rotulo}>O foco desta semana era</p>
            <p style={{margin:"0 0 10px",color:"var(--text)",fontSize:"14.5px",fontWeight:"700"}}>🎯 {semana.foco}</p>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {[["sim","Cumpri","var(--accent)"],["parcial","Em parte","var(--warn)"],["nao","Não cumpri","var(--neg)"]].map(([id, rot, cor]) => {
                const on = cumpriu === id;
                return <button key={id} onClick={()=>setCumpriu(on ? "" : id)} style={{padding:"6px 13px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontWeight:"700",fontFamily:"var(--font-sans)",border:"1px solid "+(on?alfa(cor,"88"):"var(--line-strong)"),background:on?alfa(cor,"16"):"transparent",color:on?cor:"var(--text-3)"}}>{rot}</button>;
              })}
            </div>
          </div>
        )}

        <div>
          <p style={rotulo}>Foco da semana seguinte</p>
          <input value={foco} onChange={e=>setFoco(e.target.value)} maxLength={120} placeholder="Uma regra só. Ex.: esperar o candle de confirmação antes de entrar"
            style={{width:"100%",boxSizing:"border-box",background:"var(--card)",border:"1px solid var(--line-strong)",borderRadius:"10px",padding:"11px 12px",color:"var(--text)",fontSize:"14px",fontFamily:"var(--font-sans)",outline:"none"}}/>
          {sugestoes.length > 0 && (
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginTop:"8px"}}>
              {sugestoes.map(s => <button key={s} onClick={()=>setFoco(s)} style={{padding:"4px 10px",borderRadius:"20px",cursor:"pointer",fontSize:"12px",fontFamily:"var(--font-sans)",border:"1px dashed var(--line-strong)",background:"transparent",color:"var(--text-3)"}}>{s}</button>)}
            </div>
          )}
          <p style={{margin:"8px 0 0",color:"var(--text-3)",fontSize:"12px"}}>O foco aparece no topo da Revisão e do Diário durante a semana.</p>
        </div>

        <div style={{display:"flex",gap:"8px",borderTop:"1px solid var(--line)",paddingTop:"16px"}}>
          <button onClick={salvar} disabled={salvando} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"10px",padding:"0 18px",minHeight:"40px",fontWeight:"800",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)",opacity:salvando?0.7:1}}>{salvando ? "Salvando…" : semana.fechadaEm ? "Salvar" : "Fechar a semana"}</button>
          <button onClick={onFechar} className="mtp-btn-sec" style={{minHeight:"40px"}}>Depois</button>
        </div>
      </div>
    </Modal>
  );
}
