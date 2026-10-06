import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const C = {
  card:"#12121f", card2:"#1a1a2e", line:"#1e1e2e", line2:"#17172a",
  txt:"#f0f0f0", mut:"#888", dim:"#555", faint:"#3a3a4a",
  up:"#00d4aa", down:"#ff4d4d", warn:"#f59e0b", blue:"#0099ff",
};

const DEMO = {
  WIN:{ instrumento:"WIN", justo:152345, mercado:151900, gap:-445, variacao_pct:0.571,
        nivel:1, cobertura_pct:38, checagem_ok:true, checagem_delta:-0.02,
        score_trio:1.61, origem:"local", idade_dado_seg:18,
        mapa_global:{asia:0.12, europa:0.09, eua:0.02, brasil:0.571},
        evento:"Estoques de petróleo EUA", evento_estrelas:1,
        componentes:[{symbol:"VALE",peso:11,retorno_pct:0.40},{symbol:"PBR",peso:5,retorno_pct:0.95},
                     {symbol:"ITUB",peso:7,retorno_pct:0.30}] },
  WDO:{ instrumento:"WDO", justo:5382, mercado:5391, gap:9, variacao_pct:-0.13,
        nivel:1, cobertura_pct:100, checagem_ok:true, origem:"local", idade_dado_seg:18 },
};

const fmt = (n,d=0)=> n==null ? "—" :
  Number(n).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const sinal = (n,d=2)=> n==null ? "—" : (n>=0?"+":"−")+fmt(Math.abs(n),d);

function Selo({ tipo }) {
  const m = { live:[C.up,"live"], del:[C.warn,"15m"], fech:[C.dim,"fech"], sem:[C.dim,"s/ dado"] };
  const [cor,txt] = m[tipo] || m.live;
  return <span style={{display:"inline-block",fontFamily:"monospace",fontSize:"9.5px",
    letterSpacing:"0.5px",padding:"1px 5px",borderRadius:"3px",
    border:"1px solid "+cor+"55",color:cor,whiteSpace:"nowrap"}}>{txt}</span>;
}

