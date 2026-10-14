import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

/* Viés da Abertura — WIN e WDO, leitura dos 15 primeiros minutos (09:00 → 09:15).
   O cálculo e a classificação aqui são idênticos aos da Edge Function coleta-macro:
   soma com sinal, arredondamento em 1 casa, e só então a classificação. Se mudar um lado,
   mude o outro — a tela e o log têm de contar a mesma história. */

const FAIXAS = [
  { de: -6,   ate: -4.5, t: "Forte",    c: "#ef6462" },
  { de: -4.5, ate: -2.5, t: "Moderada", c: "#d2706b" },
  { de: -2.5, ate: -1.5, t: "Fraca",    c: "#b08268" },
  { de: -1.5, ate:  1.5, t: "Lateral",  c: "#d6a73f" },
  { de:  1.5, ate:  2.5, t: "Fraca",    c: "#6aae95" },
  { de:  2.5, ate:  4.5, t: "Moderada", c: "#48bd9c" },
  { de:  4.5, ate:  6,   t: "Forte",    c: "#2fc79f" },
];
const MIN = -6, MAX = 6;
const CORES = { positiva: "#2fc79f", negativa: "#ef6462", lateral: "#d6a73f" };

/* Frescor pela idade da cotação, não por uma etiqueta fixa: a mesma fonte entrega
   ao vivo, atrasada ou fechada conforme a hora. "fech" não é defeito — é número definitivo. */
function frescor(em) {
  if (!em) return "sem";
  const min = (Date.now() - new Date(em).getTime()) / 60000;
  if (min <= 3) return "live";
  if (min <= 40) return "del";
  return "fech";
}

const n1 = (x) => x.toFixed(1).replace(".", ",");
const n2 = (x) => x.toFixed(2).replace(".", ",");
const sg = (x, f = n2) => (x > 0 ? "+" : x < 0 ? "−" : "") + f(Math.abs(x));
const hojeBRT = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
/* A mesma janela da Edge Function: das 09:00 em diante o viés do dia está congelado.
   Um FEF2! digitado às 09h02 não é o que estava na tela às 08h55, e um log que aceita
   correção retroativa não serve para medir nada depois. */
const janelaAberta = () => {
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  return brt.getUTCHours() * 60 + brt.getUTCMinutes() < 9 * 60;
};
const horaBRT = (iso) => iso
  ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
  : "—";

function classificar(resultado) {
  const m = Math.abs(resultado);
  if (m < 1.5) return { direcao: "lateral", intensidade: "Lateral" };
  return {
    direcao: resultado > 0 ? "positiva" : "negativa",
    intensidade: m < 2.5 ? "Fraca" : m < 4.5 ? "Moderada" : "Forte",
  };
}

function calcular(vies, fef2) {
  if (!vies) return null;
  const pernas = (vies.pernas || []).map((p) => {
    if (p.entrada !== "manual") return p;
    const pct = fef2 === "" || fef2 == null || Number.isNaN(Number(fef2)) ? null : Number(fef2);
    return { ...p, pct, contribuicao: pct == null ? null : Number((p.sinal * pct).toFixed(2)), ausente: pct == null };
  });
  const soma = pernas.reduce((t, p) => t + (p.contribuicao ?? 0), 0);
  const resultado = Math.round(soma * 10) / 10;
  return {
    pernas, resultado, ...classificar(resultado),
    completo: pernas.every((p) => !p.ausente && !p.parado),
    faltando: pernas.filter((p) => p.ausente).map((p) => p.rotulo),
    parados: pernas.filter((p) => p.parado).map((p) => p.rotulo),
  };
}

const ACAO = {
  positiva: (f) => <>Intenção de <b>compra</b> com força {f}. Busca regiões compradoras <b>abaixo da abertura</b>.</>,
  negativa: (f) => <>Intenção de <b>venda</b> com força {f}. Busca regiões vendedoras <b>acima da abertura</b>.</>,
  lateral: () => <>Sem intenção definida. <b>Opera as extremidades</b>, com as travas dos dois lados. Alvos curtos.</>,
};

