// Mi Trading Plan - criar/editar conta de trading (nome, tipo, mercado, banca, limites)
import { useState } from "react";
import { Modal } from "./ui";
import { listaContas, salvarContas, TIPOS_CONTA, LIMITES_PADRAO, ID_PRINCIPAL } from "../lib/contas";
import { MERCADOS } from "../lib/banca";

const rotulo = { margin:"0 0 8px", color:"var(--text-3)", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"1.3px" };
const inp = { width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid var(--line-strong)", borderRadius:"10px", padding:"11px 13px", color:"#f0f0f0", fontSize:"14px", outline:"none", boxSizing:"border-box", fontFamily:"var(--font-sans)" };

export function Check({ marcado }) {
  return (
    <span style={{ width:"16px", height:"16px", borderRadius:"5px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
      border:"1.5px solid "+(marcado?"var(--accent)":"var(--line-strong)"), background:marcado?"var(--accent)":"transparent", transition:"all .15s" }}>
      {marcado && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#04110b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
    </span>
  );
}

// conta = null → nova conta
export default function ContaModal({ config, saveConfig, conta, onClose, onSalva }) {
  const principal = conta?.id === ID_PRINCIPAL;
  const lim0 = principal ? { ...LIMITES_PADRAO, ...(config?.limites || {}) } : { ...LIMITES_PADRAO, ...(conta?.limites || {}) };
  const [f, setF] = useState({
    nome: conta?.nome || "",
    tipo: conta?.tipo || "real",
    mercado: conta?.mercado || "B3",
    banca: conta?.bancaInicial != null ? String(conta.bancaInicial) : "",
    risco: String(lim0.risco), meta: String(lim0.meta), stop: String(lim0.stop),
    padrao: !!conta?.padrao,
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const num = v => parseFloat(String(v).replace(",", "."));

  async function salvar() {
    const nome = f.nome.trim();
    const atuais = listaContas(config);
    if (!nome) { setErro("Dê um nome para a conta."); return; }
    if (atuais.some(c => c.id !== conta?.id && c.nome.toLowerCase() === nome.toLowerCase())) { setErro("Já existe uma conta com esse nome."); return; }
    const limites = { risco:num(f.risco), meta:num(f.meta), stop:num(f.stop) };
    if (Object.values(limites).some(v => isNaN(v) || v <= 0 || v > 100)) { setErro("Os limites precisam ser porcentagens entre 0 e 100."); return; }
    const banca = num(f.banca);
    if (!principal && (isNaN(banca) || banca < 0)) { setErro("Informe a banca inicial da conta."); return; }

    const id = conta?.id || crypto.randomUUID();
    const dados = principal
      ? { id, nome, tipo:f.tipo, padrao:f.padrao }
      : { id, nome, tipo:f.tipo, padrao:f.padrao, mercado:f.mercado, bancaInicial:banca, limites };
    let lista = conta ? atuais.map(c => c.id === id ? { ...c, ...dados } : c) : [...atuais, dados];
    if (f.padrao) lista = lista.map(c => ({ ...c, padrao: c.id === id }));

    let novo = salvarContas(config, lista);
    if (principal) novo = { ...novo, limites };
    setSalvando(true);
    await saveConfig(novo);
    setSalvando(false);
    onSalva?.(id);
  }

  return (
    <Modal onClose={onClose} width={500}>
      <div style={{ padding:"24px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>
        <div>
          <p style={{ margin:0, color:"var(--text)", fontSize:"18px", fontWeight:"800" }}>{conta ? "Editar conta" : "Nova conta"}</p>
          <p style={{ margin:"4px 0 0", color:"var(--text-3)", fontSize:"12.5px" }}>
            {principal ? "As bancas por mercado da Conta Principal ficam na página Banca." : "Cada conta tem banca, saques e limites de risco próprios."}
          </p>
        </div>

        <div>
          <p style={rotulo}>Nome</p>
          <input style={inp} value={f.nome} autoFocus={!conta} onChange={e => set("nome", e.target.value)} placeholder="Ex: Mesa FTMO, Conta XP"/>
        </div>

        <div>
          <p style={rotulo}>Tipo</p>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {Object.entries(TIPOS_CONTA).map(([k, t]) => (
              <button key={k} onClick={() => set("tipo", k)} className={"mtp-pill"+(f.tipo === k ? " active" : "")} style={{ "--pill": t.cor }}>{t.label}</button>
            ))}
          </div>
        </div>

        {!principal && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div>
              <p style={rotulo}>Mercado</p>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {Object.entries(MERCADOS).map(([k, m]) => (
                  <button key={k} onClick={() => set("mercado", k)} className={"mtp-pill"+(f.mercado === k ? " active" : "")} style={{ "--pill": m.cor, padding:"5px 11px", fontSize:"12px" }}>{m.curto}</button>
                ))}
              </div>
            </div>
            <div>
              <p style={rotulo}>Banca inicial ({MERCADOS[f.mercado].moeda})</p>
              <input style={{ ...inp, fontFamily:"var(--font-mono)" }} type="number" min="0" step="0.01" value={f.banca} onChange={e => set("banca", e.target.value)} placeholder="0,00"/>
            </div>
          </div>
        )}

        <div>
          <p style={rotulo}>Limites diários (% da banca)</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
            {[["risco","Risco / op","#2ee6a0"],["meta","Meta","#2ee6a0"],["stop","Stop","#ff5470"]].map(([k, l, c]) => (
              <div key={k} style={{ position:"relative" }}>
                <input style={{ ...inp, fontFamily:"var(--font-mono)", paddingTop:"22px", paddingBottom:"8px", paddingRight:"30px" }} type="number" min="0.1" step="0.1" value={f[k]} onChange={e => set(k, e.target.value)}/>
                <span style={{ position:"absolute", left:"13px", top:"7px", fontSize:"10px", fontWeight:"700", color:c, letterSpacing:"0.6px", textTransform:"uppercase" }}>{l}</span>
                <span style={{ position:"absolute", right:"12px", bottom:"10px", color:"var(--text-3)", fontSize:"13px" }}>%</span>
              </div>
            ))}
          </div>
          <p style={{ margin:"8px 0 0", color:"var(--text-3)", fontSize:"11.5px" }}>Mesas proprietárias costumam ter stop diário menor — ajuste conforme as regras da sua mesa.</p>
        </div>

        <div onClick={() => set("padrao", !f.padrao)} style={{ display:"flex", alignItems:"center", gap:"10px", cursor:"pointer", userSelect:"none" }}>
          <Check marcado={f.padrao}/>
          <span style={{ color:"var(--text-2)", fontSize:"13px" }}>Conta padrão ao registrar no Diário</span>
        </div>

        {erro && <p style={{ margin:0, color:"#ff7a90", fontSize:"12.5px" }}>{erro}</p>}
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={salvar} disabled={salvando} style={{ flex:1, background:"linear-gradient(135deg,#2ee6a0,#1fc98a)", color:"#000", border:"none", borderRadius:"10px", padding:"12px", fontWeight:"800", fontSize:"13px", cursor:"pointer" }}>{salvando ? "Salvando..." : conta ? "Salvar alterações" : "Criar conta"}</button>
          <button onClick={onClose} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"12px 16px", fontSize:"13px", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}