function Card({ d, nome, desc, casas, selo, checagem, temCesta, origemDetalhe }) {
  const preAbertura = d.mercado == null || d.gap == null;
  const suspeito = d.checagem_ok === false;
  const abaixo = d.gap != null && d.gap < 0;
  const cor = suspeito ? C.dim : preAbertura ? (d.variacao_pct>=0?C.up:C.down) : (abaixo?C.up:C.down);
  const heroNum = preAbertura ? sinal(d.variacao_pct,2)+"%" : sinal(d.gap, casas);
  const heroUnid = preAbertura ? "" : "pts";
  const posicao = preAbertura ? "Abertura implícita"
    : abaixo ? "Abaixo do justo" : "Acima do justo";
  const chip = suspeito ? "verificar"
    : preAbertura ? (d.variacao_pct>=0?"↑ viés de alta":"↓ viés de baixa")
    : (abaixo ? "↑ viés de alta" : "↓ viés de baixa");
  const origemTxt = { local:"Brasil específico", global:"Puxado pelo global" }[d.origem] || "Indeterminado";
  const origemCor = d.origem==="local" ? C.up : C.mut;
  const semChecagem = d.checagem_ok==null || d.checagem_delta==null;

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:"14px",padding:"18px 20px 16px"}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:"8px"}}>
        <span style={{fontSize:"14px",fontWeight:"800",letterSpacing:"2px",color:C.txt}}>{nome}</span>
        <span style={{fontSize:"11px",color:C.faint,display:"flex",alignItems:"center",gap:"7px"}}>
          <Selo tipo={selo}/> {desc}
        </span>
      </div>

      <div style={{marginTop:"14px",display:"flex",flexDirection:"column",gap:"7px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <span style={{fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:C.mut}}>Justo</span>
          <span style={{fontFamily:"monospace",fontSize:"15px",color:C.txt}}>{fmt(d.justo,casas)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
          <span style={{fontSize:"11px",letterSpacing:"1px",textTransform:"uppercase",color:C.mut}}>Mercado</span>
          <span style={{fontFamily:"monospace",fontSize:"15px",color:d.mercado==null?C.faint:C.txt}}>
            {d.mercado==null ? "B3 fechada" : fmt(d.mercado,casas)}
          </span>
        </div>
      </div>

      <div style={{height:"1px",background:C.line2,margin:"14px 0 12px"}}/>

      <div style={{display:"flex",alignItems:"baseline",gap:"9px",flexWrap:"wrap"}}>
        <span style={{fontFamily:"monospace",fontWeight:"800",fontSize:"38px",lineHeight:1,
          letterSpacing:"-1.5px",color:cor}}>{heroNum}</span>
        {heroUnid && <span style={{fontFamily:"monospace",fontSize:"14px",color:C.mut}}>{heroUnid}</span>}
      </div>
      <div style={{marginTop:"9px",display:"flex",alignItems:"center",gap:"9px",flexWrap:"wrap"}}>
        <span style={{fontSize:"10.5px",letterSpacing:"1.2px",textTransform:"uppercase",color:C.mut}}>{posicao}</span>
        <span style={{fontSize:"11px",fontWeight:"700",padding:"3px 10px",borderRadius:"20px",
          border:"1px solid "+(suspeito?C.warn:cor)+"66",color:suspeito?C.warn:cor}}>{chip}</span>
      </div>

      <div style={{marginTop:"14px",paddingTop:"12px",borderTop:"1px solid "+C.line2,
        display:"flex",flexDirection:"column",gap:"4px"}}>
        <span style={{fontSize:"10px",letterSpacing:"1.3px",textTransform:"uppercase",color:C.faint}}>Origem do movimento</span>
        <span style={{fontSize:"14px",fontWeight:"700",color:origemDetalhe==null?C.mut:origemCor}}>
          {origemDetalhe==null ? "Sem dado" : origemTxt}
        </span>
        <span style={{fontFamily:"monospace",fontSize:"11.5px",color:C.mut}}>
          {origemDetalhe==null ? "sem leitura de mapa global" : origemDetalhe}
        </span>
      </div>

      <div style={{marginTop:"13px",paddingTop:"11px",borderTop:"1px solid "+C.line2,
        display:"flex",flexDirection:"column",gap:"5px"}}>
        {temCesta && <Linha k="Cobertura da cesta" v={d.cobertura_pct!=null?fmt(d.cobertura_pct,0)+"%":"—"}/>}
        <Linha k="Nível do sinal" v={"nível "+(d.nivel??"—")}/>
        <Linha k={"Checagem "+checagem}
          v={semChecagem ? "sem dado" : (d.checagem_ok?"✓ ":"⚠ ")+sinal(d.checagem_delta,2)+" p.p."}
          cor={semChecagem?C.mut:d.checagem_ok===false?C.warn:C.up}/>
      </div>
    </div>
  );
}

function Linha({ k, v, cor }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",gap:"10px",fontSize:"11.5px",color:C.mut}}>
      <span>{k}</span>
      <span style={{fontFamily:"monospace",color:cor||C.txt}}>{v}</span>
    </div>
  );
}

