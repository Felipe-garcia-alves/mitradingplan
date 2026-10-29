// Mi Trading Plan - componentes visuais reutilizáveis (números, anéis, gráficos)
import { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { fmtMoeda, corValor } from "../lib/moedas";
import { alfa } from "../lib/cor.js";

const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function fmtDia(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d||"")) return d||"";
  return (+d.slice(8))+" "+MESES[+d.slice(5,7)-1];
}

// R$ compacto para eixos: R$5k, -R$1,2k, R$800
function fmtK(v, cur="R$") {
  const a = Math.abs(v);
  const s = a>=1000 ? (a/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})+"k" : a.toLocaleString("pt-BR",{maximumFractionDigits:0});
  return (v<0?"-":"")+cur+s;
}

// Largura real do elemento (para desenhar gráficos em pixels, com texto nítido)
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Escala "bonita" para o eixo Y
function spacedIdx(n, xOf, minGap=48) {
  const out = [];
  for (let i=0; i<n; i++) {
    const last = out[out.length-1];
    if (last===undefined || xOf(i)-xOf(last) >= minGap) out.push(i);
  }
  if (n>1 && out[out.length-1]!==n-1) { if (xOf(n-1)-xOf(out[out.length-1]) < minGap) out.pop(); out.push(n-1); }
  return out;
}

function niceTicks(min, max, count=5) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max-min)/(count-1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw) || 10*mag;
  const lo = Math.floor(min/step)*step, hi = Math.ceil(max/step)*step;
  const ticks = [];
  for (let v=lo; v<=hi+step/2; v+=step) ticks.push(Math.round(v*100)/100);
  return ticks;
}

