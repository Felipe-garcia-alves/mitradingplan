// Mi Trading Plan - Configurações › Contas de trading
import { useState } from "react";
import ContaModal from "./ContaModal";
import { listaContas, salvarContas, contaDoTrade, limitesDaConta, TIPOS_CONTA, ID_PRINCIPAL } from "../lib/contas";
import { MERCADOS } from "../lib/banca";
import { alfa } from "../lib/cor.js";

const btn = { background:"color-mix(in srgb, var(--ink) 4%, transparent)", border:"1px solid var(--line)", borderRadius:"8px", padding:"6px 11px", color:"var(--text-2)", fontSize:"11.5px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)", whiteSpace:"nowrap" };

export default function ContasConfig({ config, saveConfig, entries }) {
  const contas = listaContas(config);
  const [editando, setEditando] = useState(undefined); // undefined = fechado, null = nova

  // operações por conta
  const ops = {};
  Object.values(entries || {}).forEach(e => (e.trades || []).forEach(t => { const c = contaDoTrade(t); ops[c] = (ops[c] || 0) + 1; }));

  async function tornarPadrao(id) {
    await saveConfig(salvarContas(config, contas.map(c => ({ ...c, padrao: c.id === id }))));
  }

  async function excluir(c) {
    if (ops[c.id]) return;
    if (!window.confirm(`Excluir a conta "${c.nome}"? Os saques e depósitos registrados nela também serão removidos.`)) return;
    const restantes = contas.filter(x => x.id !== c.id);
    const novo = salvarContas(config, c.padrao ? restantes.map(x => ({ ...x, padrao: x.id === ID_PRINCIPAL })) : restantes);
    novo.saques = (config?.saques || []).filter(s => s.carteira !== "conta:" + c.id);
    novo.depositos = (config?.depositos || []).filter(s => s.carteira !== "conta:" + c.id);
    await saveConfig(novo);
  }

  return (
    <div style={{ background:"var(--panel)", border:"1px solid var(--line)", borderRadius:"14px", padding:"22px", marginBottom:"16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"12px", marginBottom:"14px", flexWrap:"wrap" }}>
        <div>
          <p style={{ margin:0, color:"var(--text-mute)", fontSize:"11px", textTransform:"uppercase", letterSpacing:"1px" }}>Contas de trading</p>
          <p style={{ margin:"4px 0 0", color:"var(--text-3)", fontSize:"12.5px" }}>Separe resultados, banca e limites de risco por conta (real, simulador, mesa).</p>
        </div>
        <button onClick={() => setEditando(null)} style={{ background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 26.7%, transparent)", borderRadius:"8px", padding:"8px 14px", color:"var(--accent)", fontSize:"12px", fontWeight:"700", cursor:"pointer", fontFamily:"var(--font-sans)" }}>+ Nova conta</button>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
        {contas.map(c => {
          const t = TIPOS_CONTA[c.tipo] || TIPOS_CONTA.real;
          const principal = c.id === ID_PRINCIPAL;
          const lim = limitesDaConta(config, c.id);
          const m = MERCADOS[c.mercado];
          const n = ops[c.id] || 0;
          return (
            <div key={c.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", alignItems:"center", gap:"14px", padding:"14px 16px", borderRadius:"12px", background:"color-mix(in srgb, var(--ink) 2%, transparent)", border:"1px solid "+(c.padrao ? alfa(t.cor,"33") : "var(--line)") }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", minWidth:0 }}>
                <span style={{ width:"10px", height:"10px", borderRadius:"50%", background:t.cor, boxShadow:"0 0 8px "+t.cor, flexShrink:0 }}/>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, color:"var(--text)", fontSize:"14px", fontWeight:"700", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {c.nome}
                    {c.padrao && <span style={{ marginLeft:"8px", fontSize:"10px", fontWeight:"800", letterSpacing:"0.8px", color:t.cor, border:"1px solid "+alfa(t.cor,"44"), background:alfa(t.cor,"12"), borderRadius:"20px", padding:"1px 7px", verticalAlign:"middle" }}>PADRÃO</span>}
                  </p>
                  <p style={{ margin:"3px 0 0", color:"var(--text-3)", fontSize:"12px", fontFamily:"var(--font-mono)" }}>
                    {t.label} · {principal ? "bancas por mercado" : (m?.curto || c.mercado)+" · inicial "+(m?.moeda||"R$")+" "+Number(c.bancaInicial||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}
                    {" · risco "+lim.risco+"% · stop "+lim.stop+"% · "+n+" op"+(n===1?"":"s")}
                  </p>
                </div>
              </div>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", justifyContent:"flex-end" }}>
                {!c.padrao && <button style={btn} onClick={() => tornarPadrao(c.id)}>Tornar padrão</button>}
                <button style={btn} onClick={() => setEditando(c)}>Editar</button>
                {!principal && (
                  <button style={{ ...btn, color: n ? "var(--text-3)" : "var(--neg-soft)", borderColor: n ? "var(--line)" : "color-mix(in srgb, var(--neg) 20%, transparent)", cursor: n ? "not-allowed" : "pointer", opacity: n ? 0.6 : 1 }}
                    title={n ? "Esta conta tem operações. Mova-as para outra conta no Diário antes de excluir." : "Excluir conta"}
                    onClick={() => excluir(c)}>Excluir</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editando !== undefined && (
        <ContaModal config={config} saveConfig={saveConfig} conta={editando} onClose={() => setEditando(undefined)} onSalva={() => setEditando(undefined)}/>
      )}
    </div>
  );
}
