import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

/* Viés da Abertura — WIN e WDO, leitura dos 15 primeiros minutos (09:00 → 09:15).
   O cálculo e a classificação aqui são idênticos aos da Edge Function coleta-macro:
   soma com sinal, arredondamento em 1 casa, e só então a classificação. Se mudar um lado,
   mude o outro — a tela e o log têm de contar a mesma história. */

const FAIXAS = [
  { de: -6,   ate: -4.5, t: "Forte",    c: "#ff5470" },
  { de: -4.5, ate: -2.5, t: "Moderada", c: "#d2706b" },
  { de: -2.5, ate: -1.5, t: "Fraca",    c: "#b08268" },
  { de: -1.5, ate:  1.5, t: "Lateral",  c: "#f5b941" },
  { de:  1.5, ate:  2.5, t: "Fraca",    c: "#6aae95" },
  { de:  2.5, ate:  4.5, t: "Moderada", c: "#48bd9c" },
  { de:  4.5, ate:  6,   t: "Forte",    c: "#2ee6a0" },
];
const MIN = -6, MAX = 6;
const CORES = { positiva: "#2ee6a0", negativa: "#ff5470", lateral: "#f5b941" };
/* Bandeira em SVG, não emoji: o Windows não traz os glifos de bandeira e renderiza
   o par de letras no lugar do desenho ("BR" vira o texto BR). */
function Bandeira({ pais }) {
  const p = (pais || "BR").toUpperCase();
  const box = { width: 15, height: 11, viewBox: "0 0 28 20", "aria-hidden": true,
                style: { borderRadius: 2, display: "block", flex: "none" } };
  if (p === "BR") return (
    <svg {...box}>
      <rect width="28" height="20" fill="#009b3a" />
      <path d="M14 2.6 25.4 10 14 17.4 2.6 10z" fill="#fedf00" />
      <circle cx="14" cy="10" r="4.1" fill="#002776" />
    </svg>
  );
  if (p === "US") return (
    <svg {...box}>
      <rect width="28" height="20" fill="#b22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => (
        <rect key={i} y={i * 20 / 13} width="28" height={20 / 13} fill="#fff" />
      ))}
      <rect width="11.2" height={7 * 20 / 13} fill="#3c3b6e" />
    </svg>
  );
  return <svg {...box}><rect width="28" height="20" fill="#2a2a3d" /></svg>;
}

/* Contexto ao vivo: os mesmos ativos, cotação do momento, para o resto do dia.
   Números crus de propósito — sem régua, sem direção, sem soma. A equação foi validada
   para 09:00–09:15 e só para isso; classificar uma leitura das 14h daria a ela uma
   confiança que ninguém mediu. */
const CTX_ATIVOS = [
  ["^VIX", "VIX", "índice do medo"],
  ["CL=F", "CL1!", "petróleo WTI"],
  ["ES=F", "ES=F", "S&P 500 futuro"],
  ["NQ=F", "NQ=F", "Nasdaq futuro"],
  ["DX-Y.NYB", "DXY", "dólar index"],
  ["EWZ", "EWZ", "ETF Brasil"],
  ["BRL=X", "USD/BRL", "câmbio à vista"],
];

const n1 = (x) => x.toFixed(1).replace(".", ",");
const n2 = (x) => x.toFixed(2).replace(".", ",");
const sg = (x, f = n2) => (x > 0 ? "+" : x < 0 ? "−" : "") + f(Math.abs(x));
const hojeBRT = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const horaBRT = (iso) => iso
  ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
  : "—";

/* A mesma janela da Edge Function: das 09:00 em diante o viés do dia está congelado.
   Um FEF2! digitado às 09h02 não é o que estava na tela às 08h55, e um log que aceita
   correção retroativa não serve para medir nada depois. */
const minutosBRT = () => {
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  return brt.getUTCHours() * 60 + brt.getUTCMinutes();
};
/* Nada trava: o FEF2! aceita digitação a qualquer hora e os números nunca param.
   A janela da abertura serve só para decidir se a frase de ação faz sentido — às 15h
   "busca regiões compradoras abaixo da abertura" seria instrução falsa, porque não há abertura. */
const naJanela = () => minutosBRT() < 9 * 60 + 20;

/* Frescor pela idade da cotação, não por etiqueta fixa: a mesma fonte entrega ao vivo,
   atrasada ou fechada conforme a hora. "fech" não é defeito — é número definitivo. */
