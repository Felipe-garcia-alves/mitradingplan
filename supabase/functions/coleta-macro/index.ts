import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const MAX_IDADE_MIN = 30; // cotacao mais velha que isso nao conta como informacao de agora
// barras diarias: isentas de MAX_IDADE_MIN, regra propria em pregoesDesde (max 3 pregoes)
const DIARIOS = new Set(["TIO=F"]);

// ATENCAO: meta.chartPreviousClose NAO serve como base antes da abertura americana.
// No pre-mercado ele ainda aponta para o fechamento de DOIS pregoes atras e so rola quando
// o mercado regular abre (10:30 BRT) — ou seja, errado exatamente na janela das 08h55.
// Medido em 15/10/2026 as 08:35: VIX chartPreviousClose=15,27 (fechamento de 13/10) enquanto
// o fechamento real de 14/10 era 16,87. Dava +15,1% no lugar de +4,2%, inflando TODAS as pernas.
// A base correta vem da serie diaria: o ultimo fechamento cujo dia em Nova York ja terminou.
async function yahoo(symbol: string) {
  const base = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const h = { headers: { "User-Agent": UA, "Accept": "application/json" } };
  const [rIntra, rDia] = await Promise.all([
    fetch(`${base}?interval=1m&range=1d&includePrePost=true`, h),
    fetch(`${base}?interval=1d&range=7d`, h),
  ]);
  if (!rIntra.ok) throw new Error(`${symbol}: HTTP ${rIntra.status}`);
  const res = (await rIntra.json())?.chart?.result?.[0];
  if (!res) throw new Error(`${symbol}: sem resultado`);

  const closes = res.indicators?.quote?.[0]?.close ?? [];
  const stamps = res.timestamp ?? [];
  let preco: number | null = null, em: number | null = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { preco = closes[i]; em = stamps[i]; break; }
  }
  if (preco == null) { preco = res.meta?.regularMarketPrice ?? null; em = res.meta?.regularMarketTime ?? null; }

  let fech: number | null = null;
  if (rDia.ok) {
    const d = (await rDia.json())?.chart?.result?.[0];
    const dc = d?.indicators?.quote?.[0]?.close ?? [];
    const dt = d?.timestamp ?? [];
    const hoje = hojeNY();
    for (let i = dc.length - 1; i >= 0; i--) {
      if (dc[i] == null) continue;
      if (new Date(dt[i] * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) < hoje) {
        fech = dc[i]; break;
      }
    }
  }
  // so cai no meta se a serie diaria falhar; depois da abertura americana ele ja esta correto
  if (fech == null) fech = res.meta?.chartPreviousClose ?? res.meta?.previousClose ?? null;

  const per = res.meta?.currentTradingPeriod?.regular;
  const agora = Math.floor(Date.now() / 1000);
  return { preco, fech, em: em ? new Date(em * 1000).toISOString() : null, preMarket: !!(per && agora < per.start) };
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
    fech: idx[1] != null ? closes[idx[1]] : null,
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
    return { preco: ult, fech: ajAnt > 0 ? ajAnt : null, em, preMarket: false, fonte: "sina",
             conferencia_pct: ajAnt > 0 ? r2((ult / ajAnt - 1) * 100) : null };
  } catch (_) { /* cai para o East Money */ }
  const r = await fetch("https://push2.eastmoney.com/api/qt/stock/get?secid=114.im&fields=f43,f59,f86,f170",
    { headers: { "User-Agent": UA }, signal: t() });
  if (!r.ok) throw new Error(`DCE:I: eastmoney HTTP ${r.status}`);
  const d = (await r.json())?.data;
  if (!d || !(d.f43 > 0) || !d.f86) throw new Error("DCE:I: sina e eastmoney sem dado");
  const p = d.f43 / 10 ** (d.f59 ?? 1);
  const v = d.f170 != null ? d.f170 / 100 : null;
  return { preco: p, fech: v != null && v !== -100 ? p / (1 + v / 100) : null,
           em: new Date(d.f86 * 1000).toISOString(), preMarket: false,
           fonte: "eastmoney", conferencia_pct: v };
}