const CSS = `
/* Sem fundo proprio: a pagina usa o fundo do app, igual as outras secoes. */
.mx-page{padding-block:4px 8px}
.mx{--surf:#13131f;--surf2:#191926;--line:#262639;--line2:#1f1f2e;--txt:#eceef2;--mut:#9aa3b0;
  --dim:#7f8a97;--faint:#636d7a;--up:#2fc79f;--down:#ef6462;--flat:#d6a73f;--blue:#5aa9f0;--roxo:#8b7cf6;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --ui:"Archivo",system-ui,-apple-system,"Segoe UI",sans-serif;
  max-width:1120px;margin:0 auto;font-family:var(--ui);
  display:flex;flex-direction:column;gap:18px;color:var(--txt);font-size:14px;line-height:1.5;
  -webkit-font-smoothing:antialiased}
.mx *{box-sizing:border-box}
/* Veredito ocupa a largura toda — a régua ganha resolução. O resto vai em duas colunas:
   esquerda o que entra (calendário e variação), direita o que sai (contribuição e contexto). */
.mx .grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
.mx .col{display:flex;flex-direction:column;gap:18px;min-width:0}
@media(max-width:1000px){.mx .grade{grid-template-columns:minmax(0,1fr)}}
.mx .lbl{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:var(--faint);font-weight:600}
.mx .card{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:26px 28px}
.mx .card>h2{margin:0 0 20px;font-size:10px;letter-spacing:2.2px;text-transform:uppercase;font-weight:700;color:var(--faint)}
@media(max-width:520px){.mx .card{padding:22px 18px}}
.mx .topo{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 20px}
.mx .topo h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.3px}
.mx .topo p{margin:3px 0 0;font-size:13px;color:var(--dim)}
.mx .relogio{display:flex;gap:20px;text-align:right}
.mx .relogio b{display:block;font-family:var(--mono);font-size:14px;font-weight:500;margin-top:3px}
.mx .veredito{border-left:2px solid var(--cor)}
.mx .vhead{display:flex;align-items:center;gap:30px;flex-wrap:wrap}
.mx .vnum{font-family:var(--mono);font-weight:300;font-size:clamp(46px,10vw,62px);line-height:.9;letter-spacing:-2.5px;color:var(--cor)}
.mx .chips{display:flex;flex-direction:column;gap:7px;min-width:124px}
.mx .chip{font-size:10.5px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;padding:6px 14px;
  border-radius:7px;text-align:center;white-space:nowrap;color:var(--cor);
  border:1px solid color-mix(in srgb,var(--cor) 32%,transparent);background:color-mix(in srgb,var(--cor) 8%,transparent)}
.mx .chip.ghost{color:var(--dim);border-color:var(--line);background:transparent}
.mx .vacao{margin:24px 0 0;font-size:15.5px;line-height:1.55;padding-top:22px;border-top:1px solid var(--line2);max-width:72ch}
.mx .vacao b{color:var(--cor);font-weight:600}
.mx .regua-bloco{margin-top:24px;padding-top:22px;border-top:1px solid var(--line2)}
.mx .regua-top{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1.8px;
  text-transform:uppercase;color:var(--faint);margin-bottom:9px}
.mx .regua-pin{position:relative;height:22px}
.mx .pin{position:absolute;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;
  transition:left .34s cubic-bezier(.3,.8,.4,1)}
.mx .pin i{font-style:normal;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--cor);white-space:nowrap}
.mx .pin u{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid var(--cor)}
.mx .regua{display:flex;height:32px;border-radius:7px;overflow:hidden}
.mx .faixa{display:grid;place-items:center;font-size:9.5px;font-weight:600;letter-spacing:1px;text-transform:uppercase;
  min-width:0;overflow:hidden;transition:.3s ease;background:color-mix(in srgb,var(--fc) 9%,var(--surf2));
  color:color-mix(in srgb,var(--fc) 42%,var(--faint))}
.mx .faixa.on{background:color-mix(in srgb,var(--fc) 82%,#0a0a11);color:#0a0a11;font-weight:700}
.mx .escala{position:relative;height:15px;margin-top:5px}
.mx .tick{position:absolute;transform:translateX(-50%);font-family:var(--mono);font-size:9.5px;color:var(--faint)}
.mx .cal-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.mx .cal-frase{margin:0;font-size:18px;font-weight:500;line-height:1.4;letter-spacing:-.2px}
.mx .modo{font-family:var(--mono);font-size:10px;letter-spacing:1.4px;padding:5px 11px;border-radius:7px;
  white-space:nowrap;border:1px solid color-mix(in srgb,var(--mc) 32%,transparent);color:var(--mc);
  background:color-mix(in srgb,var(--mc) 8%,transparent)}
.mx .cal-sub{margin:10px 0 0;font-size:12.5px;color:var(--dim)}
.mx .eventos{margin-top:20px;padding-top:18px;border-top:1px solid var(--line2);display:flex;flex-direction:column;gap:11px}
.mx .evento{display:grid;grid-template-columns:50px minmax(0,1fr) auto;gap:14px;align-items:baseline;font-size:13px}
.mx .evento em{font-style:normal;font-family:var(--mono);font-size:12px;color:var(--mut)}
.mx .evento s{text-decoration:none;font-family:var(--mono);font-size:11px;letter-spacing:2px;white-space:nowrap}
.mx .eq{margin-top:20px;padding:12px 16px;border-radius:9px;background:var(--surf2);font-family:var(--mono);
  font-size:12.5px;color:var(--mut);overflow-x:auto;white-space:nowrap}
.mx .eq b{color:var(--txt);font-weight:600}
.mx .campos{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}
.mx .campo{border:1px solid var(--line);border-radius:11px;padding:14px 15px 13px;background:var(--surf2);
  display:flex;flex-direction:column;gap:11px;min-width:0}
.mx .campo.manual{border-color:color-mix(in srgb,var(--blue) 34%,transparent);background:color-mix(in srgb,var(--blue) 5%,var(--surf2))}
.mx .campo.parado{border-color:color-mix(in srgb,var(--down) 32%,transparent);background:color-mix(in srgb,var(--down) 5%,var(--surf2))}
.mx .campo-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.mx .campo-top b{font-family:var(--mono);font-size:12.5px;font-weight:600}
.mx .campo input{width:100%;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--txt);
  font-family:var(--mono);font-size:19px;font-weight:400;padding:2px 0 6px;text-align:right}
.mx .campo input:focus{outline:none;border-bottom-color:var(--blue)}
.mx .campo input:disabled{color:var(--dim);cursor:not-allowed}
.mx .campo.manual:has(input:disabled){border-color:var(--line);background:var(--surf2)}
.mx .campo .val{font-family:var(--mono);font-size:19px;text-align:right;padding:2px 0 6px;border-bottom:1px solid var(--line)}
.mx .campo small{font-size:9.5px;color:var(--faint);font-family:var(--mono)}
.mx .selo{font-family:var(--mono);font-size:9px;letter-spacing:.5px;padding:2px 6px;border-radius:4px;
  border:1px solid;white-space:nowrap;font-style:normal}
.mx .s-live{color:var(--up);border-color:color-mix(in srgb,var(--up) 35%,transparent)}
.mx .s-del{color:var(--flat);border-color:color-mix(in srgb,var(--flat) 35%,transparent)}
.mx .s-man{color:var(--blue);border-color:color-mix(in srgb,var(--blue) 35%,transparent)}
.mx .s-parado{color:var(--down);border-color:color-mix(in srgb,var(--down) 35%,transparent)}
.mx .soma{margin-top:20px;padding:13px 16px;border-radius:9px;background:var(--surf2);text-align:center;
  font-family:var(--mono);font-size:13px;color:var(--mut);overflow-x:auto;white-space:nowrap}
.mx .soma b{color:var(--txt);font-weight:600}
.mx .pernas{display:flex;flex-direction:column;gap:14px}
.mx .perna{display:grid;grid-template-columns:96px minmax(0,1fr) 62px;gap:14px;align-items:center}
.mx .perna .pn{display:flex;flex-direction:column;min-width:0}
.mx .perna .pn b{font-family:var(--mono);font-size:12px;font-weight:600}
.mx .perna .pn span{font-size:9.5px;color:var(--faint)}
.mx .barra{position:relative;height:14px;background:var(--surf2);border-radius:4px;overflow:hidden}
.mx .barra::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--line)}
.mx .barra i{position:absolute;top:0;bottom:0;border-radius:3px;transition:.32s cubic-bezier(.3,.8,.4,1)}
.mx .perna .pv{font-family:var(--mono);font-size:12.5px;font-weight:500;text-align:right}
.mx .total{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:20px;
  padding-top:18px;border-top:1px solid var(--line2)}
.mx .total .tv{font-family:var(--mono);font-size:20px;font-weight:400;color:var(--cor)}
.mx .alerta{margin-top:18px;padding:13px 16px;border-radius:9px;font-size:12.5px;line-height:1.5;
  background:color-mix(in srgb,var(--down) 8%,transparent);
  border:1px solid color-mix(in srgb,var(--down) 26%,transparent);color:#f3a9a8}
.mx .alerta b{color:var(--down);font-weight:600}
.mx .aviso{padding:13px 16px;border-radius:9px;font-size:12.5px;line-height:1.5;
  background:color-mix(in srgb,var(--flat) 8%,transparent);
  border:1px solid color-mix(in srgb,var(--flat) 26%,transparent);color:#e8cf95}
.mx .ctx{display:grid;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:12px}
.mx .ctx div{border:1px solid var(--line2);border-radius:10px;padding:12px 13px;display:flex;flex-direction:column;gap:5px;min-width:0}
.mx .ctx .ctx-top{display:flex;align-items:center;justify-content:space-between;gap:6px}
.mx .ctx em{font-style:normal;font-family:var(--mono);font-size:9.5px;color:var(--faint);letter-spacing:.6px}
.mx .ctx b{font-family:var(--mono);font-size:15px;font-weight:400}
.mx .ctx small{font-size:9.5px;color:var(--faint);line-height:1.3}
.mx .ctx .selo{font-size:8px;padding:1px 4px;letter-spacing:.3px}
.mx .s-fech{color:var(--dim);border-color:var(--line)}
.mx .nota{margin:18px 0 0;font-size:12px;color:var(--faint);line-height:1.55}
.mx .alt-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.mx .alt-sub{margin:6px 0 0;font-size:12.5px;color:var(--dim);max-width:46ch}
.mx .btn-alt{flex:none;padding:7px 15px;border-radius:8px;cursor:pointer;background:transparent;
  border:1px solid var(--line);color:var(--mut);font-family:var(--mono);font-size:11px;letter-spacing:.6px;
  transition:.15s}
.mx .btn-alt:hover{border-color:var(--roxo);color:var(--roxo)}
.mx .alt-corpo{margin-top:20px;padding-top:18px;border-top:1px solid var(--line2);
  display:flex;flex-direction:column;gap:14px}
.mx .alt-num{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.mx .alt-num b{font-family:var(--mono);font-size:26px;font-weight:300;letter-spacing:-1px;color:var(--mut)}
.mx .alt-num span{font-size:10.5px;letter-spacing:1.4px;text-transform:uppercase;color:var(--faint)}
.mx input:focus-visible{outline:2px solid var(--roxo);outline-offset:2px}
@media(prefers-reduced-motion:reduce){.mx *{transition:none!important}}
`;

