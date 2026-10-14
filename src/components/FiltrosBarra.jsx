// Mi Trading Plan - barra de contexto da Evolução: conta + filtros (mercado, estratégias)
import { useState, useRef } from "react";
import { Popover } from "./ui";
import ContaModal, { Check } from "./ContaModal";
import { listaContas, TIPOS_CONTA } from "../lib/contas";

const MERCADOS = [
  { value:"todos",     label:"Todos" },
  { value:"B3",        label:"B3",        cor:"#2ee6a0" },
  { value:"Forex",     label:"Forex",     cor:"#f5b941" },
  { value:"Cripto",    label:"Cripto",    cor:"#a78bfa" },
  { value:"Americano", label:"Americano", cor:"#60a5fa" },
];

const secao = { margin:"0 0 10px", color:"var(--text-3)", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.3px" };

function Chevron({ aberto }) {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition:"transform .25s", transform:aberto?"rotate(180deg)":"none", opacity:.7 }}><polyline points="6 9 12 15 18 9"/></svg>;
}

export default function FiltrosBarra({ config, saveConfig, conta, setConta, mercado, setMercado, estrategiasSel, setEstrategiasSel, estrategias, ativosSel = [], setAtivosSel = () => {}, ativos = [], direita }) {
  const contas = listaContas(config);
  const [popConta, setPopConta] = useState(null);
  const [popFiltro, setPopFiltro] = useState(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const refConta = useRef(null), refFiltro = useRef(null);

  const contaAtual = contas.find(c => c.id === conta);
  const nFiltros = (mercado !== "todos" ? 1 : 0) + estrategiasSel.length + ativosSel.length;
  const alternarAtivo = a => setAtivosSel(ativosSel.includes(a) ? ativosSel.filter(x => x !== a) : [...ativosSel, a]);
  const limparTudo = () => { setMercado("todos"); setEstrategiasSel([]); setAtivosSel([]); };
  const alternarEst = n => setEstrategiasSel(estrategiasSel.includes(n) ? estrategiasSel.filter(x => x !== n) : [...estrategiasSel, n]);

  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
        {/* Filtros */}
        <button ref={refFiltro} className={"mtp-ctx-btn"+(popFiltro||nFiltros?" on":"")} onClick={() => setPopFiltro(popFiltro ? null : refFiltro.current.getBoundingClientRect())}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
          Filtros
          {nFiltros > 0 && <span className="mtp-ctx-badge">{nFiltros}</span>}
        </button>

        {/* Conta */}
        <button ref={refConta} className={"mtp-ctx-btn"+(popConta?" on":"")} onClick={() => setPopConta(popConta ? null : refConta.current.getBoundingClientRect())}>
          {contaAtual
            ? <><i className="mtp-dot" style={{ background:TIPOS_CONTA[contaAtual.tipo]?.cor || "#2ee6a0" }}/>{contaAtual.nome}{contaAtual.padrao && <span style={{ color:"var(--text-3)", fontWeight:500 }}>· padrão</span>}</>
            : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>Todas as contas</>}
          <Chevron aberto={!!popConta}/>
        </button>
        <button className="mtp-ctx-ghost" onClick={() => setNovaAberta(true)}>+ nova conta</button>

        {/* Filtros ativos */}
        {mercado !== "todos" && (
          <span className="mtp-chip-filtro">
            <i className="mtp-dot" style={{ background:MERCADOS.find(m => m.value === mercado)?.cor }}/>{mercado}
            <button onClick={() => setMercado("todos")} aria-label="Remover filtro de mercado">×</button>
          </span>
        )}
        {ativosSel.map(a => (
          <span key={"a:"+a} className="mtp-chip-filtro" style={{ fontFamily:"var(--font-mono)" }}>
            {a}
            <button onClick={() => alternarAtivo(a)} aria-label={"Remover "+a}>×</button>
          </span>
        ))}
        {estrategiasSel.map(n => (
          <span key={n} className="mtp-chip-filtro">
            {n}
            <button onClick={() => alternarEst(n)} aria-label={"Remover "+n}>×</button>
          </span>
        ))}
        {nFiltros > 1 && <button className="mtp-ctx-ghost" onClick={limparTudo}>limpar</button>}
      </div>

      {direita}

      {/* Popover: contas */}
      {popConta && (
        <Popover rect={popConta} onClose={() => setPopConta(null)} width={270} anchorRef={refConta}>
          {[{ id:"todas", nome:"Todas as contas" }, ...contas].map(c => (
            <div key={c.id} className={"mtp-option"+(conta === c.id ? " sel" : "")} onMouseDown={e => { e.preventDefault(); setConta(c.id); setPopConta(null); }}>
              <i className="mtp-dot" style={{ background: c.id === "todas" ? "var(--text-3)" : (TIPOS_CONTA[c.tipo]?.cor || "#2ee6a0") }}/>
              <span style={{ flex:1 }}>{c.nome}</span>
              {c.padrao && <span className="mtp-option-hint">padrão</span>}
              {c.tipo && !c.padrao && <span className="mtp-option-hint">{TIPOS_CONTA[c.tipo]?.label}</span>}
            </div>
          ))}
          <div style={{ height:"1px", background:"var(--line)", margin:"6px 4px" }}/>
          <div className="mtp-option" style={{ color:"var(--accent)" }} onMouseDown={e => { e.preventDefault(); setPopConta(null); setNovaAberta(true); }}>+ Nova conta</div>
        </Popover>
      )}

      {/* Popover: filtros */}
      {popFiltro && (
        <Popover rect={popFiltro} onClose={() => setPopFiltro(null)} width={300} maxHeight={460} anchorRef={refFiltro}>
          <div style={{ padding:"8px 8px 4px" }}>
            <p style={secao}>Mercado</p>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
              {MERCADOS.map(m => (
                <button key={m.value} onClick={() => setMercado(m.value)} className={"mtp-pill"+(mercado === m.value ? " active" : "")} style={{ "--pill": m.cor || "var(--accent)", padding:"5px 12px", fontSize:"12px" }}>{m.label}</button>
              ))}
            </div>
            {ativos.length > 0 && <>
              <p style={secao}>Ativos {ativosSel.length > 0 && <span style={{ color:"var(--accent)" }}>· {ativosSel.length}</span>}</p>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
                {ativos.map(a => (
                  <button key={a} onClick={() => alternarAtivo(a)} className={"mtp-pill"+(ativosSel.includes(a) ? " active" : "")} style={{ padding:"5px 11px", fontSize:"12px", fontFamily:"var(--font-mono)" }}>{a}</button>
                ))}
              </div>
            </>}
            <p style={secao}>Estratégias {estrategiasSel.length > 0 && <span style={{ color:"var(--accent)" }}>· {estrategiasSel.length}</span>}</p>
          </div>
          {estrategias.length === 0
            ? <p style={{ margin:"0 8px 8px", color:"var(--text-3)", fontSize:"12.5px" }}>Nenhuma estratégia com operações no período.</p>
            : estrategias.map(n => (
              <div key={n} className={"mtp-option"+(estrategiasSel.includes(n) ? " sel" : "")} onMouseDown={e => { e.preventDefault(); alternarEst(n); }}>
                <Check marcado={estrategiasSel.includes(n)}/>
                <span style={{ flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{n}</span>
              </div>
            ))}
          {nFiltros > 0 && (
            <>
              <div style={{ height:"1px", background:"var(--line)", margin:"6px 4px" }}/>
              <div className="mtp-option" style={{ color:"#ff7a90" }} onMouseDown={e => { e.preventDefault(); limparTudo(); }}>Limpar filtros</div>
            </>
          )}
        </Popover>
      )}

      {novaAberta && <ContaModal config={config} saveConfig={saveConfig} conta={null} onClose={() => setNovaAberta(false)} onSalva={id => { setNovaAberta(false); setConta(id); }}/>}
    </div>
  );
}