function frescor(em) {
  if (!em) return "sem";
  const min = (Date.now() - new Date(em).getTime()) / 60000;
  if (min <= 3) return "live";
  if (min <= 40) return "del";
  return "fech";
}

function classificar(resultado) {
  const m = Math.abs(resultado);
  if (m < 1.5) return { direcao: "lateral", intensidade: "Lateral" };
  return {
    direcao: resultado > 0 ? "positiva" : "negativa",
    intensidade: m < 2.5 ? "Fraca" : m < 4.5 ? "Moderada" : "Forte",
  };
}

function fechar(pernas) {
  const resultado = Math.round(pernas.reduce((t, p) => t + (p.contribuicao ?? 0), 0) * 10) / 10;
  return {
    pernas, resultado, ...classificar(resultado),
    completo: pernas.every((p) => !p.ausente && !p.parado),
    faltando: pernas.filter((p) => p.ausente).map((p) => p.rotulo),
    parados: pernas.filter((p) => p.parado).map((p) => p.rotulo),
  };
}

function calcular(vies, fef2) {
  if (!vies) return null;
  const pernas = (vies.pernas || []).map((p) => {
    if (p.entrada !== "manual") return p;
    const pct = fef2 === "" || fef2 == null || Number.isNaN(Number(fef2)) ? null : Number(fef2);
    return { ...p, pct, contribuicao: pct == null ? null : Number((p.sinal * pct).toFixed(2)), ausente: pct == null };
  });
  return fechar(pernas);
}

const ACAO = {
  positiva: (f) => <>Intenção de <b>compra</b> com força {f}. Busca regiões compradoras <b>abaixo da abertura</b>.</>,
  negativa: (f) => <>Intenção de <b>venda</b> com força {f}. Busca regiões vendedoras <b>acima da abertura</b>.</>,
  lateral: () => <>Sem intenção definida. <b>Opera as extremidades</b>, com as travas dos dois lados. Alvos curtos.</>,
};