function MapaGlobal({ mg }) {
  const cells = [
    ["Ásia","asia","fech"], ["Europa","europa","del"],
    ["EUA","eua","del"],    ["Brasil","brasil","live"],
  ];
  const vals = cells.map(c=>mg[c[1]]).filter(v=>v!=null);
  const todosUp   = vals.length>0 && vals.every(v=>v>=0);
  const todosDown = vals.length>0 && vals.every(v=>v<0);
  const alinhado  = todosUp || todosDown;
  const br = mg.brasil, resto = vals.length>1
    ? (cells.slice(0,3).map(c=>mg[c[1]]).filter(v=>v!=null).reduce((a,b)=>a+b,0) /
       Math.max(1,cells.slice(0,3).filter(c=>mg[c[1]]!=null).length))
    : null;
  const mesmoLado = br!=null && resto!=null && ((br>=0)===(resto>=0));
  const dif = (br!=null && resto!=null) ? br-resto : null;
  let nota = "";
  if (dif==null) nota = "";
  else if (Math.abs(dif) <= 0.25) nota = " · Brasil em linha";
  else if (!mesmoLado) nota = " · Brasil destoando";
  else if (Math.abs(br) > Math.abs(resto)) nota = " · Brasil liderando";
  else nota = " · Brasil atrasado";
  const veredito = !alinhado ? "Mundo brigando" + nota
    : (todosUp?"Mundo alinhado ↑":"Mundo alinhado ↓") + nota;
  const vcor = !alinhado ? C.warn : todosUp ? C.up : C.down;

  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:"14px",padding:"16px 20px"}}>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"baseline",justifyContent:"space-between",gap:"8px"}}>
        <h3 style={{margin:0,fontSize:"12px",fontWeight:"800",letterSpacing:"1.6px",
          textTransform:"uppercase",color:C.txt}}>Mapa global</h3>
        <span style={{fontSize:"12px",fontWeight:"800",letterSpacing:"0.8px",
          textTransform:"uppercase",color:vcor}}>{veredito}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",
        gap:"10px",marginTop:"13px"}}>
        {cells.map(([lbl,key,selo])=>{
          const v = mg[key];
          const me = key==="brasil";
          return (
            <div key={key} style={{border:"1px solid "+(me?C.up+"55":C.line2),borderRadius:"10px",
              padding:"10px 12px",display:"flex",flexDirection:"column",gap:"5px"}}>
              <span style={{fontSize:"10px",letterSpacing:"1.2px",textTransform:"uppercase",
                color:me?C.up:C.faint}}>{lbl}</span>
              <span style={{fontFamily:"monospace",fontSize:"17px",fontWeight:"700",
                color:v==null?C.faint:v>=0?C.up:C.down}}>{v==null?"s/d":sinal(v,2)+"%"}</span>
              <span><Selo tipo={v==null?"sem":selo}/></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Trio({ score, suspenso }) {
  const cor = suspenso ? C.dim : score>=0 ? C.up : C.down;
  return (
    <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:"14px",padding:"16px 20px"}}>
      <div style={{display:"flex",flexWrap:"wrap",alignItems:"baseline",justifyContent:"space-between",gap:"8px"}}>
        <h3 style={{margin:0,fontSize:"12px",fontWeight:"800",letterSpacing:"1.6px",
          textTransform:"uppercase",color:C.txt}}>Score do trio</h3>
        <span style={{fontSize:"10px",letterSpacing:"1px",textTransform:"uppercase",color:C.warn,
          border:"1px solid "+C.warn+"55",borderRadius:"20px",padding:"3px 10px"}}>Em medição</span>
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:"12px",marginTop:"13px",flexWrap:"wrap"}}>
        <span style={{fontFamily:"monospace",fontSize:"26px",fontWeight:"800",
          letterSpacing:"-1px",color:cor}}>{sinal(score,2)}</span>
        <span style={{fontSize:"11px",fontWeight:"700",padding:"3px 10px",borderRadius:"20px",
          border:"1px solid "+cor+"66",color:cor}}>
          {suspenso ? "suspenso · evento ★★★" : score>=0 ? "viés de alta" : "viés de baixa"}
        </span>
        <span style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <Selo tipo="del"/><span style={{fontSize:"11px",color:C.faint}}>VIX · CL · minério</span>
        </span>
      </div>
      <p style={{margin:"10px 0 0",fontSize:"12.5px",lineHeight:1.5,color:C.mut}}>
        Soma crua, sua convenção: VIX invertido, petróleo e minério a favor do índice.
        Fica isolado do preço justo até a medição dos 60 pregões decidir se entra na leitura principal.
      </p>
    </div>
  );
}

