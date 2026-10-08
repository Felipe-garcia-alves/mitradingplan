import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const MAX_IDADE_MIN = 30; // cotacao mais velha que isso nao conta como informacao de agora
// barras diarias: isentas de MAX_IDADE_MIN, regra propria em pregoesDesde (max 3 pregoes)
const DIARIOS = new Set(["TIO=F"]);

async function yahoo(symbol: string) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
          + `?interval=1m&range=1d&includePrePost=true`;
  const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(`${symbol}: HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(`${symbol}: sem resultado`);
  const closes = res.indicators?.quote?.[0]?.close ?? [];
  const stamps = res.timestamp ?? [];
  let preco: number | null = null, em: number | null = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { preco = closes[i]; em = stamps[i]; break; }
  }
  if (preco == null) { preco = res.meta?.regularMarketPrice ?? null; em = res.meta?.regularMarketTime ?? null; }
  const per = res.meta?.currentTradingPeriod?.regular;
  const agora = Math.floor(Date.now() / 1000);
  return { preco, em: em ? new Date(em * 1000).toISOString() : null, preMarket: !!(per && agora < per.start) };
}

// TIO=F: meta.regularMarketPrice vem congelado (161,91 de 11/08/2021) e nao ha barra de 1m.
// So a serie diaria de closes e confiavel. Nunca usar meta aqui.
async function yahooDiario(symbol: string) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
  const r = await fetch(u, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(`${symbol}: HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(`${symbol}: sem resultado`);
  const closes = res.indicators?.quote?.[0]?.close ?? [];
  const stamps = res.timestamp ?? [];
  const idx: number[] = [];
  for (let i = closes.length - 1; i >= 0 && idx.length < 2; i--) if (closes[i] != null) idx.push(i);
  return {
    preco: idx[0] != null ? closes[idx[0]] : null,
    anterior: idx[1] != null ? closes[idx[1]] : null,
    em: idx[0] != null ? new Date(stamps[idx[0]] * 1000).toISOString() : null, // barra carimbada 00:00 NY
    preMarket: false,
  };
}