// ── Número que conta até o valor ─────────────────────────────────
export function CountUp({ value, format, duration=900 }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const a = from.current, b = value, start = performance.now();
    let raf;
    const tick = t => {
      const p = reduz ? 1 : Math.min(1, (t-start)/duration);
      const cur = a + (b-a)*(1-Math.pow(1-p,3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return format ? format(v) : Math.round(v);
}

// ── Anel de progresso ────────────────────────────────────────────
export function Ring({ pct, color="var(--accent)", size=54, stroke=5 }) {
  const r = (size-stroke)/2, c = 2*Math.PI*r;
  const p = pct==null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} style={{flexShrink:0,transform:"rotate(-90deg)",overflow:"visible"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c*(1-p/100)}
        style={{transition:"stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)",filter:"drop-shadow(0 0 4px "+color+")"}}/>
    </svg>
  );
}

// ── Mini gráfico de linha (canto do card) ────────────────────────
export function Sparkline({ values, color="var(--accent)", width=90, height=34 }) {
  const id = useId();
  if (!values || values.length < 2) return null;
  const VW = 100, VH = 40;
  const min = Math.min(...values), max = Math.max(...values), rng = max-min || 1;
  const pts = values.map((v,i)=>[(i/(values.length-1))*VW, 3+(1-(v-min)/rng)*(VH-6)]);
  const d = pts.map(([x,y],i)=>(i?"L":"M")+x.toFixed(2)+","+y.toFixed(2)).join(" ");
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" width={width} height={height} style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={d+` L${VW},${VH} L0,${VH} Z`} fill={`url(#${id})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" style={{filter:"drop-shadow(0 0 3px "+color+")"}}/>
    </svg>
  );
}

// ── Tooltip flutuante dos gráficos ───────────────────────────────
function Tip({ x, y, children }) {
  return (
    <div style={{position:"absolute",left:x,top:y,transform:"translate(-50%,calc(-100% - 12px))",pointerEvents:"none",zIndex:5,
      background:"rgba(8,14,11,0.92)",backdropFilter:"blur(8px)",border:"1px solid var(--line-strong)",borderRadius:"10px",
      padding:"8px 11px",whiteSpace:"nowrap",boxShadow:"0 10px 30px color-mix(in srgb, var(--shade) 60%, transparent)",fontFamily:"var(--font-mono)",fontSize:"12px"}}>
      {children}
    </div>
  );
}

const AX = { fill:"var(--text-4)", fontSize:10, fontFamily:"var(--font-mono)" };

// ── Curva de capital com eixos e tooltip ─────────────────────────
// onSelect(de, ate): arrastar na curva escolhe um trecho (dias de "de" até "ate")
export function CapitalChart({ points, height=210, onSelect }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const [arraste, setArraste] = useState(null); // { a, b } índices do início e do fim do arraste
  const id = useId();
  const PL=56, PR=12, PT=12, PB=26, H=height;

  if (points.length < 2) {
    return <div ref={ref} style={{height,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"var(--text-3)",fontSize:"12px"}}>Registre operações para ver o gráfico</p></div>;
  }

  const vals = points.map(p=>p.val);
  const ticks = niceTicks(Math.min(0,...vals), Math.max(0,...vals));
  const lo = ticks[0], hi = ticks[ticks.length-1];
  const n = points.length;
  const iw = Math.max(1, w-PL-PR);
  const x = i => PL + (i/(n-1))*iw;
  const y = v => PT + (1-(v-lo)/(hi-lo))*(H-PT-PB);
  const last = vals[n-1];
  const cor = last>=0 ? "var(--accent)" : "var(--neg)";
  const path = points.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(p.val).toFixed(1)).join(" ");
  const area = path+` L${x(n-1).toFixed(1)},${y(0).toFixed(1)} L${PL},${y(0).toFixed(1)} Z`;
  const labelIdx = spacedIdx(n, x, 56);

  const indice = e => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(n-1, Math.round(((e.clientX-r.left-PL)/iw)*(n-1))));
  };
  const onMove = e => {
    const i = indice(e);
    setHover(i);
    if (arraste) setArraste({ ...arraste, b:i });
  };
  const onDown = e => {
    if (!onSelect || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = indice(e);
    setArraste({ a:i, b:i });
  };
  const onUp = () => {
    if (!arraste) return;
    const a = Math.min(arraste.a, arraste.b), b = Math.max(arraste.a, arraste.b);
    setArraste(null);
    // o ponto "a" é o fechamento do dia anterior ao trecho: o trecho começa no seguinte
    if (b > a) onSelect(points[a+1].d, points[b].d);
  };
  const sa = arraste && arraste.a!==arraste.b ? Math.min(arraste.a, arraste.b) : null;
  const sb = sa!=null ? Math.max(arraste.a, arraste.b) : null;
  const hp = hover!=null && sa==null ? points[hover] : null;

  return (
    <div ref={ref} style={{position:"relative",width:"100%",height:H}}>
      {w>0 && (
        <svg width={w} height={H} style={{display:"block",cursor:onSelect?"col-resize":"crosshair",touchAction:onSelect?"pan-y":"auto",userSelect:"none"}}
          onPointerMove={onMove} onPointerLeave={()=>{ if(!arraste) setHover(null); }} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={()=>setArraste(null)}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity="0.30"/>
              <stop offset="100%" stopColor={cor} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {ticks.map(t=>(
            <g key={t}>
              <line x1={PL} x2={w-PR} y1={y(t)} y2={y(t)} stroke={t===0?"color-mix(in srgb, var(--ink) 13.3%, transparent)":"color-mix(in srgb, var(--ink) 3.9%, transparent)"} strokeDasharray={t===0?"4,4":"none"}/>
              <text x={PL-8} y={y(t)+3} textAnchor="end" {...AX}>{fmtK(t)}</text>
            </g>
          ))}
          {labelIdx.map(i=>(
            <text key={i} x={x(i)} y={H-6} textAnchor={i===0?"start":i===n-1?"end":"middle"} {...AX}>{fmtDia(points[i].d)}</text>
          ))}
          <path d={area} fill={`url(#${id})`}/>
          <path d={path} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{filter:"drop-shadow(0 0 6px "+alfa(cor,"88")+")"}}/>
          {hp && <>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H-PB} stroke="color-mix(in srgb, var(--ink) 18.8%, transparent)" strokeDasharray="3,3"/>
            <circle cx={x(hover)} cy={y(hp.val)} r="4.5" fill={cor} stroke="var(--bg)" strokeWidth="2"/>
          </>}
          {sa!=null && <>
            <rect x={x(sa)} y={PT} width={x(sb)-x(sa)} height={H-PT-PB} fill="color-mix(in srgb, var(--ink) 6%, transparent)" stroke="color-mix(in srgb, var(--ink) 18%, transparent)" strokeDasharray="3,3"/>
            <circle cx={x(sa)} cy={y(vals[sa])} r="4" fill={cor} stroke="var(--bg)" strokeWidth="2"/>
            <circle cx={x(sb)} cy={y(vals[sb])} r="4" fill={cor} stroke="var(--bg)" strokeWidth="2"/>
          </>}
        </svg>
      )}
      {sa!=null && (()=>{
        const dv = vals[sb]-vals[sa];
        return (
          <Tip x={(x(sa)+x(sb))/2} y={PT+8}>
            <div style={{color:"var(--text-3)",fontSize:"10.5px",marginBottom:"2px"}}>{fmtDia(points[sa+1].d)} → {fmtDia(points[sb].d)} · {sb-sa} dia{sb-sa!==1?"s":""}</div>
            <div style={{color:dv>=0?"var(--accent)":"var(--neg)",fontWeight:700}}>{dv>=0?"+":""}R$ {dv.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            <div style={{color:"var(--text-4)",fontSize:"10px"}}>solte para filtrar</div>
          </Tip>
        );
      })()}
      {hp && (
        <Tip x={x(hover)} y={y(hp.val)}>
          <div style={{color:"var(--text-3)",fontSize:"10.5px",marginBottom:"2px"}}>{fmtDia(hp.d)}</div>
          <div style={{color:hp.val>=0?"var(--accent)":"var(--neg)",fontWeight:700}}>{hp.val>=0?"+":""}R$ {hp.val.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
        </Tip>
      )}
    </div>
  );
}