export default function Macro() {
  const [win, setWin] = useState(null);
  const [wdo, setWdo] = useState(null);
  const [demo, setDemo] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const { data } = await supabase
        .from("macro_leitura").select("*")
        .order("calculado_em", { ascending:false }).limit(20);
      const ultWin = (data||[]).find(r=>r.instrumento==="WIN");
      const ultWdo = (data||[]).find(r=>r.instrumento==="WDO");
      if (ultWin) { setWin(ultWin); setWdo(ultWdo||DEMO.WDO); setDemo(false); }
      else { setWin(DEMO.WIN); setWdo(DEMO.WDO); setDemo(true); }
    } catch {
      setWin(DEMO.WIN); setWdo(DEMO.WDO); setDemo(true);
    }
    setCarregando(false);
  }

  useEffect(()=>{
    carregar();
    const ch = supabase.channel("macro-leitura")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"macro_leitura"},carregar)
      .subscribe();
    const t = setInterval(carregar, 60000);
    return ()=>{ supabase.removeChannel(ch); clearInterval(t); };
  },[]);

  if (carregando || !win) return <p style={{color:C.dim,fontSize:"14px"}}>Carregando leitura…</p>;

  const estrelas = win.evento_estrelas || 0;
  const trioSuspenso = estrelas >= 3;
  const suspeito = win.checagem_ok === false;
  const preAbertura = win.mercado == null;
  const abaixo = win.gap != null && win.gap < 0;

  let vTitulo, vTexto, vCor;
  if (suspeito) {
    vCor = C.warn; vTitulo = "Dado suspeito — checagem falhou";
    vTexto = "A cesta e o EWZ discordam além do limite. Provável cotação travada ou negócio solto em papel ilíquido. Leitura não confiável.";
  } else if (win.nivel === 3) {
    vCor = C.dim; vTitulo = "Sinal fraco — nível 3";
    vTexto = "ADRs sem negócio no pre-market. Restou estimativa indireta. Trate como ausência de informação, não como leitura.";
  } else if (preAbertura) {
    vCor = win.variacao_pct>=0 ? C.up : C.down;
    vTitulo = win.variacao_pct>=0 ? "Abertura implícita de alta" : "Abertura implícita de baixa";
    vTexto = "B3 ainda fechada. O número é onde o índice deveria abrir segundo as ADRs já negociadas lá fora.";
  } else {
    vCor = abaixo ? C.up : C.down;
    vTitulo = abaixo ? "Viés de alta" : "Viés de baixa";
    vTexto = abaixo
      ? "Mercado abaixo do preço justo. Arbitragem tende a empurrar para cima enquanto o desconto existir."
      : "Mercado acima do preço justo. Arbitragem tende a empurrar para baixo enquanto o prêmio existir.";
  }
  if (trioSuspenso) vTexto += " Evento de alto impacto hoje: a leitura tem prazo de validade.";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>

      {demo && (
        <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",
          borderRadius:"10px",padding:"11px 16px",display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"14px"}}>⚠️</span>
          <p style={{margin:0,color:C.warn,fontSize:"13px",fontWeight:"600"}}>
            Dados de exemplo — a coleta ainda não gravou nenhuma leitura. Assim que a Fase 1 rodar, esta tela troca sozinha.
          </p>
        </div>
      )}

      <div style={{background:C.card,border:"1px solid "+C.line,borderLeft:"3px solid "+vCor,
        borderRadius:"10px",padding:"14px 18px",display:"flex",gap:"13px",alignItems:"center"}}>
        <span style={{width:"8px",height:"8px",borderRadius:"50%",background:vCor,flexShrink:0}}/>
        <div>
          <p style={{margin:0,fontSize:"13px",fontWeight:"800",letterSpacing:"1.2px",
            textTransform:"uppercase",color:vCor}}>{vTitulo}</p>
          <p style={{margin:"4px 0 0",fontSize:"12.5px",lineHeight:1.45,color:C.mut}}>{vTexto}</p>
        </div>
      </div>

      {win.evento && (
        <div style={{background:C.card,border:"1px solid "+C.line,borderRadius:"10px",
          padding:"11px 16px",display:"flex",flexWrap:"wrap",alignItems:"baseline",gap:"6px 14px"}}>
          <span style={{fontSize:"13px",letterSpacing:"2px",
            color:estrelas>=2?C.warn:C.faint}}>{"★".repeat(estrelas)+"☆".repeat(3-estrelas)}</span>
          <span style={{fontSize:"13px",fontWeight:"700",color:C.txt}}>{win.evento}</span>
          <span style={{flexBasis:"100%",fontSize:"11.5px",color:C.mut}}>
            {estrelas>=3 ? "Leitura com prazo de validade · amplitude ampliada · score do trio suspenso."
             : estrelas===2 ? "Impacto médio · amplitude ampliada."
             : "Impacto baixo. Nada muda na leitura."}
          </span>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:"14px"}}>
        <Card d={win} nome="WIN" desc="mini índice" casas={0} checagem="EWZ" temCesta={true}
              origemDetalhe={win.mapa_global?.brasil!=null ? `Brasil ${sinal(win.mapa_global.brasil,2)}%  ·  EUA ${sinal(win.mapa_global.eua,2)}%` : null}
              selo={win.nivel===3?"sem":win.idade_dado_seg>900?"del":"live"}/>
        <Card d={wdo||DEMO.WDO} nome="WDO" desc="mini dólar" casas={1} checagem="USD/MXN" temCesta={false}
              origemDetalhe={null}
              selo={(wdo?.idade_dado_seg??0)>900?"del":"live"}/>
      </div>

      <MapaGlobal mg={win.mapa_global || {}}/>
      <Trio score={win.score_trio} suspenso={trioSuspenso}/>

      <div style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",alignItems:"center",
        fontSize:"11px",color:C.faint,paddingTop:"4px"}}>
        <span style={{display:"flex",gap:"6px",alignItems:"center"}}><Selo tipo="live"/> tempo real</span>
        <span style={{display:"flex",gap:"6px",alignItems:"center"}}><Selo tipo="del"/> atrasado 15 min</span>
        <span style={{display:"flex",gap:"6px",alignItems:"center"}}><Selo tipo="fech"/> fechado — número definitivo</span>
      </div>

      <p style={{margin:0,fontSize:"11.5px",lineHeight:1.5,color:C.faint,
        borderTop:"1px solid "+C.line2,paddingTop:"12px"}}>
        Este painel não dá entrada. Ele modula tamanho e convicção do trade que o seu operacional
        já escolheu, e nunca cancela stop.
      </p>
    </div>
  );
}