function Selo({ tipo }) {
  const m = { live: "live", del: "15m", fech: "fech", man: "manual", parado: "parado", sem: "s/ dado" };
  return <i className={"selo s-" + (tipo === "sem" ? "parado" : tipo)}>{m[tipo] || tipo}</i>;
}

export default function Macro() {
  const [vies, setVies] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [fef2, setFef2] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(null); // null | "salvando" | "salvo" | "erro"
  const [verAlt, setVerAlt] = useState(false);
  const digitando = useRef(false);
  const timer = useRef(null);

  const carregar = useCallback(async () => {
    const hoje = hojeBRT();
    const [{ data: v }, { data: ag }] = await Promise.all([
      supabase.from("macro_vies").select("*").eq("data_pregao", hoje).maybeSingle(),
      supabase.from("macro_calendario").select("nome, estrelas, hora_brt, pais")
        .eq("data", hoje).order("hora_brt"),
    ]);
    setVies(v || null);
    setAgenda(ag || []);
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

  if (carregando) return (
    <div className="mx-page"><style>{CSS}</style>
      <div className="mx"><p style={{ color: "#7f8a97", fontSize: 14 }}>Carregando leitura…</p></div>
    </div>
  );

  if (!vies) return (
    <div className="mx-page">
      <style>{CSS}</style>
      <div className="mx">
        <header className="topo">
          <div><h1>Viés da Abertura</h1><p>WIN e WDO · leitura dos 15 primeiros minutos</p></div>
        </header>
        <div className="aviso">
          Nenhuma coleta registrada para hoje ainda. O painel preenche sozinho quando a coleta das 08h50 rodar.
        </div>
      </div>
    </div>
  );

  const cor = CORES[calc.direcao];
  const aberta = janelaAberta();
  const alt = vies.alternativa && vies.alternativa.pernas ? vies.alternativa : null;
  const temNoticia = vies.tem_noticia;
  // contexto virou lista (ordem importa); aceita o formato antigo em objeto sem quebrar
  const ctx = Array.isArray(vies.contexto) ? vies.contexto
    : Object.entries(vies.contexto || {}).map(([k, v]) => ({ symbol: k, rotulo: k, nome: "", ...v }));
  const pos = Math.max(0, Math.min(100, (Math.max(MIN, Math.min(MAX, calc.resultado)) - MIN) / (MAX - MIN) * 100));
  const alvo = calc.resultado < MIN ? 0 : calc.resultado > MAX ? FAIXAS.length - 1
    : FAIXAS.findIndex((f, i) => calc.resultado >= f.de && (calc.resultado < f.ate || i === FAIXAS.length - 1));
  const maxAbs = Math.max(1, ...calc.pernas.map((p) => Math.abs(p.contribuicao ?? 0)));

  return (
    <div className="mx-page">
      <style>{CSS}</style>
      <div className="mx" style={{ "--cor": cor }}>

      <header className="topo">
        <div>
          <h1>Viés da Abertura</h1>
          <p>WIN e WDO · leitura dos 15 primeiros minutos</p>
        </div>
        <div className="relogio">
          <div><span className="lbl">Coleta</span><b style={{ color: "#8b7cf6" }}>{horaBRT(vies.atualizado_em)}</b></div>
          <div><span className="lbl">Vale das</span><b>09:00 → 09:15</b></div>
        </div>
      </header>

      <section className="card veredito">
        <div className="vhead">
          <span className="vnum">{sg(calc.resultado, n1)}%</span>
          <div className="chips">
            <span className="chip">{calc.direcao.toUpperCase()}</span>
            <span className={"chip" + (calc.direcao === "lateral" ? " ghost" : "")}>
              {calc.direcao === "lateral" ? "SEM FORÇA" : calc.intensidade.toUpperCase()}
            </span>
          </div>
        </div>
        <p className="vacao">{ACAO[calc.direcao](calc.intensidade.toLowerCase())}</p>

        <div className="regua-bloco">
          <div className="regua-top"><span>← negativa</span><span>lateral</span><span>positiva →</span></div>
          <div className="regua-pin">
            <div className="pin" style={{ left: pos + "%" }}>
              <i>{(Math.abs(calc.resultado) > MAX
                ? (calc.resultado > 0 ? "+" : "−") + n1(MAX) + "+"
                : sg(calc.resultado, n1)) + "%"}</i>
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
      </section>

      <div className="grade">
      <div className="col">

      <section className="card">
        <h2>Calendário</h2>
        <div className="cal-topo">
          <p className="cal-frase">
            {temNoticia
              ? `${vies.evento_nome} às 09h00. Notícia 3★ no Brasil.`
              : "Sem notícia 3★ no Brasil às 09h00."}
          </p>
          <span className="modo" style={{ "--mc": temNoticia ? "#5aa9f0" : "#2fc79f" }}>
            {temNoticia ? "MODO ADR" : "MODO MACRO"}
          </span>
        </div>
        <p className="cal-sub">
          {agenda.length} evento{agenda.length === 1 ? "" : "s"} no Brasil hoje ·{" "}
          {temNoticia ? "1 de 3 estrelas na abertura" : "nenhum de 3 estrelas na abertura"}
        </p>
        {agenda.length > 0 && (
          <div className="eventos">
            {agenda.map((e, i) => (
              <div key={i} className="evento">
                <em>{String(e.hora_brt || "").slice(0, 5) || "—"}</em>
                <span style={{ color: e.estrelas >= 3 ? "#eceef2" : "#9aa3b0", minWidth: 0 }}>{e.nome}</span>
                <s style={{ color: e.estrelas >= 3 ? "#d6a73f" : "#636d7a" }}>
                  {"★".repeat(e.estrelas) + "☆".repeat(Math.max(0, 3 - e.estrelas))}
                </s>
              </div>
            ))}
          </div>
        )}
        <div className="eq">
          {calc.pernas.map((p, i) => (
            <span key={p.symbol}>
              {i > 0 && " + "}
              <b>{p.sinal === -1 ? `( −${p.rotulo} )` : p.rotulo}</b>
            </span>
          ))}
          {"  =  intenção"}
        </div>
      </section>

      <section className="card">
        <h2>Variação às 08h55</h2>
        <div className="campos">
          {calc.pernas.map((p) => {
            const manual = p.entrada === "manual";
            const selo = manual ? "man" : p.parado ? "parado" : p.ausente ? "sem" : "del";
            return (
              <label key={p.symbol} className={"campo" + (manual ? " manual" : "") + (p.parado ? " parado" : "")}>
                <span className="campo-top">
                  <b>{p.rotulo}{p.sinal === -1 && <span style={{ color: "#ef6462", fontSize: 9 }}> inverte</span>}</b>
                  <Selo tipo={selo} />
                </span>
                {manual ? (
                  <input type="number" step="0.01" inputMode="decimal" value={fef2} placeholder="0,00"
                         disabled={!aberta} onChange={(e) => digitar(e.target.value)}
                         aria-label={`${p.rotulo} — variação em %`} />
                ) : (
                  <span className="val" style={{ color: p.pct == null ? "#636d7a" : p.pct > 0 ? "#2fc79f" : p.pct < 0 ? "#ef6462" : "#9aa3b0" }}>
                    {p.pct == null ? "—" : sg(p.pct)}
                  </span>
                )}
                <small>
                  {manual
                    ? (!aberta ? "registro fechado às 09:00"
                      : salvando === "salvando" ? "salvando…" : salvando === "erro" ? "não salvou — tente de novo"
                      : salvando === "salvo" ? "salvo no log" : "você digita · TradingView")
                    : p.parado ? "sem negócio no pré — conta 0"
                    : p.ausente ? "sem cotação" : `cotação ${horaBRT(p.preco_em)}`}
                </small>
              </label>
            );
          })}
        </div>
        <div className="soma">
          {calc.pernas.map((p, i) => (
            <span key={p.symbol}>
              {i > 0 && " + "}
              <span style={{ color: (p.contribuicao ?? 0) > 0 ? "#2fc79f" : (p.contribuicao ?? 0) < 0 ? "#ef6462" : "#636d7a" }}>
                {p.contribuicao == null ? "—" : sg(p.contribuicao) + "%"}
              </span>
            </span>
          ))}
          {"  =  "}<b style={{ color: cor }}>{sg(calc.resultado, n1)}%</b>
        </div>
      </section>

      </div>
      <div className="col">

      <section className="card">
        <h2>Contribuição de cada perna</h2>
        <div className="pernas">
          {calc.pernas.map((p) => {
            const v = p.contribuicao ?? 0;
            const w = Math.abs(v) / maxAbs * 50;
            const c = v > 0 ? "#2fc79f" : v < 0 ? "#ef6462" : "#262639";
            return (
              <div key={p.symbol} className="perna">
                <span className="pn">
                  <b>{p.rotulo}</b>
                  <span>{p.sinal === -1 ? "invertido" : p.parado ? "sem negócio" : p.ausente ? "sem dado" : "a favor"}</span>
                </span>
                <span className="barra">
                  <i style={{ background: c, ...(v >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }) }} />
                </span>
                <span className="pv" style={{ color: v > 0 ? "#2fc79f" : v < 0 ? "#ef6462" : "#636d7a" }}>
                  {p.contribuicao == null ? "—" : sg(v)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="total">
          <span className="lbl">Total</span>
          <span className="tv" style={{ color: cor }}>{sg(calc.resultado, n1)}%</span>
        </div>
        {calc.faltando.length > 0 && (
          <div className="alerta">
            <b>{calc.faltando.join(", ")}</b> sem valor. A leitura está incompleta — o número na régua não é o viés final.
          </div>
        )}
        {calc.parados.length > 0 && (
          <div className="alerta">
            <b>{calc.parados.join(", ")}</b> sem negócio no pré-mercado. A perna entrou como zero e puxou o resultado
            para o lateral. Σ de {calc.pernas.length - calc.parados.length} de {calc.pernas.length} — o número é real,
            a leitura está incompleta.
          </div>
        )}
      </section>

      <section className="card">
        <h2>Overnight · contexto</h2>
        <div className="ctx">
          {ctx.map((c) => (
            <div key={c.symbol || c.rotulo}>
              <span className="ctx-top">
                <em>{c.rotulo}</em>
                <Selo tipo={frescor(c.em)} />
              </span>
              <b style={{ color: c.pct == null ? "#636d7a" : c.pct > 0 ? "#2fc79f" : c.pct < 0 ? "#ef6462" : "#9aa3b0" }}>
                {c.pct == null ? "—" : sg(c.pct) + "%"}
              </b>
              <small>{c.nome}</small>
            </div>
          ))}
        </div>
        <p className="nota">
          Leitura de ambiente. Nenhum destes entra na conta do viés.
          Futuros, não índices à vista — às 08h55 a bolsa americana está fechada e o índice à vista
          só repetiria o fechamento de ontem.
        </p>
      </section>

      {alt?.pernas?.length > 0 && (
        <section className="card">
          <div className="alt-top">
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0 }}>O outro lado</h2>
              <p className="alt-sub">
                {alt.rota === "macro"
                  ? "Como estaria pelo trio, se hoje não houvesse notícia 3★."
                  : "Como estaria pelas ADRs, se hoje houvesse notícia 3★."}
                {" "}Não é o viés de hoje e não vai para o log.
              </p>
            </div>
            <button className="btn-alt" onClick={() => setVerAlt((v) => !v)}>
              {verAlt ? "ocultar" : "ver"}
            </button>
          </div>

          {verAlt && (
            <div className="alt-corpo">
              <div className="alt-num">
                <b>{sg(alt.resultado, n1)}%</b>
                <span>{alt.direcao} · {alt.direcao === "lateral" ? "sem força" : alt.intensidade}</span>
                {!alt.completo && <span style={{ color: "#ef6462" }}>· incompleta</span>}
              </div>
              <div className="pernas">
                {alt.pernas.map((p) => {
                  const v = p.contribuicao ?? 0;
                  const w = Math.abs(v) / Math.max(1, ...alt.pernas.map((x) => Math.abs(x.contribuicao ?? 0))) * 50;
                  return (
                    <div key={p.symbol} className="perna">
                      <span className="pn">
                        <b style={{ color: "#9aa3b0" }}>{p.rotulo}</b>
                        <span>{p.sinal === -1 ? "invertido" : p.parado ? "sem negócio" : p.ausente ? "sem dado" : "a favor"}</span>
                      </span>
                      <span className="barra">
                        <i style={{ background: "#3a3a52", ...(v >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }) }} />
                      </span>
                      <span className="pv" style={{ color: "#7f8a97" }}>
                        {p.contribuicao == null ? "—" : sg(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      </div>
      </div>

      </div>
    </div>
  );
}