// O continuo CL=F do Yahoo MISTURA CONTRATOS durante a rolagem mensal do WTI.
// Medido em 15/10/2026 08:50: shortName "Crude Oil Nov 26", fechamento anterior 95,09 (novembro),
// mas o preco intradia 94,07 era o de DEZEMBRO. Dava -1,07% quando o TradingView mostrava +0,12%:
// a "variacao" era o spread entre os dois vencimentos, nao movimento de petroleo.
// ES=F, NQ=F e YM=F nao tem esse defeito (conferidos contra ESZ26/NQZ26/YMZ26, batem exatamente).
// Solucao sem manutencao: o proprio meta.shortName diz qual e o contrato da frente — le e busca
// o vencimento explicito, que e o mesmo que o CL1! do TradingView acompanha.
const MES_FUT: Record<string, string> = { jan:"F", feb:"G", mar:"H", apr:"J", may:"K", jun:"M",
                                          jul:"N", aug:"Q", sep:"U", oct:"V", nov:"X", dec:"Z" };
async function contratoPetroleo(): Promise<string> {
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/CL%3DF?interval=1d&range=1d",
      { headers: { "User-Agent": UA, "Accept": "application/json" } });
    if (!r.ok) return "CL=F";
    const nome = (await r.json())?.chart?.result?.[0]?.meta?.shortName ?? "";
    const m = /Crude Oil\s+([A-Za-z]{3})\s+(\d{2})/.exec(nome);
    const cod = m ? MES_FUT[m[1].toLowerCase()] : null;
    return cod ? `CL${cod}${m![2]}.NYM` : "CL=F";
  } catch { return "CL=F"; }
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

// ---------------------------------------------------------------------------
// VIES DA ABERTURA
// Rota decidida pelo calendario: evento 3 estrelas, do Brasil, as 09:00 em ponto.
// Sem notícia -> (-VIX) + FEF2! + CL1!. Com notícia -> soma das 6 ADRs.
// Base do percentual: fechamento anterior do proprio ativo (coluna Chg% do TradingView).
// Classificacao feita sobre o valor JA arredondado em 1 casa: o que aparece na tela e o que decide.
// ---------------------------------------------------------------------------
const diaNY = (iso: string | null) =>
  iso == null ? null : new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const hojeNY = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

function classificar(resultado: number) {
  const m = Math.abs(resultado);
  if (m < 1.5) return { direcao: "lateral", intensidade: "Lateral" };
  return {
    direcao: resultado > 0 ? "positiva" : "negativa",
    intensidade: m < 2.5 ? "Fraca" : m < 4.5 ? "Moderada" : "Forte",
  };
}

// Janela de registro: ate 08:59 BRT. Das 09:00 em diante o vies do dia esta CONGELADO.
// O cron macro-pregao coleta a cada 5 min ate as 18h; sem esta guarda ele reescreveria a
// leitura da abertura com cotacoes da tarde, e o log perderia a unica coisa que importa nele.
function janelaDeRegistroAberta() {
  const brt = new Date(Date.now() - 3 * 3600 * 1000);
  return brt.getUTCHours() * 60 + brt.getUTCMinutes() < 9 * 60;
}