const CSS = `
.mx{--surf:#0e1713;--surf2:#111c17;--line:#1f2d27;--line2:#18241f;--txt:#eef4f1;--mut:#a9b8b1;
  --dim:#82948c;--faint:#62746c;--up:#2ee6a0;--down:#ff5470;--flat:#f5b941;--blue:#5aa9f0;--roxo:#7fd8ff;
  --mono:var(--font-mono);
  --ui:var(--font-sans);
  max-width:1080px;margin:0 auto;font-family:var(--ui);display:flex;flex-direction:column;gap:16px;
  color:var(--txt);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.mx *{box-sizing:border-box}
.mx .lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--faint);font-weight:600}
.mx .topo h1{margin:0;font-size:28px;font-weight:800;letter-spacing:-.8px}
.mx .topo p{margin:3px 0 0;font-size:13px;color:var(--dim)}
.mx .status{display:inline-block;margin-top:10px;font-family:var(--mono);font-size:10px;letter-spacing:.8px;
  padding:3px 9px;border-radius:6px;border:1px solid}
.mx .status.on{color:var(--roxo);border-color:color-mix(in srgb,var(--roxo) 38%,transparent);
  background:color-mix(in srgb,var(--roxo) 9%,transparent)}
.mx .status.off{color:var(--faint);border-color:var(--line)}
.mx .card{position:relative;border:1px solid var(--line);border-radius:16px;padding:24px 26px;
  background:linear-gradient(180deg,rgba(46,230,160,0.035) 0%,rgba(46,230,160,0) 40%),linear-gradient(160deg,#0f1814 0%,#0a110e 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),0 1px 2px rgba(0,0,0,0.4),0 12px 32px -12px rgba(0,0,0,0.6);
  transition:box-shadow .35s cubic-bezier(.2,.8,.2,1),border-color .35s cubic-bezier(.2,.8,.2,1)}
.mx .card:hover{border-color:var(--line-strong);
  box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 0 0 1px rgba(46,230,160,0.08),0 18px 40px -14px rgba(0,0,0,0.75),0 0 40px -14px rgba(46,230,160,0.16)}
.mx .card>h2{margin:0 0 18px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:var(--faint)}
@media(max-width:520px){.mx .card{padding:20px 16px}}
.mx .cal-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.mx .cal-frase{margin:0;font-size:18px;font-weight:500;line-height:1.4;letter-spacing:-.2px;min-width:0}
.mx .modo{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;padding:5px 11px;border-radius:7px;
  white-space:nowrap;flex:none;border:1px solid color-mix(in srgb,var(--mc) 32%,transparent);
  color:var(--mc);background:color-mix(in srgb,var(--mc) 8%,transparent)}
.mx .agenda{margin-top:14px;display:flex;flex-direction:column;gap:7px}
.mx .ev{display:grid;grid-template-columns:48px 46px minmax(0,1fr) auto;gap:10px;align-items:baseline;font-size:12.5px}
.mx .ev em{font-style:normal;font-family:var(--mono);font-size:11.5px;color:var(--mut)}
.mx .ev .pais{font-family:var(--mono);font-size:9.5px;letter-spacing:.5px;color:var(--dim);
  display:flex;align-items:center;gap:5px;white-space:nowrap}
.mx .ev s{text-decoration:none;font-family:var(--mono);font-size:10.5px;letter-spacing:2px}
.mx .cal-pe{margin-top:18px;padding-top:16px;border-top:1px solid var(--line2);
  display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.mx .eq{font-family:var(--mono);font-size:12px;color:var(--mut);min-width:0;overflow-x:auto;white-space:nowrap}
.mx .eq b{color:var(--txt);font-weight:600}
.mx .btn{flex:none;padding:8px 15px;border-radius:8px;cursor:pointer;background:transparent;
  border:1px solid var(--line);color:var(--mut);font-family:var(--mono);font-size:11px;letter-spacing:.6px;transition:.15s}
.mx .btn:hover{border-color:var(--roxo);color:var(--roxo)}
.mx .outro{margin-top:16px;padding:16px;border-radius:11px;background:var(--surf2);
  display:flex;flex-direction:column;gap:12px}
.mx .outro-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.mx .outro-top b{font-family:var(--mono);font-size:22px;font-weight:300;color:var(--mut);letter-spacing:-1px}
.mx .outro-top span{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--faint)}
.mx .outro-pernas{display:flex;flex-wrap:wrap;gap:8px 18px;font-family:var(--mono);font-size:11.5px;color:var(--dim)}
.mx .calc-head{display:flex;align-items:center;gap:28px;flex-wrap:wrap}
.mx .vnum{font-family:var(--mono);font-weight:300;font-size:clamp(46px,10vw,62px);line-height:.9;
  letter-spacing:-2.5px;color:var(--cor)}
.mx .chips{display:flex;flex-direction:column;gap:7px;min-width:122px}
.mx .chip{font-size:10.5px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;padding:6px 14px;
  border-radius:7px;text-align:center;white-space:nowrap;color:var(--cor);
  border:1px solid color-mix(in srgb,var(--cor) 32%,transparent);background:color-mix(in srgb,var(--cor) 8%,transparent)}
.mx .chip.ghost{color:var(--dim);border-color:var(--line);background:transparent}
.mx .acao{margin:22px 0 0;font-size:15.5px;line-height:1.55;padding-top:20px;border-top:1px solid var(--line2);max-width:70ch}
.mx .acao b{color:var(--cor);font-weight:600}
.mx .regua-bloco{margin-top:22px}
.mx .regua-top{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1.8px;
  text-transform:uppercase;color:var(--faint);margin-bottom:8px}
.mx .regua-pin{position:relative;height:21px}
.mx .pin{position:absolute;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;
  transition:left .34s cubic-bezier(.3,.8,.4,1)}
.mx .pin i{font-style:normal;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--cor);white-space:nowrap}
.mx .pin u{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--cor)}
.mx .regua{display:flex;height:32px;border-radius:7px;overflow:hidden}
.mx .faixa{display:grid;place-items:center;font-size:9.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
  min-width:0;overflow:hidden;transition:.3s ease;background:color-mix(in srgb,var(--fc) 9%,var(--surf2));
  color:color-mix(in srgb,var(--fc) 42%,var(--faint))}
.mx .faixa.on{background:color-mix(in srgb,var(--fc) 82%,#050907);color:#050907;font-weight:700}
.mx .escala{position:relative;height:15px;margin-top:5px}
.mx .tick{position:absolute;transform:translateX(-50%);font-family:var(--mono);font-size:9.5px;color:var(--faint)}
.mx .pernas{margin-top:24px;padding-top:20px;border-top:1px solid var(--line2);
  display:flex;flex-direction:column;gap:13px}
.mx .perna{display:grid;grid-template-columns:132px minmax(0,1fr) 88px;gap:16px;align-items:center}
@media(max-width:620px){.mx .perna{grid-template-columns:104px minmax(0,1fr) 72px;gap:11px}}
.mx .pn{display:flex;flex-direction:column;min-width:0}
.mx .pn b{font-family:var(--mono);font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px}
.mx .pn span{font-size:10px;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mx .barra{position:relative;height:16px;background:var(--surf2);border-radius:4px;overflow:hidden}
.mx .barra::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)}
.mx .barra i{position:absolute;top:0;bottom:0;border-radius:3px;transition:.32s cubic-bezier(.3,.8,.4,1)}
.mx .pv{font-family:var(--mono);font-size:14px;font-weight:500;text-align:right}
.mx .pv input{width:100%;background:transparent;border:0;border-bottom:1px solid var(--blue);color:var(--blue);
  font-family:var(--mono);font-size:14px;font-weight:600;text-align:right;padding:2px 0 3px}
.mx .pv input:focus{outline:none;border-bottom-width:2px}
.mx .total{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:18px;
  padding-top:16px;border-top:1px solid var(--line2)}
.mx .total b{font-family:var(--mono);font-size:19px;font-weight:400;color:var(--cor)}
.mx .alerta{margin-top:16px;padding:12px 15px;border-radius:9px;font-size:12.5px;line-height:1.5;
  background:color-mix(in srgb,var(--down) 8%,transparent);
  border:1px solid color-mix(in srgb,var(--down) 26%,transparent);color:#f3a9a8}
.mx .alerta b{color:var(--down);font-weight:600}
.mx .aviso{padding:13px 16px;border-radius:9px;font-size:12.5px;line-height:1.5;
  background:color-mix(in srgb,var(--flat) 8%,transparent);
  border:1px solid color-mix(in srgb,var(--flat) 26%,transparent);color:#e8cf95}
.mx .ctx-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:18px}
.mx .ctx-head h2{margin:0}
.mx .ctx{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:11px}
.mx .ctx div{border:1px solid var(--line2);border-radius:10px;padding:11px 12px;background:rgba(255,255,255,0.015);
  display:flex;flex-direction:column;gap:5px;min-width:0;transition:transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,background .3s}
.mx .ctx div:hover{transform:translateY(-2px);border-color:var(--line-strong);background:rgba(46,230,160,0.04)}
.mx .ctx .t{display:flex;align-items:center;justify-content:space-between;gap:6px}
.mx .ctx em{font-style:normal;font-family:var(--mono);font-size:10.5px;color:var(--mut);letter-spacing:.5px;font-weight:500}
.mx .ctx b{font-family:var(--mono);font-size:15px;font-weight:400}
.mx .ctx small{font-size:10.5px;color:var(--dim);line-height:1.35}
.mx .nota{margin:16px 0 0;font-size:11.5px;color:var(--faint);line-height:1.5}
/* Frescor é informação de rodapé, não aviso: sem caixa, sem borda, num tom puxado para o
   cinza. Só "parado" mantém cor cheia — ali o dado está quebrado e precisa interromper a leitura. */
.mx .selo{font-family:var(--mono);font-size:9px;letter-spacing:.3px;white-space:nowrap;flex:none;
  font-style:normal;font-weight:400;border:0;padding:0;background:none}
.mx .s-live{color:color-mix(in srgb,var(--up) 45%,var(--faint))}
.mx .s-del{color:color-mix(in srgb,var(--flat) 40%,var(--faint))}
.mx .s-fech{color:var(--faint)}
.mx .s-man{color:color-mix(in srgb,var(--blue) 45%,var(--faint))}
.mx .s-parado{color:var(--down);font-weight:500}
.mx input:focus-visible,.mx button:focus-visible{outline:2px solid var(--roxo);outline-offset:2px}
@media(prefers-reduced-motion:reduce){.mx *{transition:none!important}}
`;

