import { useState } from "react";
import { Select, Valores } from "../components/ui";
import { somaPorMoeda, corDasPartes } from "../lib/moedas";
import { semanasUteis, temFimDeSemana, DIAS_UTEIS, DIAS_SEMANA_SEG } from "../lib/datas";
import { entradaFiltrada } from "../lib/contas";
import { recalcularCustos } from "../lib/custos";
import { ImageViewer, ImagemSegura } from "../components/ImageEditor";
import { vereditoDo } from "../lib/revisao";
import { alfa } from "../lib/cor.js";
import { acaoExemplo } from "../lib/exemplos";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const EMOCAO_COLORS = {"Focado":"var(--accent)","Confiante":"#0099ff","Neutro":"var(--text-mute)","Atento":"#a78bfa","Cauteloso":"var(--warn-2)","Ansioso":"#f87171","Impaciente":"#fb923c","Frustrado":"#ef4444","Eufórico":"#f472b6","Medo":"#6b7280","Cansado":"#9ca3af","Revanche":"#dc2626","Compulsivo":"#d946ef"};
const EMOCOES_LIST = ["Focado","Confiante","Neutro","Atento","Cauteloso","Ansioso","Impaciente","Frustrado","Eufórico","Medo","Cansado","Revanche","Compulsivo"];