async function calcularVies(db: any, precos: Record<string, any>, hoje: string) {
  if (!janelaDeRegistroAberta()) {
    const { data: reg } = await db.from("macro_vies")
      .select("rota, resultado, direcao, intensidade, completo").eq("data_pregao", hoje).maybeSingle();
    return { congelado: true, gravado: false, registrado: reg ?? null };
  }
  const { data: cesta } = await db.from("macro_vies_cesta")
    .select("symbol, rota, sinal, entrada, rotulo, ordem").is("valido_ate", null).order("ordem");
  if (!cesta?.length) throw new Error("macro_vies_cesta vazia");

  // Os tres criterios juntos. hora_brt exatamente 09:00, pais Brasil, 3 estrelas.
  const { data: evs } = await db.from("macro_calendario")
    .select("nome, estrelas, hora_brt, pais").eq("data", hoje).gte("estrelas", 3);
  const ev = (evs ?? []).find((e: any) =>
    String(e.hora_brt ?? "").slice(0, 5) === "09:00" &&
    ["br", "brasil", "brazil"].includes(String(e.pais ?? "").trim().toLowerCase()));
  const temNoticia = !!ev;
  const rota = temNoticia ? "adr" : "macro";

  // Um valor manual ja digitado hoje nao pode ser perdido numa recoleta.
  const { data: ant } = await db.from("macro_vies")
    .select("fef2_manual, pernas").eq("data_pregao", hoje).maybeSingle();
  const manuais: Record<string, number | null> = { "FEF2!": ant?.fef2_manual ?? null };

  const montar = (qualRota: string) =>
    cesta.filter((x: any) => x.rota === qualRota).map((c: any) => {
      if (c.entrada === "manual") {
        const v = manuais[c.symbol];
        return { symbol: c.symbol, rotulo: c.rotulo, sinal: c.sinal, entrada: "manual",
                 pct: v, contribuicao: v == null ? null : r2(c.sinal * v, 2),
                 preco_em: null, parado: false, ausente: v == null };
      }
      const q = precos[c.symbol];
      const pct = q?.preco != null && q?.fech ? r2((q.preco / q.fech - 1) * 100, 2) : null;
      // Sem negocio no pre: a ultima cotacao ainda e de um pregao anterior em Nova York.
      const parado = pct != null && pct === 0 && diaNY(q?.em) !== hojeNY();
      return { symbol: c.symbol, rotulo: c.rotulo, sinal: c.sinal, entrada: "auto",
               pct, contribuicao: pct == null ? null : r2(c.sinal * pct, 2),
               preco_em: q?.em ?? null, parado, ausente: pct == null };
    });

  const fechar = (ps: any[]) => {
    const resultado = Math.round(ps.reduce((t, p) => t + (p.contribuicao ?? 0), 0) * 10) / 10;
    return { pernas: ps, resultado, ...classificar(resultado),
             completo: ps.every((p) => !p.ausente && !p.parado) };
  };

  const pernas = montar(rota);
  const { resultado, direcao, intensidade, completo } = fechar(pernas);

  // A outra rota, so para consulta na tela. Nunca e o vies do dia.
  const outra = rota === "macro" ? "adr" : "macro";
  const alt = fechar(montar(outra));
  const alternativa = { rota: outra, resultado: alt.resultado, direcao: alt.direcao,
                        intensidade: alt.intensidade, completo: alt.completo, pernas: alt.pernas };

  // Contexto overnight: so leitura de ambiente, nao entra na conta. Mesma base de percentual.
  // Futuros, nao indices a vista: as 08h55 a bolsa americana esta fechada e o indice a vista
  // so repetiria o fechamento de ontem. O futuro negocia a noite inteira.
  const CTX: [string, string, string][] = [
    ["ES=F", "ES=F", "S&P 500 futuro"],
    ["YM=F", "YM=F", "Dow futuro"],
    ["NQ=F", "NQ=F", "Nasdaq futuro"],
    // DX=F nao existe no Yahoo. O indice da ICE negocia desde 01:00 BRT e cobre a janela das 08h55.
    ["DX-Y.NYB", "DXY", "Dólar index"],
    ["EWZ",  "EWZ",  "ETF Brasil · NYSE"],
  ];
  const contexto = CTX.map(([sym, rotulo, nome]) => {
    const q = precos[sym];
    return {
      symbol: sym, rotulo, nome,
      pct: q?.preco != null && q?.fech ? r2((q.preco / q.fech - 1) * 100, 2) : null,
      em: q?.em ?? null,
    };
  });

  const linha = {
    data_pregao: hoje, rota, tem_noticia: temNoticia,
    evento_nome: ev?.nome ?? null, evento_hora: ev?.hora_brt ?? null,
    resultado, direcao, intensidade, pernas, contexto, alternativa,
    fef2_manual: manuais["FEF2!"], completo, atualizado_em: new Date().toISOString(),
  };
  const { error } = await db.from("macro_vies").upsert(linha, { onConflict: "data_pregao" });
  if (error) throw new Error(error.message);
  return { rota, tem_noticia: temNoticia, resultado, direcao, intensidade, completo,
           pernas: pernas.map((p) => ({ [p.rotulo]: p.contribuicao })) };
}