// ── Resultado diário em barras, com médias e tooltip ─────────────
export function DailyBars({ bars, height=210, onBarClick }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const id = useId();
  const PL=56, PR=12, PT=12, PB=26, H=height;

  if (bars.length === 0) {
    return <div ref={ref} style={{height,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"var(--text-3)",fontSize:"12px"}}>Sem dados no período</p></div>;
  }

  const vals = bars.map(b=>b.val);
  const ticks = niceTicks(Math.min(0,...vals), Math.max(0,...vals));
  const lo = ticks[0], hi = ticks[ticks.length-1];
  const n = bars.length;
  const iw = Math.max(1, w-PL-PR);
  const slot = iw/n;
  const bw = Math.max(2, Math.min(24, slot*0.68));
  const cx = i => PL + slot*i + slot/2;
  const y = v => PT + (1-(v-lo)/(hi-lo))*(H-PT-PB);
  const pos = vals.filter(v=>v>0), neg = vals.filter(v=>v<0);
  const mPos = pos.length ? pos.reduce((a,b)=>a+b,0)/pos.length : null;
  const mNeg = neg.length ? neg.reduce((a,b)=>a+b,0)/neg.length : null;
  const labelIdx = spacedIdx(n, cx, 56);

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX-r.left-PL)/slot);
    setHover(i>=0 && i<n ? i : null);
  };
  const hb = hover!=null ? bars[hover] : null;

  return (
    <div ref={ref} style={{position:"relative",width:"100%",height:H}}>
      {w>0 && (
        <svg width={w} height={H} style={{display:"block",cursor:onBarClick&&hover!=null?"pointer":"default"}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)} onClick={e=>{ if(!onBarClick) return; const r=e.currentTarget.getBoundingClientRect(); const i=Math.floor((e.clientX-r.left-PL)/slot); if(i>=0&&i<n) onBarClick(bars[i]); }}>
          <defs>
            <linearGradient id={id+"p"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)"/><stop offset="100%" stopColor="var(--accent-deep)"/></linearGradient>
            <linearGradient id={id+"n"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--neg)"/><stop offset="100%" stopColor="var(--neg)"/></linearGradient>
          </defs>
          {ticks.map(t=>(
            <g key={t}>
              <line x1={PL} x2={w-PR} y1={y(t)} y2={y(t)} stroke={t===0?"color-mix(in srgb, var(--ink) 13.3%, transparent)":"color-mix(in srgb, var(--ink) 3.9%, transparent)"}/>
              <text x={PL-8} y={y(t)+3} textAnchor="end" {...AX}>{fmtK(t)}</text>
            </g>
          ))}
          {labelIdx.map(i=>(
            <text key={i} x={cx(i)} y={H-6} textAnchor={i===0?"start":i===n-1?"end":"middle"} {...AX}>{fmtDia(bars[i].d)}</text>
          ))}
          {bars.map((b,i)=>{
            const top = y(Math.max(0,b.val)), bot = y(Math.min(0,b.val));
            const ativo = hover===i;
            return (
              <rect key={i} x={cx(i)-bw/2} y={top} width={bw} height={Math.max(1.5,bot-top)} rx={Math.min(3,bw/3)}
                fill={b.val>=0?`url(#${id}p)`:`url(#${id}n)`}
                opacity={hover==null||ativo?1:0.45}
                style={{transition:"opacity .2s",filter:ativo?"drop-shadow(0 0 6px "+(b.val>=0?"var(--accent)":"var(--neg)")+")":"none"}}/>
            );
          })}
          {mPos!==null && <>
            <line x1={PL} x2={w-PR} y1={y(mPos)} y2={y(mPos)} stroke="var(--accent)" strokeOpacity="0.55" strokeDasharray="4,4"/>
            <text x={w-PR} y={y(mPos)-5} textAnchor="end" fill="var(--accent)" fontSize="10" fontFamily="var(--font-mono)" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">média {fmtK(mPos)}</text>
          </>}
          {mNeg!==null && <>
            <line x1={PL} x2={w-PR} y1={y(mNeg)} y2={y(mNeg)} stroke="var(--neg)" strokeOpacity="0.55" strokeDasharray="4,4"/>
            <text x={w-PR} y={y(mNeg)+13} textAnchor="end" fill="var(--neg)" fontSize="10" fontFamily="var(--font-mono)" stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">média {fmtK(mNeg)}</text>
          </>}
        </svg>
      )}
      {hb && (
        <Tip x={cx(hover)} y={y(Math.max(0,hb.val))}>
          <div style={{color:"var(--text-3)",fontSize:"10.5px",marginBottom:"2px"}}>{fmtDia(hb.d)}</div>
          <div style={{color:hb.val>=0?"var(--accent)":"var(--neg)",fontWeight:700}}>{hb.val>=0?"+":""}R$ {hb.val.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
          {hb.pts!=null && <div style={{color:"var(--text-2)",fontSize:"11px"}}>{hb.pts>=0?"+":""}{(+hb.pts).toFixed(1)} pts</div>}
        </Tip>
      )}
    </div>
  );
}