function dayKey(y,m,d) { return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
function formatDateLong(s) { const p=s.split("-"); const d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString("pt-BR",{day:"numeric",month:"long",weekday:"long"}); }

export default function Historico({ entries, saveEntry, deleteEntry, estrategias, saveEstrategia, config }) {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [sel,   setSel]   = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [msg, setMsg] = useState("");
  const [filtroMercado, setFiltroMercado] = useState("todos");
  const [filtroEst, setFiltroEst] = useState("todas");
  const [viewerImg, setViewerImg] = useState(null);

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const selEntry  = sel ? entries[sel] : null;

  // Build weeks
  // Só dias úteis (seg a sex); sábado e domingo aparecem se o mês tiver registro neles
  const fimDeSemana = temFimDeSemana(Object.keys(entries), year, month);
  const weeks = semanasUteis(year, month, fimDeSemana).map(sem => ({
    days: sem.map(d => d === null ? null : { d, k: dayKey(year,month,d), e: entries[dayKey(year,month,d)] }),
  }));

  // Totais da semana e do mês, respeitando os filtros de mercado e estratégia
  const filtrados = e => (e?.trades||[]).filter(t=>(filtroMercado==="todos"||t.mercado===filtroMercado)&&(filtroEst==="todas"||t.estrategia===filtroEst));
  const resumo = cells => {
    const trs = cells.filter(Boolean).flatMap(c => filtrados(c.e));
    const dias = cells.filter(c => c && filtrados(c.e).length).length;
    return { dias, trades: trs.length, partes: somaPorMoeda(trs), wr: trs.length ? Math.round(trs.filter(t=>t.tipo==="WIN").length/trs.length*100) : null };
  };
  const resumoMes = resumo(weeks.flatMap(w => w.days));
  const COLUNAS = "repeat("+(fimDeSemana?7:5)+",minmax(0,1fr)) minmax(0,1.1fr)";

  // Edit functions
  function startEdit() {
    if (!selEntry) return;
    setEditEntry(JSON.parse(JSON.stringify(selEntry)));
    setEditMode(true);
  }

  function removeTradeFromEdit(idx) {
    // recalcula custos do dia (IRRF, zeragem, nota) e os totais
    const resto = editEntry.trades.filter((_,i)=>i!==idx);
    setEditEntry(entradaFiltrada({ ...editEntry, trades: recalcularCustos(resto, editEntry, config) }, () => true));
  }

  function toggleTradeType(idx) {
    const updated = {...editEntry, trades: [...editEntry.trades]};
    updated.trades[idx] = {...updated.trades[idx], tipo: updated.trades[idx].tipo==="WIN"?"LOSS":"WIN"};
    const wins = updated.trades.filter(t=>t.tipo==="WIN").length;
    updated.winRate = updated.trades.length>0 ? Math.round((wins/updated.trades.length)*100) : undefined;
    setEditEntry(updated);
  }

  function toggleEmocaoEdit(em) {
    const updated = {...editEntry};
    const ems = updated.emocoes||[];
    updated.emocoes = ems.includes(em) ? ems.filter(e=>e!==em) : [...ems, em];
    setEditEntry(updated);
  }

  async function saveEdit() {
    const data = {...editEntry};
    // Clean undefined
    Object.keys(data).forEach(k=>{ if(data[k]===undefined) delete data[k]; });
    await saveEntry(sel, data);
    setMsg("✓ Salvo!"); setTimeout(()=>setMsg(""),2000);
    setEditMode(false);
  }

  async function handleDelete() {
    if (!window.confirm("Excluir este dia?")) return;
    await deleteEntry(sel);
    setSel(null); setEditMode(false);
  }

  const inp = {background:"var(--line)",border:"1px solid var(--line-strong)",borderRadius:"8px",padding:"8px 12px",color:"var(--text)",fontSize:"13px",outline:"none",fontFamily:"var(--font-sans)"};

  return (
    <div style={{fontFamily:"var(--font-sans)"}}>
      <div style={{marginBottom:"28px"}}>
        <h1 style={{margin:0,fontSize:"28px",fontWeight:"800",color:"var(--text)",letterSpacing:"-0.8px"}}>Histórico</h1>
        <p style={{margin:"4px 0 0",color:"var(--text-mute)",fontSize:"13px"}}>Clique em um dia para ver detalhes ou editar</p>
      </div>

      {/* Nav mes */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <button onClick={prevMonth} style={{background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line)",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-soft)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{textAlign:"center"}}>
          <h2 style={{margin:0,color:"var(--text)",fontSize:"18px",fontWeight:"700"}}>{MONTH_NAMES[month]} {year}</h2>
          {resumoMes.trades > 0 && (
            <p style={{margin:"5px 0 0",color:"var(--text-mute)",fontSize:"12.5px"}}>
              {resumoMes.dias} dia{resumoMes.dias!==1?"s":""} · {resumoMes.trades} trade{resumoMes.trades!==1?"s":""}
              {resumoMes.wr!==null && <> · <span style={{color:resumoMes.wr>=60?"var(--accent)":resumoMes.wr>=40?"var(--warn-2)":"var(--neg)",fontWeight:"700"}}>{resumoMes.wr}% acerto</span></>} ·{" "}
              <Valores partes={resumoMes.partes}/>
            </p>
          )}
        </div>
        <button onClick={nextMonth} style={{background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line)",borderRadius:"8px",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-soft)"}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"20px",alignItems:"center"}}>
        {[["todos","Todos"],["B3","B3"],["Forex","Forex"],["Cripto","Cripto"],["Americano","Americano"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroMercado(v)} style={{padding:"6px 14px",borderRadius:"20px",border:"1px solid "+(filtroMercado===v?"color-mix(in srgb, var(--accent) 26.7%, transparent)":"var(--line)"),cursor:"pointer",fontWeight:"600",fontSize:"12px",background:filtroMercado===v?"color-mix(in srgb, var(--accent) 10%, transparent)":"transparent",color:filtroMercado===v?"var(--accent)":"var(--text-4)",fontFamily:"var(--font-sans)",transition:"all 0.15s"}}>{l}</button>
        ))}
        <div style={{width:"1px",height:"20px",background:"var(--line)",margin:"0 4px"}}/>
        <Select value={filtroEst} onChange={setFiltroEst} popWidth={220}
          style={{padding:"6px 12px",minHeight:"32px",borderRadius:"20px",fontSize:"12px",color:filtroEst==="todas"?"var(--text-3)":"var(--accent)",border:"1px solid "+(filtroEst==="todas"?"var(--line)":"color-mix(in srgb, var(--accent) 26.7%, transparent)"),background:filtroEst==="todas"?"transparent":"color-mix(in srgb, var(--accent) 8%, transparent)"}}
          options={[{value:"todas",label:"Todas estratégias"}, ...(estrategias||[]).map(e=>({value:e.nome,label:e.nome}))]}/>
      </div>

      {/* Calendar */}
      <div style={{background:"var(--card)",border:"1px solid var(--line)",borderRadius:"16px",padding:"20px",marginBottom:"24px"}}>
        {/* Header dias */}
        <div style={{display:"grid",gridTemplateColumns:COLUNAS,gap:"8px",marginBottom:"12px"}}>
          {[...(fimDeSemana?DIAS_SEMANA_SEG:DIAS_UTEIS),"Semana"].map(d=>(
            <div key={d} style={{textAlign:"center",color:d==="Semana"?"var(--text-soft)":"var(--text-3)",fontSize:"12px",fontWeight:"700",padding:"4px 0",letterSpacing:"0.5px"}}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((w,wi)=>(
          <div key={wi} style={{display:"grid",gridTemplateColumns:COLUNAS,gap:"8px",marginBottom:"8px"}}>
            {w.days.map((cell,ci)=>{
              if (!cell) return <div key={ci} style={{minHeight:"96px"}}/>;
              const {d,k,e} = cell;
              const isToday = d===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
              const tradesDodia = (e?.trades||[]).filter(t=>(filtroMercado==="todos"||t.mercado===filtroMercado)&&(filtroEst==="todas"||t.estrategia===filtroEst));
              const partesDia = somaPorMoeda(tradesDodia), cor = corDasPartes(partesDia);
              const hasTrades = tradesDodia.length > 0;
              const numTrades = tradesDodia.length;
              const winsDodia = tradesDodia.filter(t=>t.tipo==="WIN").length;
              const wrDodia = numTrades > 0 ? Math.round((winsDodia/numTrades)*100) : null;
              const isSel = sel===k;
              const bg = isSel ? alfa(cor,"33") : hasTrades ? alfa(cor,"14") : "color-mix(in srgb, var(--ink) 1%, transparent)";
              const border = isSel ? "2px solid "+cor : isToday?"2px solid color-mix(in srgb, var(--accent) 26.7%, transparent)":hasTrades?"1px solid "+alfa(cor,"33"):"1px solid var(--line)";
              return (
                <div key={ci} className={"mtp-cal-dia"+(hasTrades?" tem":"")+(isToday?" hoje":"")} onClick={()=>{ if (!hasTrades) return; setSel(isSel?null:k); setEditMode(false); }}
                  style={{background:bg,border,minHeight:"96px"}}>
                  <span className="mtp-cal-num">{d}</span>
                  {hasTrades && <>
                    <Valores partes={partesDia} compacto empilhar style={{fontSize:"15px"}}/>
                    <span className="mtp-cal-sub">{numTrades} trade{numTrades!==1?"s":""}{wrDodia!==null && <> · <b style={{color:wrDodia>=60?"var(--accent)":wrDodia>=40?"var(--warn-2)":"var(--neg)"}}>{wrDodia}%</b></>}</span>
                    {e.emocoes?.length>0 && <span className="mtp-cal-sub" style={{color:EMOCAO_COLORS[e.emocoes[0]]||"var(--text-3)"}}>{e.emocoes[0]}</span>}
                  </>}
                </div>
              );
            })}
            {(() => {
              const r = resumo(w.days);
              const cor = corDasPartes(r.partes);
              return (
                <div className="mtp-cal-dia" style={{border:"1px solid "+(r.trades?alfa(cor,"44"):"var(--line)"),background:r.trades?"color-mix(in srgb, var(--ink) 3%, transparent)":"transparent",minHeight:"96px"}}>
                  {r.trades ? <>
                    <Valores partes={r.partes} compacto empilhar style={{fontSize:"15px"}}/>
                    <span className="mtp-cal-sub">{r.trades} trade{r.trades!==1?"s":""}{r.wr!==null && <> · <b style={{color:r.wr>=60?"var(--accent)":r.wr>=40?"var(--warn-2)":"var(--neg)"}}>{r.wr}%</b></>}</span>
                  </> : <span className="mtp-cal-sub" style={{color:"var(--text-5)"}}>—</span>}
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Detalhe do dia */}
      {sel && selEntry && !editMode && (
        <div style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"16px",padding:"24px"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 6px",color:"var(--text-mute)",fontSize:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>{formatDateLong(sel)}</p>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {selEntry.totalPts!==undefined&&<div style={{background:"color-mix(in srgb, var(--accent) 8%, transparent)",border:"1px solid color-mix(in srgb, var(--accent) 13.3%, transparent)",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"var(--text-mute)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Pontos</p><p style={{margin:0,color:"var(--accent)",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.totalPts>=0?"+":""}{selEntry.totalPts}</p></div>}
                {(selEntry.trades||[]).length>0&&<div style={{background:"color-mix(in srgb, var(--ink) 3%, transparent)",border:"1px solid var(--line)",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"var(--text-mute)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Resultado</p><Valores partes={somaPorMoeda(selEntry.trades)} style={{fontSize:"18px"}}/></div>}
                {selEntry.numTrades&&<div style={{background:"color-mix(in srgb, var(--ink) 3%, transparent)",border:"1px solid var(--line)",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"var(--text-mute)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Trades</p><p style={{margin:0,color:"var(--text)",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.numTrades}</p></div>}
                {selEntry.winRate!==undefined&&<div style={{background:"color-mix(in srgb, var(--ink) 3%, transparent)",border:"1px solid var(--line)",borderRadius:"10px",padding:"8px 14px",textAlign:"center"}}><p style={{margin:"0 0 2px",color:"var(--text-mute)",fontSize:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Win Rate</p><p style={{margin:0,color:selEntry.winRate>=60?"var(--accent)":"var(--warn-2)",fontSize:"18px",fontWeight:"800",fontFamily:"var(--font-mono)"}}>{selEntry.winRate}%</p></div>}
              </div>
            </div>
            <div style={{display:"flex",gap:"8px",flexShrink:0}}>
              <button onClick={startEdit} style={{background:"rgba(0,153,255,0.1)",border:"1px solid #0099ff33",borderRadius:"8px",padding:"8px 14px",color:"#0099ff",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>✏️ Editar</button>
              <button onClick={handleDelete} style={{background:"color-mix(in srgb, var(--neg) 10%, transparent)",border:"1px solid color-mix(in srgb, var(--neg) 20%, transparent)",borderRadius:"8px",padding:"8px 14px",color:"var(--neg)",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>🗑 Excluir dia</button>
              <button onClick={()=>setSel(null)} style={{background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line)",borderRadius:"8px",width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text-mute)"}}>✕</button>
            </div>
          </div>

          {/* Emocoes */}
          {selEntry.emocoes?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 8px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
                {selEntry.emocoes.map(em=><span key={em} style={{padding:"4px 12px",borderRadius:"20px",background:alfa(EMOCAO_COLORS[em]||"var(--text-mute)","1a"),color:EMOCAO_COLORS[em]||"var(--text-mute)",fontSize:"12px",fontWeight:"600",border:"1px solid "+alfa(EMOCAO_COLORS[em]||"var(--text-mute)","44")}}>{em}</span>)}
              </div>
            </div>
          )}

          {/* Trades */}
          {selEntry.trades?.length>0&&(
            <div style={{marginBottom:"16px"}}>
              <p style={{margin:"0 0 10px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações ({selEntry.trades.length})</p>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {selEntry.trades.map((t,i)=>(
                  <div key={i} style={{padding:"12px 16px",borderRadius:"10px",background:"color-mix(in srgb, var(--ink) 2%, transparent)",border:"1px solid var(--line)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:t.observacao?"8px":"0"}}>
                      <span style={{color:"var(--text-mute)",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                      <span style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)"}}>{t.tipo}</span>
                      <span style={{color:"var(--text-soft)",fontSize:"12px"}}>{t.mercado}</span>
                      {t.estrategia&&<span style={{color:"var(--text-mute)",fontSize:"12px",background:"color-mix(in srgb, var(--ink) 4%, transparent)",padding:"2px 8px",borderRadius:"4px"}}>{t.estrategia}</span>}
                      {vereditoDo(t,t.revisao?.veredito)&&<span title={"Revisado: "+vereditoDo(t,t.revisao.veredito).desc} style={{color:vereditoDo(t,t.revisao.veredito).cor,fontSize:"11px",fontWeight:"700",border:"1px solid "+alfa(vereditoDo(t,t.revisao.veredito).cor,"44"),padding:"2px 8px",borderRadius:"20px"}}>✓ {vereditoDo(t,t.revisao.veredito).rot}</span>}
                      <div style={{marginLeft:"auto",display:"flex",gap:"12px"}}>
                        {t.pontos!=null&&<span style={{color:"var(--text-2)",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                        {t.resultado!=null&&<span style={{color:t.resultado>=0?"var(--accent)":"var(--neg)",fontSize:"13px",fontWeight:"700",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                      </div>
                    </div>
                    {t.observacao&&<p style={{margin:0,color:"var(--text-mute)",fontSize:"12px",fontStyle:"italic",paddingLeft:"32px"}}>"{t.observacao}"</p>}
                    {(t.imagens||[]).length>0&&(
                      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"10px",paddingLeft:"32px"}}>
                        {t.imagens.map((url,ii)=>(
                          <div key={ii} style={{width:"120px",height:"80px",borderRadius:"8px",overflow:"hidden",border:"1px solid var(--line-strong)",boxShadow:"0 2px 8px color-mix(in srgb, var(--shade) 35%, transparent)"}}>
                            <ImagemSegura url={url} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",cursor:"pointer"}} onClick={()=>setViewerImg(url)}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selEntry.observacao&&(
            <div style={{padding:"14px",borderRadius:"10px",background:"color-mix(in srgb, var(--ink) 2%, transparent)",border:"1px solid var(--line)"}}>
              <p style={{margin:"0 0 6px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observação geral</p>
              <p style={{margin:0,color:"var(--text-mute)",fontSize:"13px",lineHeight:"1.6",fontStyle:"italic"}}>{selEntry.observacao}</p>
            </div>
          )}
        </div>
      )}

      {/* Modo edição */}
      {sel && editEntry && editMode && (
        <div style={{background:"var(--panel)",border:"1px solid #0099ff33",borderRadius:"16px",padding:"24px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <p style={{margin:"0 0 2px",color:"#0099ff",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Editando</p>
              <p style={{margin:0,color:"var(--text)",fontSize:"16px",fontWeight:"700"}}>{formatDateLong(sel)}</p>
            </div>
            <div style={{display:"flex",gap:"8px"}}>
              {msg&&<span style={{color:"var(--accent)",fontSize:"13px",fontWeight:"600",alignSelf:"center"}}>{msg}</span>}
              <button onClick={saveEdit} style={{background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",border:"none",borderRadius:"8px",padding:"9px 18px",fontWeight:"700",fontSize:"13px",cursor:"pointer"}}>Salvar</button>
              <button onClick={()=>setEditMode(false)} style={{background:"color-mix(in srgb, var(--ink) 4%, transparent)",border:"1px solid var(--line-strong)",borderRadius:"8px",padding:"9px 14px",color:"var(--text-soft)",fontSize:"13px",cursor:"pointer",fontFamily:"var(--font-sans)"}}>Cancelar</button>
            </div>
          </div>

          {/* Edit emocoes */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Emoções</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
              {EMOCOES_LIST.map(em=>{
                const sel2=(editEntry.emocoes||[]).includes(em);
                const cor=EMOCAO_COLORS[em]||"var(--text-mute)";
                return <button key={em} onClick={()=>toggleEmocaoEdit(em)} style={{padding:"5px 12px",borderRadius:"20px",border:"1px solid "+(sel2?alfa(cor,"66"):"var(--line-strong)"),background:sel2?alfa(cor,"1a"):"transparent",color:sel2?cor:"var(--text-4)",fontSize:"12px",fontWeight:"600",cursor:"pointer",fontFamily:"var(--font-sans)"}}>{em}</button>;
              })}
            </div>
          </div>

          {/* Edit trades */}
          <div style={{marginBottom:"20px"}}>
            <p style={{margin:"0 0 10px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Operações — clique no WIN/LOSS para alternar, ✕ para remover</p>
            <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
              {(editEntry.trades||[]).map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px",borderRadius:"10px",background:"color-mix(in srgb, var(--ink) 2%, transparent)",border:"1px solid var(--line-strong)"}}>
                  <span style={{color:"var(--text-mute)",fontSize:"11px",minWidth:"22px"}}>#{i+1}</span>
                  <button onClick={()=>toggleTradeType(i)} style={{padding:"3px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:"700",background:t.tipo==="WIN"?"color-mix(in srgb, var(--accent) 15%, transparent)":"color-mix(in srgb, var(--neg) 15%, transparent)",color:t.tipo==="WIN"?"var(--accent)":"var(--neg)",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)"}}>{t.tipo}</button>
                  <span style={{color:"var(--text-soft)",fontSize:"12px"}}>{t.mercado}</span>
                  {t.estrategia&&<span style={{color:"var(--text-mute)",fontSize:"12px"}}>{t.estrategia}</span>}
                  <div style={{marginLeft:"auto",display:"flex",gap:"12px",alignItems:"center"}}>
                    {t.pontos!=null&&<span style={{color:"var(--text-2)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.pontos>=0?"+":""}{t.pontos} pts</span>}
                    {t.resultado!=null&&<span style={{color:t.resultado>=0?"var(--accent)":"var(--neg)",fontSize:"13px",fontFamily:"var(--font-mono)"}}>{t.resultado>=0?"+":""}{t.mercado==="B3"?"R$":"$"} {t.resultado?.toFixed(2)}</span>}
                    <button onClick={()=>removeTradeFromEdit(i)} style={{background:"color-mix(in srgb, var(--neg) 10%, transparent)",border:"none",borderRadius:"6px",color:"var(--neg-soft)",cursor:"pointer",padding:"4px 8px",fontSize:"12px"}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit observacao */}
          <div>
            <p style={{margin:"0 0 8px",color:"var(--text-mute)",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px"}}>Observação geral</p>
            <textarea value={editEntry.observacao||""} onChange={e=>setEditEntry(p=>({...p,observacao:e.target.value}))} style={{...inp,width:"100%",resize:"vertical",lineHeight:"1.6",minHeight:"70px",boxSizing:"border-box"}} placeholder="Observações do dia..." rows={3}/>
          </div>
        </div>
      )}

      {viewerImg && <ImageViewer url={viewerImg} onClose={()=>setViewerImg(null)} acao={acaoExemplo(viewerImg, { entries, estrategias, saveEstrategia })}/>}
    </div>
  );
}