Deno.serve(async (req) => {
  // Prefere a secret key nova; cai para a legada enquanto ela existir.
  // Quando as chaves legadas forem desativadas, SB_SECRET_KEY assume sozinha.
  const SB_KEY = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SB_KEY) throw new Error("Defina SB_SECRET_KEY nos secrets da function.");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, SB_KEY);
  const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

  const tok = req.headers.get("x-macro-token");
  const { data: cfg } = await db.from("macro_config").select("valor").eq("chave", "token_coleta").maybeSingle();
  if (!tok || !cfg?.valor || tok !== cfg.valor) return json({ erro: "nao autorizado" }, 401);

  const modo = new URL(req.url).searchParams.get("modo") ?? "leitura";

  const { data: ativos, error: eA } = await db
    .from("macro_assets").select("*").eq("ativo", true).is("valido_ate", null);
  if (eA) return json({ erro: eA.message }, 500);

  // o petroleo e buscado no vencimento explicito, mas continua gravado como CL=F
  const simPetroleo = (ativos ?? []).some((a: any) => a.symbol === "CL=F")
    ? await contratoPetroleo() : "CL=F";

  const buscas = await Promise.allSettled((ativos ?? []).map(async (a: any) =>
    ({ a, q: await (a.symbol === "DCE:I" ? dalian()
                  : DIARIOS.has(a.symbol) ? yahooDiario(a.symbol)
                  : yahoo(a.symbol === "CL=F" ? simPetroleo : a.symbol)) })));
  const precos: Record<string, any> = {}; const linhas: any[] = []; const falhas: string[] = [];
  for (let i = 0; i < buscas.length; i++) {
    const b = buscas[i];
    if (b.status !== "fulfilled" || b.value.q.preco == null) { falhas.push((ativos ?? [])[i]?.symbol ?? "?"); continue; }
    const { a, q } = b.value;
    precos[a.symbol] = q;
    linhas.push({ symbol: a.symbol, preco: q.preco, fech: (q as any).fech ?? null,
                  preco_em: q.em, pre_market: q.preMarket });
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

  // O vies e independente do implied open: se ele falhar, a leitura antiga continua gravando.
  let vies: unknown = null, viesErro: string | null = null;
  try { vies = await calcularVies(db, precos, hoje); }
  catch (e) { viesErro = e instanceof Error ? e.message : String(e); }

  const { data: refUlt } = await db.from("macro_referencia")
    .select("data_captura").order("data_captura", { ascending: false }).limit(1);
  if (!refUlt?.length) return json({ erro: "sem referencia gravada ainda", vies, vies_erro: viesErro }, 409);
  const { data: refs } = await db.from("macro_referencia")
    .select("symbol, preco").eq("data_captura", refUlt[0].data_captura);
  const ref: Record<string, number> = {};
  for (const r of refs ?? []) ref[r.symbol] = Number(r.preco);

  const fxAgora = precos["BRL=X"]?.preco, fxRef = ref["BRL=X"], ibovRef = ref["^BVSP"];
  if (!fxAgora || !fxRef || !ibovRef) return json({ erro: "faltou cambio ou Ibovespa de referencia", vies, vies_erro: viesErro }, 409);

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
  if (eI) return json({ erro: eI.message, vies, vies_erro: viesErro }, 500);

  return json({
    ok: true, vies, vies_erro: viesErro, contrato_petroleo: simPetroleo,
    nivel, cobertura: r2(cobertura, 1), justo_win: justoWin, mercado_win: mercadoWin,
    justo_wdo: r2(fxAgora * 1000, 1), variacao_win_pct: rIbov != null ? r2(rIbov * 100, 3) : null,
    score_trio: r2(trio, 2), trio_completo: trioCompleto, trio: { vix: vVix, petroleo: vOil, minerio: vMin },
    vix_ratio: vixRatio, mapa, descartados_velhos: velhos, sem_dado: semDado, falhas,
  });
});