// DCE:I = futuro de minerio de Dalian, contrato continuo. Sina (primaria) -> East Money (reserva).
// Endpoints chineses respondem em 2-4 s a partir do sa-east-1; timeout de 10 s para nao travar a coleta.
async function dalian() {
  const t = () => AbortSignal.timeout(10000);
  try {
    const r = await fetch("https://hq.sinajs.cn/list=nf_I0",
      { headers: { "User-Agent": UA, "Referer": "https://finance.sina.com.cn" }, signal: t() });
    if (!r.ok) throw new Error(`sina HTTP ${r.status}`);
    const txt = new TextDecoder("gb18030").decode(new Uint8Array(await r.arrayBuffer()));
    const f = (txt.match(/="([^"]*)"/)?.[1] ?? "").split(",");
    const ult = Number(f[8]), hora = f[1] ?? "", data = f[17] ?? "", ajAnt = Number(f[10]);
    if (!(ult > 0) || !/^\d{6}$/.test(hora) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("sina formato inesperado");
    const em = new Date(`${data}T${hora.slice(0, 2)}:${hora.slice(2, 4)}:${hora.slice(4, 6)}+08:00`).toISOString();
    return { preco: ult, em, preMarket: false, fonte: "sina", conferencia_pct: ajAnt > 0 ? r2((ult / ajAnt - 1) * 100) : null };
  } catch (_) { /* cai para o East Money */ }
  const r = await fetch("https://push2.eastmoney.com/api/qt/stock/get?secid=114.im&fields=f43,f59,f86,f170",
    { headers: { "User-Agent": UA }, signal: t() });
  if (!r.ok) throw new Error(`DCE:I: eastmoney HTTP ${r.status}`);
  const d = (await r.json())?.data;
  if (!d || !(d.f43 > 0) || !d.f86) throw new Error("DCE:I: sina e eastmoney sem dado");
  return { preco: d.f43 / 10 ** (d.f59 ?? 1), em: new Date(d.f86 * 1000).toISOString(), preMarket: false,
           fonte: "eastmoney", conferencia_pct: d.f170 != null ? d.f170 / 100 : null };
}

const hojeBRT = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const r2 = (n: number, d = 3) => Number(n.toFixed(d));
const idadeMin = (em: string | null) => em == null ? Infinity : (Date.now() - new Date(em).getTime()) / 60000;
// pregoes (dias uteis) desde a data da barra ate hoje; nao conhece feriados
const pregoesDesde = (em: string) => {
  let n = 0; const d = new Date(em.slice(0, 10) + "T12:00:00Z"); const fim = hojeBRT();
  for (;;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.toISOString().slice(0, 10) > fim) break;
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n++;
  }
  return n;
};

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

  const tok = req.headers.get("x-macro-token");
  const { data: cfg } = await db.from("macro_config").select("valor").eq("chave", "token_coleta").maybeSingle();
  if (!tok || !cfg?.valor || tok !== cfg.valor) return json({ erro: "nao autorizado" }, 401);

  const modo = new URL(req.url).searchParams.get("modo") ?? "leitura";

  const { data: ativos, error: eA } = await db
    .from("macro_assets").select("*").eq("ativo", true).is("valido_ate", null);
  if (eA) return json({ erro: eA.message }, 500);

  const buscas = await Promise.allSettled((ativos ?? []).map(async (a: any) =>
    ({ a, q: await (a.symbol === "DCE:I" ? dalian()
                  : DIARIOS.has(a.symbol) ? yahooDiario(a.symbol) : yahoo(a.symbol)) })));
  const precos: Record<string, any> = {}; const linhas: any[] = []; const falhas: string[] = [];
  for (let i = 0; i < buscas.length; i++) {
    const b = buscas[i];
    if (b.status !== "fulfilled" || b.value.q.preco == null) { falhas.push((ativos ?? [])[i]?.symbol ?? "?"); continue; }
    const { a, q } = b.value;
    precos[a.symbol] = q;
    linhas.push({ symbol: a.symbol, preco: q.preco, preco_em: q.em, pre_market: q.preMarket });
  }
  if (linhas.length) await db.from("macro_quotes").insert(linhas);

  const hoje = hojeBRT();

  if (modo === "referencia") {
    const { error } = await db.from("macro_referencia").upsert(
      linhas.map((l) => ({ data_captura: hoje, symbol: l.symbol, preco: l.preco })),
      { onConflict: "data_captura,symbol" },
    );
    if (error) return json({ erro: error.message }, 500);
    return json({ ok: true, modo, data: hoje, gravados: linhas.length, falhas });
  }

  const { data: refUlt } = await db.from("macro_referencia")
    .select("data_captura").order("data_captura", { ascending: false }).limit(1);
  if (!refUlt?.length) return json({ erro: "sem referencia gravada ainda" }, 409);
  const { data: refs } = await db.from("macro_referencia")
    .select("symbol, preco").eq("data_captura", refUlt[0].data_captura);
  const ref: Record<string, number> = {};
  for (const r of refs ?? []) ref[r.symbol] = Number(r.preco);

  const fxAgora = precos["BRL=X"]?.preco, fxRef = ref["BRL=X"], ibovRef = ref["^BVSP"];
  if (!fxAgora || !fxRef || !ibovRef) return json({ erro: "faltou cambio ou Ibovespa de referencia" }, 409);

  const varPct = (s: string) => {
    const p = precos[s]?.preco, r = ref[s];
    if (!p || !r) return null;
    if (idadeMin(precos[s]?.em) > MAX_IDADE_MIN) return null;
    return r2((p / r - 1) * 100);
  };

  // ---- cesta: so entra quem tem cotacao recente ----
  const cesta = (ativos ?? []).filter((x: any) => x.papel === "cesta");
  let somaPeso = 0, somaPond = 0;
  const comp: any[] = []; const velhos: string[] = []; const semDado: string[] = [];
  for (const a of cesta) {
    const p = precos[a.symbol]?.preco, pr = ref[a.symbol];
    if (!p || !pr) { semDado.push(a.symbol); continue; }
    const id = idadeMin(precos[a.symbol]?.em);
    if (id > MAX_IDADE_MIN) { velhos.push(a.symbol); continue; }
    const r = (p * fxAgora) / (pr * fxRef) - 1;
    somaPeso += Number(a.peso); somaPond += Number(a.peso) * r;
    comp.push({ symbol: a.symbol, peso: Number(a.peso), retorno_pct: r2(r * 100, 4), idade_min: Math.round(id) });
  }
  const pesoTotal = cesta.reduce((s: number, x: any) => s + Number(x.peso), 0);
  const cobertura = pesoTotal ? (somaPeso / pesoTotal) * 100 : 0;
  const rIbov = somaPeso ? somaPond / somaPeso : null;
  const justoWin = rIbov != null ? ibovRef * (1 + rIbov) : null;

  // ---- guarda 1: checagem EWZ (so com cotacao recente) ----
  let chkOk: boolean | null = null, chkDelta: number | null = null;
  const ewzP = precos["EWZ"]?.preco, ewzR = ref["EWZ"];
  const ewzFresco = ewzP && idadeMin(precos["EWZ"]?.em) <= MAX_IDADE_MIN;
  if (ewzFresco && ewzR && rIbov != null) {
    const rEwz = (ewzP * fxAgora) / (ewzR * fxRef) - 1;
    chkDelta = r2((rEwz - rIbov) * 100);
    chkOk = Math.abs(chkDelta) <= 0.40;
  }

  const nivel = cobertura >= 20 ? 1 : (ewzFresco ? 2 : 3);

  // ---- trio (convencao do Felipe): VIX invertido, petroleo e minerio a favor ----
  const vVix = varPct("^VIX"), vOil = varPct("CL=F");
  // minerio = DCE:I (Dalian), ativo normal: preco agora contra o snapshot das 18:20 (Dalian fechado,
  // pega o fim da sessao noturna). Isento de MAX_IDADE_MIN: fecha 04:00 BRT, leitura e 08:50.
  // Descarta se o ultimo negocio tiver mais de 3 pregoes. TIO=F fica so como reserva inativa.
  const dce = precos["DCE:I"], dceRef = ref["DCE:I"];
  const minFresco = !!(dce?.preco && dceRef && dce?.em && pregoesDesde(dce.em) <= 3);
  const vMin = minFresco ? r2((dce.preco / dceRef - 1) * 100) : null;
  const minEm = minFresco ? dce.em : null;
  const minSuspeito = vMin != null && Math.abs(vMin) > 5;  // acima do limite diario de oscilacao da DCE
  const trio = (vVix != null ? -vVix : 0) + (vOil ?? 0) + (vMin ?? 0);
  const trioCompleto = vVix != null && vOil != null && vMin != null;

  const vixP = precos["^VIX"]?.preco, vix3P = precos["^VIX3M"]?.preco;
  const vixRatio = vixP && vix3P ? r2(vixP / vix3P, 4) : null;

  const mapa: any = {};
  for (const a of (ativos ?? []).filter((x: any) => x.papel === "mapa")) {
    const p = precos[a.symbol]?.preco, r = ref[a.symbol];
    if (p && r) mapa[a.regiao] = r2((p / r - 1) * 100);  // mapa aceita bolsa fechada
  }
  if (rIbov != null) mapa.brasil = r2(rIbov * 100);
  const esVar = mapa.eua ?? null;
  const origemWin = rIbov == null || esVar == null ? "indeterminado"
    : Math.abs(rIbov * 100 - esVar) > 0.25 ? "local" : "global";

  const vFx = r2((fxAgora / fxRef - 1) * 100);
  const vDxy = varPct("DX-Y.NYB");
  const origemWdo = vDxy == null ? "indeterminado" : Math.abs(vFx - vDxy) > 0.15 ? "local" : "global";

  const { data: evs } = await db.from("macro_calendario")
    .select("nome, estrelas, hora_brt").eq("data", hoje)
    .order("estrelas", { ascending: false }).limit(1);
  const ev = evs?.[0] ?? null;

  const idades = comp.map((c) => c.idade_min);
  const idade = idades.length ? Math.round(Math.max(...idades) * 60) : null;

  // ^BVSP so vale como mercado se for de hoje e da sessao a vista (>= 10:00 BRT)
  let mercadoWin: number | null = null;
  const ibovEm = precos["^BVSP"]?.em ? new Date(precos["^BVSP"].em) : null;
  if (ibovEm) {
    const brt = new Date(ibovEm.getTime() - 3 * 3600 * 1000);
    if (brt.toISOString().slice(0, 10) === hoje && (brt.getUTCHours() * 60 + brt.getUTCMinutes()) >= 600) {
      mercadoWin = precos["^BVSP"].preco;
    }
  }

  const base = {
    data_pregao: hoje, nivel, checagem_ok: chkOk, checagem_delta: chkDelta,
    score_trio: r2(trio), mapa_global: mapa,
    evento: ev?.nome ?? null, evento_estrelas: ev?.estrelas ?? null,
    idade_dado_seg: idade,
  };

  const leituras = [
    { ...base, instrumento: "WIN", origem: origemWin, justo: justoWin,
      cobertura_pct: r2(cobertura, 2),
      variacao_pct: rIbov != null ? r2(rIbov * 100, 4) : null,
      mercado: mercadoWin,
      gap: justoWin && mercadoWin ? r2(mercadoWin - justoWin, 1) : null,
      componentes: { cesta: comp, descartados_velhos: velhos, sem_dado: semDado,
                     vix_ratio: vixRatio, trio: { vix: vVix, petroleo: vOil, minerio: vMin, completo: trioCompleto,
                                                  minerio_em: minEm, minerio_suspeito: minSuspeito,
                                                  minerio_fonte: minFresco ? dce.fonte : null,
                                                  minerio_conferencia_pct: minFresco ? dce.conferencia_pct : null },
                     falhas } },
    { ...base, instrumento: "WDO", origem: origemWdo, justo: r2(fxAgora * 1000, 1),
      cobertura_pct: null, checagem_ok: null, checagem_delta: null,
      variacao_pct: vFx, mercado: null, gap: null,
      componentes: { usdbrl_pct: vFx, dxy_pct: vDxy, usdmxn_pct: varPct("MXN=X"), vix_ratio: vixRatio } },
  ];

  const { error: eI } = await db.from("macro_leitura").insert(leituras);
  if (eI) return json({ erro: eI.message }, 500);

  return json({
    ok: true, nivel, cobertura: r2(cobertura, 1), justo_win: justoWin, mercado_win: mercadoWin,
    justo_wdo: r2(fxAgora * 1000, 1), variacao_win_pct: rIbov != null ? r2(rIbov * 100, 3) : null,
    score_trio: r2(trio, 2), trio_completo: trioCompleto, trio: { vix: vVix, petroleo: vOil, minerio: vMin },
    vix_ratio: vixRatio, mapa, descartados_velhos: velhos, sem_dado: semDado, falhas,
  });
});