// ── Modal (vidro, abre com escala; Esc ou clique fora fecha) ─────
export function Modal({ onClose, children, width=720 }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fn); document.body.style.overflow = prev; };
  }, [onClose]);
  return createPortal(
    <div className="mtp-modal-backdrop" onClick={onClose}>
      <div className="mtp-modal" style={{maxWidth:width}} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body
  );
}

// ── Histórico real | projeção futura, divididos em "hoje" ────────
export function ProjectionChart({ real, proj, base, color="var(--accent)", cur="R$", height=290 }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const id = useId();
  const PL=60, PR=16, PT=16, PB=28, H=height;
  const iw = Math.max(1, w-PL-PR);
  const temReal = real.length > 1;
  const split = temReal ? 0.5 : 0;
  const xs = PL + iw*split;
  const xR = i => PL + (i/Math.max(1, real.length-1))*(xs-PL);
  const xP = i => xs + (i/Math.max(1, proj.length-1))*(PL+iw-xs);

  const vals = [...real.map(p=>p.val), ...proj.map(p=>p.val), base];
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const lo = ticks[0], hi = ticks[ticks.length-1];
  const y = v => PT + (1-(v-lo)/(hi-lo))*(H-PT-PB);

  const realPath = real.map((p,i)=>(i?"L":"M")+xR(i).toFixed(1)+","+y(p.val).toFixed(1)).join(" ");
  const area = temReal ? realPath+` L${xR(real.length-1).toFixed(1)},${H-PB} L${PL},${H-PB} Z` : "";
  const projPath = proj.map((p,i)=>(i?"L":"M")+xP(i).toFixed(1)+","+y(p.val).toFixed(1)).join(" ");
  const realLabels = temReal ? spacedIdx(real.length, xR, 64).filter(i => i===0 || xs-xR(i) >= 40) : [];
  const projLabels = spacedIdx(proj.length, xP, 40).filter(i=>i>0);
  const fmtCur = v => cur+" "+v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    if (temReal && mx < xs) {
      const i = Math.round(((mx-PL)/Math.max(1,xs-PL))*(real.length-1));
      setHover({ lado:"r", i:Math.max(0, Math.min(real.length-1, i)) });
    } else {
      const i = Math.round(((mx-xs)/Math.max(1,PL+iw-xs))*(proj.length-1));
      setHover({ lado:"p", i:Math.max(0, Math.min(proj.length-1, i)) });
    }
  };
  const hp = hover ? (hover.lado==="r" ? real[hover.i] : proj[hover.i]) : null;
  const hx = hover ? (hover.lado==="r" ? xR(hover.i) : xP(hover.i)) : 0;

  return (
    <div ref={ref} style={{position:"relative",width:"100%",height:H}}>
      {w>0 && (
        <svg width={w} height={H} style={{display:"block",cursor:"crosshair"}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {ticks.map(t=>(
            <g key={t}>
              <line x1={PL} x2={w-PR} y1={y(t)} y2={y(t)} stroke="color-mix(in srgb, var(--ink) 3.9%, transparent)"/>
              <text x={PL-8} y={y(t)+3} textAnchor="end" {...AX}>{fmtK(t, cur)}</text>
            </g>
          ))}
          <line x1={PL} x2={w-PR} y1={y(base)} y2={y(base)} stroke="color-mix(in srgb, var(--ink) 14.9%, transparent)" strokeDasharray="2,5"/>
          {temReal && <>
            <rect x={xs} y={PT} width={PL+iw-xs} height={H-PT-PB} fill="color-mix(in srgb, var(--ink) 1.6%, transparent)"/>
            <line x1={xs} x2={xs} y1={PT} y2={H-PB} stroke="color-mix(in srgb, var(--ink) 13.3%, transparent)" strokeDasharray="3,3"/>
            <text x={xs+6} y={PT+11} fill="var(--text-mute)" fontSize="10" fontFamily="var(--font-mono)">hoje →</text>
          </>}
          {realLabels.map(i=>(
            <text key={"r"+i} x={xR(i)} y={H-8} textAnchor={i===0?"start":"middle"} {...AX}>{fmtDia(real[i].d)}</text>
          ))}
          {projLabels.map(i=>(
            <text key={"p"+i} x={xP(i)} y={H-8} textAnchor={i===proj.length-1?"end":"middle"} {...AX}>{proj[i].label}</text>
          ))}
          {temReal && <path d={area} fill={`url(#${id})`}/>}
          <path d={projPath} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="1.8" strokeDasharray="6,5" strokeLinejoin="round"/>
          {proj.length>0 && <circle cx={xP(proj.length-1)} cy={y(proj[proj.length-1].val)} r="3.5" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.5"/>}
          {temReal && <path d={realPath} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{filter:"drop-shadow(0 0 6px "+alfa(color,"88")+")"}}/>}
          {temReal && <circle cx={xR(real.length-1)} cy={y(real[real.length-1].val)} r="4" fill={color} stroke="var(--bg)" strokeWidth="2"/>}
          {hp && <>
            <line x1={hx} x2={hx} y1={PT} y2={H-PB} stroke="color-mix(in srgb, var(--ink) 18.8%, transparent)" strokeDasharray="3,3"/>
            <circle cx={hx} cy={y(hp.val)} r="4.5" fill={hover.lado==="r"?color:"var(--surface)"} stroke={hover.lado==="r"?"var(--bg)":color} strokeWidth="2"/>
          </>}
        </svg>
      )}
      {hp && (
        <Tip x={hx} y={y(hp.val)}>
          <div style={{color:"var(--text-3)",fontSize:"10.5px",marginBottom:"2px"}}>{hover.lado==="r" ? fmtDia(hp.d) : hp.label+" · projeção"}</div>
          <div style={{color:hover.lado==="r"?color:"var(--text)",fontWeight:700}}>{fmtCur(hp.val)}</div>
          <div style={{color:hp.val>=base?"var(--accent)":"var(--neg)",fontSize:"11px"}}>{hp.val>=base?"+":"-"}{fmtCur(Math.abs(hp.val-base))} vs inicial</div>
        </Tip>
      )}
    </div>
  );
}