function Selo({ tipo }) {
  const m = { live: "live", del: "15m", fech: "fech", man: "manual", parado: "parado", sem: "s/ dado" };
  return <i className={"selo s-" + (tipo === "sem" ? "parado" : tipo)}>{m[tipo] || tipo}</i>;
}

// isAdmin: só o admin digita o FEF2 (o viés é o mesmo para todos os assinantes)
export default function Macro({ isAdmin = false }) {
  const [vies, setVies] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [aoVivo, setAoVivo] = useState({});
  const [fef2, setFef2] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(null);
  const [verOutro, setVerOutro] = useState(false);
  const digitando = useRef(false);
  const timer = useRef(null);

  const carregar = useCallback(async () => {
    const hoje = hojeBRT();
    const [{ data: v }, { data: ag }, { data: ao }] = await Promise.all([
      supabase.from("macro_vies").select("*").eq("data_pregao", hoje).maybeSingle(),
      supabase.from("macro_calendario").select("nome, estrelas, hora_brt, pais").eq("data", hoje).order("hora_brt"),
      // sem filtro: serve tanto o card de contexto quanto o recálculo ao vivo das pernas
      supabase.from("macro_agora").select("symbol, pct, preco_em"),
    ]);
    setVies(v || null);
    setAgenda(ag || []);
    setAoVivo(Object.fromEntries((ao || []).map((q) => [q.symbol, q])));
    if (!digitando.current && v?.fef2_manual != null) setFef2(String(v.fef2_manual));
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
    const ch = supabase.channel("macro-vies")
      .on("postgres_changes", { event: "*", schema: "public", table: "macro_vies" }, carregar)
      .subscribe();
    const t = setInterval(carregar, 60000);
    return () => { supabase.removeChannel(ch); clearInterval(t); if (timer.current) clearTimeout(timer.current); };
  }, [carregar]);

  const calc = useMemo(() => calcular(vies, fef2), [vies, fef2]);

  // Grava o FEF2! e o viés recalculado. Sem botão: o que está na tela é o que fica no log.
  function digitar(txt) {
    digitando.current = true;
    setFef2(txt);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const c = calcular(vies, txt);
      if (!vies || !c) return;
      setSalvando("salvando");
      const pct = txt === "" ? null : Number(String(txt).replace(",", "."));
      const { error } = await supabase.from("macro_vies").update({
        fef2_manual: Number.isNaN(pct) ? null : pct,
        pernas: c.pernas, resultado: c.resultado, direcao: c.direcao,
        intensidade: c.intensidade, completo: c.completo, atualizado_em: new Date().toISOString(),
      }).eq("data_pregao", vies.data_pregao);
      setSalvando(error ? "erro" : "salvo");
      digitando.current = false;
    }, 700);
  }

  const naAbertura = naJanela();

  if (carregando) return (
    <div className="mx"><style>{CSS}</style><p style={{ color: "#7f8a97" }}>Carregando leitura…</p></div>
  );

  if (!vies) return (
    <div className="mx">
      <style>{CSS}</style>
      <header className="topo">
        <h1>Viés da Abertura</h1>
        <p>WIN e WDO · leitura dos 15 primeiros minutos</p>
      </header>
      <div className="aviso">
        Nenhuma coleta registrada para hoje ainda. O painel preenche sozinho quando a coleta da manhã rodar.
      </div>
    </div>
  );

  const temNoticia = vies.tem_noticia;
  const alt = vies.alternativa?.pernas?.length ? vies.alternativa : null;
  const altLido = alt ? fechar(alt.pernas) : null;

  /* A tela nunca para: a mesma equação, recalculada com a cotação do momento, o dia inteiro.
     Perna sem cotação nova cai de volta no valor registrado, para o número nunca degradar.
     O FEF2! não tem fonte automática, então segue o valor digitado.
     O banco continua guardando a foto das 08h55 — isto aqui é leitura de tela e não escreve nada. */
  const mostra = fechar(calc.pernas.map((p) => {
    if (p.entrada === "manual") return p;
    const q = aoVivo[p.symbol];
    if (q?.pct == null) return p;
    const pct = Number(q.pct);
    return { ...p, pct, contribuicao: Number((p.sinal * pct).toFixed(2)), preco_em: q.preco_em };
  }));

  const cor = CORES[mostra.direcao];
  const pos = Math.max(0, Math.min(100, (Math.max(MIN, Math.min(MAX, mostra.resultado)) - MIN) / (MAX - MIN) * 100));
  const alvo = mostra.resultado < MIN ? 0 : mostra.resultado > MAX ? FAIXAS.length - 1
    : FAIXAS.findIndex((f, i) => mostra.resultado >= f.de && (mostra.resultado < f.ate || i === FAIXAS.length - 1));
  const maxAbs = Math.max(1, ...mostra.pernas.map((p) => Math.abs(p.contribuicao ?? 0)));

  return (
    <div className="mx" style={{ "--cor": cor }}>
      <style>{CSS}</style>

      <header className="topo">
        <h1>Viés da Abertura</h1>
        <p>WIN e WDO · leitura dos 15 primeiros minutos</p>
        <span className="status on">
          ao vivo · {(() => {
            const t = Object.values(aoVivo).map((q) => q?.preco_em).filter(Boolean).sort().pop();
            return t ? "cotação de " + horaBRT(t) : "sem cotação";
          })()}
        </span>
      </header>

      <section className="card">
        <h2>Calendário</h2>
        <div className="cal-topo">
          <p className="cal-frase">
            {temNoticia
              ? `${vies.evento_nome} às 09h00. Notícia 3★ no Brasil.`
              : "Sem notícia 3★ no Brasil às 09h00."}
          </p>
          <span className="modo" style={{ "--mc": temNoticia ? "#5aa9f0" : "#2ee6a0" }}>
            {temNoticia ? "MODO ADR" : "MODO MACRO"}
          </span>
        </div>

        {agenda.length > 0 && (
          <div className="agenda">
            {agenda.map((e, i) => (
              <div key={i} className="ev">
                <em>{String(e.hora_brt || "").slice(0, 5) || "—"}</em>
                <span className="pais">
                  <Bandeira pais={e.pais} />
                  {(e.pais || "BR").toUpperCase()}
                </span>
                <span style={{ color: e.estrelas >= 3 ? "#eceef2" : "#a9b8b1", minWidth: 0 }}>{e.nome}</span>
                <s style={{ color: e.estrelas >= 3 ? "#f5b941" : "#62746c" }}>
                  {"★".repeat(e.estrelas) + "☆".repeat(Math.max(0, 3 - e.estrelas))}
                </s>
              </div>
            ))}
          </div>
        )}

        <div className="cal-pe">
          <span className="eq">
            {calc.pernas.map((p, i) => (
              <span key={p.symbol}>
                {i > 0 && " + "}
                <b>{p.sinal === -1 ? `( −${p.rotulo} )` : p.rotulo}</b>
              </span>
            ))}
          </span>
          {alt && (
            <button className="btn" onClick={() => setVerOutro((v) => !v)}>
              {verOutro ? "ocultar" : temNoticia ? "ver o trio" : "ver as ADRs"}
            </button>
          )}
        </div>

        {alt && verOutro && (
          <div className="outro">
            <div className="outro-top">
              <b>{sg(altLido.resultado, n1)}%</b>
              <span>
                {temNoticia ? "o trio" : "as ADRs"} · {altLido.direcao}
                {altLido.direcao === "lateral" ? "" : " " + altLido.intensidade.toLowerCase()}
                {" · não é o viés de hoje"}
              </span>
            </div>
            <div className="outro-pernas">
              {alt.pernas.map((p) => (
                <span key={p.symbol}>
                  {p.rotulo}{" "}
                  <b style={{ color: (p.contribuicao ?? 0) > 0 ? "#2ee6a0" : (p.contribuicao ?? 0) < 0 ? "#ff5470" : "#62746c" }}>
                    {p.contribuicao == null ? "—" : sg(p.contribuicao)}
                  </b>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Cálculo</h2>
        <div className="calc-head">
          <span className="vnum">{sg(mostra.resultado, n1)}%</span>
          <div className="chips">
            <span className="chip">{mostra.direcao.toUpperCase()}</span>
            <span className={"chip" + (mostra.direcao === "lateral" ? " ghost" : "")}>
              {mostra.direcao === "lateral" ? "SEM FORÇA" : mostra.intensidade.toUpperCase()}
            </span>
          </div>
        </div>
        {/* A frase de ação fala em "abertura" — fora da janela ela seria instrução falsa,
            porque não existe abertura às 15h. O número e a régua continuam ao vivo de qualquer jeito. */}
        {naAbertura ? (
          <p className="acao">{ACAO[mostra.direcao](mostra.intensidade.toLowerCase())}</p>
        ) : (
          <p className="acao" style={{ color: "#a9b8b1" }}>
            Cotação do momento, fora da janela da abertura. O viés registrado às{" "}
            {horaBRT(vies.atualizado_em)} foi <b>{sg(calc.resultado, n1)}%</b>, {calc.direcao}
            {calc.direcao === "lateral" ? "" : " " + calc.intensidade.toLowerCase()}.
          </p>
        )}

        <div className="regua-bloco">
          <div className="regua-top"><span>← negativa</span><span>lateral</span><span>positiva →</span></div>
          <div className="regua-pin">
            <div className="pin" style={{ left: pos + "%" }}>
              <i>{(Math.abs(mostra.resultado) > MAX
                ? (mostra.resultado > 0 ? "+" : "−") + n1(MAX) + "+"
                : sg(mostra.resultado, n1)) + "%"}</i>
              <u />
            </div>
          </div>
          <div className="regua">
            {FAIXAS.map((f, i) => (
              <div key={i} className={"faixa" + (i === alvo ? " on" : "")}
                   style={{ flex: `0 0 ${(f.ate - f.de) / (MAX - MIN) * 100}%`, "--fc": f.c }}>{f.t}</div>
            ))}
          </div>
          <div className="escala">
            {[-4.5, -2.5, -1.5, 0, 1.5, 2.5, 4.5].map((v) => (
              <span key={v} className="tick" style={{ left: `${(v - MIN) / (MAX - MIN) * 100}%` }}>
                {v === 0 ? "0" : sg(v, n1)}
              </span>
            ))}
          </div>
        </div>

        <div className="pernas">
          {mostra.pernas.map((p) => {
            const v = p.contribuicao ?? 0;
            const w = Math.abs(v) / maxAbs * 50;
            const c = v > 0 ? "#2ee6a0" : v < 0 ? "#ff5470" : "#262639";
            const manual = p.entrada === "manual";
            const selo = manual ? "man" : p.parado ? "parado" : p.ausente ? "sem" : frescor(p.preco_em);
            const legenda = manual
              ? (salvando === "salvando" ? "salvando…"
                : salvando === "erro" ? "não salvou — tente de novo"
                : salvando === "salvo" ? "salvo"
                : "você digita · TradingView")
              : p.sinal === -1 ? `invertido · cotação ${horaBRT(p.preco_em)}`
              : p.parado ? "sem negócio no pré — conta 0"
              : p.ausente ? "sem cotação" : `cotação ${horaBRT(p.preco_em)}`;
            return (
              <div key={p.symbol} className="perna">
                <span className="pn">
                  <b>{p.rotulo} <Selo tipo={selo} /></b>
                  <span>{legenda}</span>
                </span>
                <span className="barra">
                  <i style={{ background: c, ...(v >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }) }} />
                </span>
                <span className="pv">
                  {manual && isAdmin
                    ? <input type="number" step="0.01" inputMode="decimal" value={fef2} placeholder="0,00"
                             onChange={(e) => digitar(e.target.value)} aria-label={`${p.rotulo} — variação em %`} />
                    : <span style={{ color: v > 0 ? "#2ee6a0" : v < 0 ? "#ff5470" : "#62746c" }}>
                        {p.contribuicao == null ? "—" : sg(v)}
                      </span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="total">
          <span className="lbl">Total</span>
          <b style={{ color: cor }}>{sg(mostra.resultado, n1)}%</b>
        </div>

        {mostra.faltando.length > 0 ? (
          <div className="alerta">
            <b>{mostra.faltando.join(", ")}</b> sem valor. A leitura está incompleta — o número na régua não é o viés final.
          </div>
        ) : mostra.parados.length > 0 ? (
          <div className="alerta">
            <b>{mostra.parados.join(", ")}</b> sem negócio no pré-mercado. Entrou como zero e puxou o resultado
            para o lateral. Σ de {mostra.pernas.length - mostra.parados.length} de {mostra.pernas.length}.
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="ctx-head">
          <h2>Contexto · ao vivo</h2>
          <span className="lbl">
            {(() => {
              const t = Object.values(aoVivo).map((q) => q?.preco_em).filter(Boolean).sort().pop();
              return t ? "atualizado " + horaBRT(t) : "sem cotação";
            })()}
          </span>
        </div>
        <div className="ctx">
          {CTX_ATIVOS.map(([sym, rotulo, nome]) => {
            const q = aoVivo[sym];
            const v = q?.pct == null ? null : Number(q.pct);
            return (
              <div key={sym}>
                <span className="t"><em>{rotulo}</em><Selo tipo={frescor(q?.preco_em)} /></span>
                <b style={{ color: v == null ? "#62746c" : v > 0 ? "#2ee6a0" : v < 0 ? "#ff5470" : "#a9b8b1" }}>
                  {v == null ? "—" : sg(v) + "%"}
                </b>
                <small>{nome}</small>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
