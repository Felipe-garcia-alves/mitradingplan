export default function Parciais({ config }) {
  const bancaB3    = config?.bancaB3    || 3000;
  const bancaForex = config?.bancaForex || 200;
  const precisaFx  = bancaForex >= 500;

  const guide = [
    {
      mercado:"Mini Indice (B3)", icon:"🇧🇷", banca:"R$ "+bancaB3.toLocaleString("pt-BR",{minimumFractionDigits:2}),
      cor:"#00d4aa",
      regra:"NAO faca parcial em alvos pequenos",
      quando:"Apenas se o mercado andar 2x o stop (R$ "+(bancaB3*0.02).toFixed(2)+") a seu favor",
      como:"Feche 50% na regiao de 2R. Mova stop para breakeven. Deixe o restante correr.",
    },
    {
      mercado:"Forex", icon:"🌍", banca:"$ "+bancaForex.toLocaleString("pt-BR",{minimumFractionDigits:2}),
      cor:"#f59e0b",
      regra: precisaFx ? "Banca acima de $500 — parciais liberadas" : "Com banca abaixo de $500, evite parciais",
      quando: precisaFx ? "Feche parcial quando andar 2x o stop ($ "+(bancaForex*0.02).toFixed(2)+") a seu favor" : "Parcial fratura o lote minimo e aumenta custo relativo",
      como: precisaFx ? "Feche 50% em 2R. Mova stop para breakeven. Deixe correr." : "Leve 100% ao alvo. Revise essa regra quando a banca atingir $500.",
    },
  ];

  return (
    <div style={{ fontFamily:"Inter,sans-serif" }}>
      <div style={{ marginBottom:"24px" }}>
        <h1 style={{ margin:"0 0 4px", fontSize:"22px", fontWeight:"800", color:"#f0f0f0", letterSpacing:"-0.5px" }}>Gerenciamento de Parciais</h1>
        <p style={{ margin:0, color:"#555", fontSize:"13px" }}>Regras ajustadas para sua banca real atual</p>
      </div>

      {guide.map((g,i)=>(
        <div key={i} style={{ border:"1px solid "+g.cor+"33", borderRadius:"14px", padding:"22px", marginBottom:"16px", background:"linear-gradient(135deg,"+g.cor+"06,transparent)", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"3px", bottom:0, background:g.cor }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"20px" }}>{g.icon}</span>
              <h3 style={{ margin:0, fontSize:"16px", color:"#f0f0f0", fontWeight:"700" }}>{g.mercado}</h3>
            </div>
            <span style={{ color:g.cor, fontSize:"13px", fontFamily:"JetBrains Mono,monospace", fontWeight:"700" }}>{g.banca}</span>
          </div>
          {[["REGRA",g.regra],["QUANDO",g.quando],["COMO",g.como]].map(([lbl,txt])=>(
            <div key={lbl} style={{ display:"flex", gap:"14px", marginBottom:"10px" }}>
              <span style={{ color:g.cor, fontSize:"11px", fontWeight:"700", minWidth:"70px", paddingTop:"2px", textTransform:"uppercase", letterSpacing:"1px" }}>{lbl}</span>
              <span style={{ color:"#bbb", fontSize:"13px", lineHeight:"1.6" }}>{txt}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ padding:"18px 22px", borderRadius:"12px", background:"rgba(0,153,255,0.05)", border:"1px solid rgba(0,153,255,0.15)" }}>
        <p style={{ margin:"0 0 8px", color:"#0099ff", fontWeight:"700", fontSize:"14px" }}>💡 A verdade sobre parciais</p>
        <p style={{ margin:0, color:"#888", fontSize:"13px", lineHeight:"1.6" }}>Parciais reduzem o risco <strong style={{ color:"#ccc" }}>e tambem o lucro</strong>. Defina uma regra e siga — nao decida na hora da emocao. Consistencia bate otimizacao.</p>
      </div>
    </div>
  );
}