// ── Popover ancorado (portal, posição fixa; abre p/ cima se não couber) ──
// `rect` = getBoundingClientRect() do gatilho no momento da abertura.
export function Popover({ rect, onClose, children, width, align="left", maxHeight=320, anchorRef }) {
  const ref = useRef(null);
  useEffect(() => {
    const fora = e => {
      if (ref.current?.contains(e.target) || anchorRef?.current?.contains(e.target)) return;
      onClose();
    };
    const tecla = e => { if (e.key === "Escape") onClose(); };
    const rolou = e => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolou, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolou, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, anchorRef]);

  const w = width ?? rect.width;
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = align === "right" ? rect.right - w : rect.left;
  left = Math.max(8, Math.min(left, vw - w - 8));
  const baixo = vh - rect.bottom;
  const paraCima = baixo < Math.min(maxHeight, 220) && rect.top > baixo;
  const pos = paraCima
    ? { bottom: vh - rect.top + 6, maxHeight: Math.min(maxHeight, rect.top - 16) }
    : { top: rect.bottom + 6,      maxHeight: Math.min(maxHeight, baixo - 16) };

  return createPortal(
    <div ref={ref} className={"mtp-pop"+(paraCima?" up":"")} style={{ position:"fixed", left, width:w, minWidth:Math.min(rect.width, w), zIndex:600, ...pos }}>
      {children}
    </div>,
    document.body
  );
}

// ── Select próprio (substitui o <select> nativo) ─────────────────
// options: [{ value, label, cor?, hint? }] ou valores simples
export function Select({ value, onChange, options, placeholder="Selecione", style, title, popWidth, align }) {
  const opts = options.map(o => (o !== null && typeof o === "object") ? o : { value:o, label:String(o) });
  const [rect, setRect] = useState(null);
  const [ativo, setAtivo] = useState(-1);
  const btn = useRef(null);
  const atual = opts.find(o => o.value === value);

  const abrir = () => { setRect(btn.current.getBoundingClientRect()); setAtivo(Math.max(0, opts.findIndex(o => o.value === value))); };
  const fechar = () => setRect(null);
  const escolher = o => { onChange(o.value); fechar(); btn.current?.focus(); };

  const tecla = e => {
    if (!rect) {
      if (["ArrowDown","ArrowUp","Enter"," "].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(i => Math.min(opts.length-1, i+1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(i => Math.max(0, i-1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (opts[ativo]) escolher(opts[ativo]); }
    else if (e.key === "Tab") fechar();
  };

  return (
    <>
      <button ref={btn} type="button" title={title} className={"mtp-select"+(rect?" open":"")} onClick={()=> rect ? fechar() : abrir()} onKeyDown={tecla}
        aria-haspopup="listbox" aria-expanded={!!rect} style={style}>
        <span style={{ display:"flex", alignItems:"center", gap:"8px", minWidth:0, overflow:"hidden" }}>
          {atual?.cor && <i className="mtp-dot" style={{ background:atual.cor }}/>}
          <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color: atual ? undefined : "var(--text-3)" }}>{atual ? atual.label : placeholder}</span>
        </span>
        <svg className="mtp-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {rect && (
        <Popover rect={rect} onClose={fechar} width={popWidth} align={align} anchorRef={btn}>
          <div role="listbox">
            {opts.map((o, i) => (
              <div key={String(o.value)} role="option" aria-selected={o.value === value}
                className={"mtp-option"+(i === ativo ? " ativo" : "")+(o.value === value ? " sel" : "")}
                onMouseEnter={() => setAtivo(i)}
                onMouseDown={e => { e.preventDefault(); escolher(o); }}>
                {o.cor && <i className="mtp-dot" style={{ background:o.cor }}/>}
                <span style={{ flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{o.label}</span>
                {o.hint && <span className="mtp-option-hint">{o.hint}</span>}
                {o.value === value && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            ))}
          </div>
        </Popover>
      )}
    </>
  );
}

// ── Seletor de horário (substitui o <input type="time"> nativo) ──
// value: "HH:MM" ou ""
export function TimePicker({ value, onChange, style, horas = [9,10,11,12,13,14,15,16,17,18] }) {
  const [rect, setRect] = useState(null);
  const btn = useRef(null);
  const [h, m] = (value || "").split(":");
  const agora = () => { const d = new Date(); return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); };
  const setH = hh => onChange(String(hh).padStart(2,"0")+":"+(m || "00"));
  const setM = mm => onChange((h || String(new Date().getHours()).padStart(2,"0"))+":"+String(mm).padStart(2,"0"));
  const cel = ativo => ({
    padding:"7px 0", borderRadius:"8px", border:"1px solid "+(ativo?"color-mix(in srgb, var(--accent) 40%, transparent)":"var(--line)"),
    background: ativo?"color-mix(in srgb, var(--accent) 12%, transparent)":"transparent", color: ativo?"var(--accent)":"var(--text-2)",
    fontFamily:"var(--font-mono)", fontSize:"12.5px", fontWeight:600, cursor:"pointer",
  });
  return (
    <>
      <button ref={btn} type="button" className={"mtp-select"+(rect?" open":"")} style={style}
        onClick={() => setRect(rect ? null : btn.current.getBoundingClientRect())}>
        <span style={{ display:"flex", alignItems:"center", gap:"8px", fontFamily:"var(--font-mono)", color: value ? "var(--text)" : "var(--text-3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
          {value || "--:--"}
        </span>
      </button>
      {rect && (
        <Popover rect={rect} onClose={() => setRect(null)} width={252} maxHeight={400} anchorRef={btn}>
          <div style={{ padding:"6px" }}>
            <div style={{ display:"flex", gap:"6px", marginBottom:"10px" }}>
              <button type="button" onClick={() => { onChange(agora()); setRect(null); }} style={{ ...cel(false), flex:1, color:"var(--accent)", borderColor:"color-mix(in srgb, var(--accent) 30%, transparent)" }}>Agora · {agora()}</button>
              {value && <button type="button" onClick={() => { onChange(""); setRect(null); }} style={{ ...cel(false), padding:"7px 10px", color:"var(--text-3)" }}>Limpar</button>}
            </div>
            <p style={{ margin:"0 2px 6px", color:"var(--text-3)", fontSize:"10px", fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase" }}>Hora</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"5px", marginBottom:"10px" }}>
              {horas.map(hh => <button type="button" key={hh} onClick={() => setH(hh)} style={cel(Number(h) === hh)}>{String(hh).padStart(2,"0")}</button>)}
            </div>
            <p style={{ margin:"0 2px 6px", color:"var(--text-3)", fontSize:"10px", fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase" }}>Minuto</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"5px" }}>
              {[0,5,10,15,20,25,30,35,40,45,50,55].map(mm => <button type="button" key={mm} onClick={() => { setM(mm); setRect(null); }} style={cel(Number(m) === mm)}>{String(mm).padStart(2,"0")}</button>)}
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}

// ── Confirmação (substitui o window.confirm) ─────────────────────
// ── Campo de senha com o "olho" para mostrar/esconder o que foi digitado ──
export function CampoSenha({ style, ...props }) {
  const [ver, setVer] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input {...props} type={ver ? "text" : "password"} style={{ ...style, paddingRight:"44px" }}/>
      <button type="button" onClick={()=>setVer(v=>!v)} aria-label={ver ? "Esconder senha" : "Mostrar senha"} title={ver ? "Esconder senha" : "Mostrar senha"}
        style={{ position:"absolute", right:"6px", top:"50%", transform:"translateY(-50%)", width:"34px", height:"34px", minHeight:0, padding:0, border:0, borderRadius:"8px", background:"none", color:"var(--text-3)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {ver
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
      </button>
    </div>
  );
}

export function Confirmar({ titulo, texto, botao = "Apagar", perigo = true, onConfirmar, onCancelar }) {
  const [ocupado, setOcupado] = useState(false);
  const cor = perigo ? "var(--neg)" : "var(--accent)";
  return (
    <Modal onClose={onCancelar} width={420}>
      <div style={{ padding:"24px 26px", display:"flex", flexDirection:"column", gap:"16px" }}>
        <div style={{ display:"flex", gap:"14px", alignItems:"flex-start" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"12px", flexShrink:0, background:alfa(cor,"18"), border:"1px solid "+alfa(cor,"44"), display:"flex", alignItems:"center", justifyContent:"center" }}>
            {perigo
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ margin:0, color:"var(--text)", fontSize:"16.5px", fontWeight:"800" }}>{titulo}</p>
            {texto && <p style={{ margin:"6px 0 0", color:"var(--text-2)", fontSize:"13px", lineHeight:1.6 }}>{texto}</p>}
          </div>
        </div>
        <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end" }}>
          <button onClick={onCancelar} disabled={ocupado} style={{ background:"transparent", color:"var(--text-2)", border:"1px solid var(--line)", borderRadius:"10px", padding:"10px 16px", fontSize:"13px", fontWeight:"600", cursor:"pointer", fontFamily:"var(--font-sans)" }}>Cancelar</button>
          <button autoFocus disabled={ocupado} onClick={async () => { setOcupado(true); try { await onConfirmar(); } finally { setOcupado(false); } }}
            style={{ background: perigo ? "linear-gradient(135deg,#ff5470,#e03a58)" : "linear-gradient(135deg,#2ee6a0,#1fc98a)", color: perigo ? "#fff" : "#000", border:"none", borderRadius:"10px", padding:"10px 18px", fontSize:"13px", fontWeight:"800", cursor: ocupado ? "wait" : "pointer", fontFamily:"var(--font-sans)" }}>
            {ocupado ? "Aguarde..." : botao}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Resultado por moeda: "+R$ 120,00 · +$ 15,00", cada parte com a sua cor ──
// empilhar: uma moeda por linha (células estreitas de calendário)
export function Valores({ partes, compacto = false, empilhar = false, vazio = "—", style }) {
  if (!partes?.length) return <span style={{ color:"var(--text-3)", ...style }}>{vazio}</span>;
  return (
    <span style={{ fontFamily:"var(--font-mono)", fontWeight:800, whiteSpace:"nowrap", ...(empilhar ? { display:"inline-flex", flexDirection:"column", alignItems:"center", lineHeight:1.25 } : {}), ...style }}>
      {partes.map((p, i) => (
        <span key={p.moeda}>
          {i > 0 && !empilhar && <span style={{ color:"var(--text-3)", fontWeight:400 }}>{compacto ? " " : " · "}</span>}
          <span style={{ color:corValor(p.valor) }}>{fmtMoeda(p.valor, p.moeda, { compacto })}</span>
        </span>
      ))}
    </span>
  );
}
