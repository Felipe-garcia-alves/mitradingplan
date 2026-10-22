import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";

export async function uploadTradeImage(file, userId, dateKey, tradeIdx) {
  const ext = file.name?.split(".").pop() || "jpg";
  const path = `${userId}/${dateKey}/trade-${tradeIdx}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("diario-imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("diario-imagens").getPublicUrl(path);
  return data.publicUrl;
}

// O bucket diario-imagens é privado: cada imagem é exibida por um link
// assinado e temporário (1h), gerado a partir do caminho salvo no trade.
// Os trades guardam a URL "pública" antiga só como referência do caminho.
const assinadas = new Map(); // caminho -> url assinada (sai do cache antes de expirar)

function caminhoDaImagem(url) {
  const i = (url || "").indexOf("/diario-imagens/");
  return i >= 0 ? decodeURIComponent(url.slice(i + "/diario-imagens/".length).split("?")[0]) : null;
}

function useImagemSegura(url) {
  const local = !url || url.startsWith("blob:") || url.startsWith("data:");
  const caminho = local ? null : caminhoDaImagem(url);
  const valido = caminho ? assinadas.get(caminho) || null : null;
  const [gerada, setGerada] = useState(null);
  useEffect(() => {
    if (!caminho || valido) return;
    let vivo = true;
    supabase.storage.from("diario-imagens").createSignedUrl(caminho, 3600).then(({ data }) => {
      if (!data?.signedUrl) return;
      assinadas.set(caminho, data.signedUrl);
      setTimeout(() => assinadas.delete(caminho), 50 * 60 * 1000);
      if (vivo) setGerada(data.signedUrl);
    });
    return () => { vivo = false; };
  }, [caminho, valido]);
  if (local) return url;
  if (!caminho) return url; // URL de fora do bucket: usa como está
  return valido || gerada;
}

export function ImagemSegura({ url, ...props }) {
  const src = useImagemSegura(url);
  if (!src) return <div style={{ ...(props.style || {}), background:"rgba(255,255,255,0.04)" }}/>;
  return <img src={src} alt="" {...props}/>;
}

export async function deleteTradeImage(url) {
  try {
    const path = url.split("/diario-imagens/")[1];
    if (path) await supabase.storage.from("diario-imagens").remove([path]);
  } catch(e) { console.error(e); }
}

// ── Editor de anotações
// Cada desenho é um objeto (forma) guardado em lista, redesenhado sobre a foto a cada mudança.
// Assim dá para selecionar, mover, editar e apagar depois de desenhar. Só no salvar tudo vira pixel.
// Coordenadas em pixels da tela do editor; ao exportar, a foto sai na resolução original.

const SVG = p => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
const FERRAMENTAS = [
  ["selecionar", "Selecionar e mover — clique duplo edita o texto", SVG(<path d="M4 3l7 17 2.5-7.5L21 10z"/>)],
  ["caneta",     "Caneta",          SVG(<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></>)],
  ["marcador",   "Marca-texto",     SVG(<><path d="M9 11l-6 6v3h9l3-3"/><path d="M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></>)],
  ["linha",      "Linha",           SVG(<line x1="5" y1="19" x2="19" y2="5"/>)],
  ["seta",       "Seta",            SVG(<><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></>)],
  ["horizontal", "Linha horizontal (nível de preço)", SVG(<><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="2" y2="17"/><line x1="22" y1="7" x2="22" y2="17"/></>)],
  ["retangulo",  "Retângulo",       SVG(<rect x="4" y="6" width="16" height="12" rx="1"/>)],
  ["elipse",     "Círculo",         SVG(<ellipse cx="12" cy="12" rx="9" ry="7"/>)],
  ["texto",      "Texto — clique num texto para editar, arraste para mover", SVG(<><polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="9" y1="20" x2="15" y2="20"/></>)],
];
const DICAS = {
  selecionar: "Clique num desenho para selecionar e arraste para mover · Delete apaga · clique duplo num texto edita",
  caneta: "Desenhe livremente", marcador: "Destaque uma região",
  linha: "Arraste para traçar a linha", seta: "Arraste do início até a ponta da seta",
  horizontal: "Clique na altura do preço — arraste para ajustar",
  retangulo: "Arraste para marcar a área", elipse: "Arraste para circular",
  texto: "Clique para escrever · arraste um texto para movê-lo · clique nele para editar",
};
const DOIS_PONTOS = ["linha", "seta", "retangulo", "elipse"];

const largura = f => f.tipo === "marcador" ? f.esp * 4 + 6 : f.esp;
const tamTexto = f => f.esp * 5 + 14;
const fonte = f => `bold ${tamTexto(f)}px Inter, Arial, sans-serif`;

function distSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function caixa(ctx, f, W) {
  if (f.tipo === "texto") {
    ctx.font = fonte(f);
    const t = tamTexto(f);
    return { x: f.x, y: f.y - t * 0.85, w: ctx.measureText(f.texto).width, h: t * 1.1 };
  }
  if (f.tipo === "horizontal") return { x: 0, y: f.y - largura(f) / 2, w: W, h: largura(f) };
  const pts = f.pts || [f.a, f.b];
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function acerta(ctx, f, p, W) {
  const tol = Math.max(7, largura(f) / 2 + 5);
  switch (f.tipo) {
    case "caneta": case "marcador":
      return f.pts.length === 1 ? Math.hypot(p.x - f.pts[0].x, p.y - f.pts[0].y) < tol
        : f.pts.some((q, i) => i > 0 && distSeg(p, f.pts[i - 1], q) < tol);
    case "linha": case "seta": return distSeg(p, f.a, f.b) < tol;
    case "horizontal": return Math.abs(p.y - f.y) < tol;
    case "retangulo": {
      const c = caixa(ctx, f, W);
      const dentro = (m) => p.x > c.x - m && p.x < c.x + c.w + m && p.y > c.y - m && p.y < c.y + c.h + m;
      return dentro(tol) && !(c.w > 2 * tol && c.h > 2 * tol && dentro(-tol));
    }
    case "elipse": {
      const c = caixa(ctx, f, W), rx = c.w / 2, ry = c.h / 2;
      if (rx < 1 || ry < 1) return false;
      const d = Math.hypot((p.x - c.x - rx) / rx, (p.y - c.y - ry) / ry);
      return Math.abs(d - 1) * Math.min(rx, ry) < tol;
    }
    case "texto": {
      const c = caixa(ctx, f, W);
      return p.x > c.x - 4 && p.x < c.x + c.w + 4 && p.y > c.y - 4 && p.y < c.y + c.h + 4;
    }
    default: return false;
  }
}

function transladar(f, dx, dy) {
  const m = p => ({ x: p.x + dx, y: p.y + dy });
  if (f.pts) return { ...f, pts: f.pts.map(m) };
  if (f.a) return { ...f, a: m(f.a), b: m(f.b) };
  if (f.tipo === "horizontal") return { ...f, y: f.y + dy };
  return { ...f, x: f.x + dx, y: f.y + dy };
}

function desenharForma(ctx, f, W) {
  ctx.save();
  ctx.strokeStyle = f.cor; ctx.fillStyle = f.cor;
  ctx.lineWidth = largura(f); ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (f.tipo) {
    case "caneta": case "marcador":
      if (f.tipo === "marcador") ctx.globalAlpha = 0.35;
      ctx.beginPath();
      if (f.pts.length === 1) { ctx.arc(f.pts[0].x, f.pts[0].y, largura(f) / 2, 0, Math.PI * 2); ctx.fill(); break; }
      f.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.stroke();
      break;
    case "linha":
      ctx.beginPath(); ctx.moveTo(f.a.x, f.a.y); ctx.lineTo(f.b.x, f.b.y); ctx.stroke();
      break;
    case "seta": {
      const ang = Math.atan2(f.b.y - f.a.y, f.b.x - f.a.x), h = 9 + f.esp * 3;
      const base = { x: f.b.x - Math.cos(ang) * h * 0.8, y: f.b.y - Math.sin(ang) * h * 0.8 };
      ctx.beginPath(); ctx.moveTo(f.a.x, f.a.y); ctx.lineTo(base.x, base.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(f.b.x, f.b.y);
      ctx.lineTo(f.b.x - h * Math.cos(ang - 0.45), f.b.y - h * Math.sin(ang - 0.45));
      ctx.lineTo(f.b.x - h * Math.cos(ang + 0.45), f.b.y - h * Math.sin(ang + 0.45));
      ctx.closePath(); ctx.fill();
      break;
    }
    case "horizontal":
      ctx.beginPath(); ctx.moveTo(0, f.y); ctx.lineTo(W, f.y); ctx.stroke();
      break;
    case "retangulo": {
      const c = caixa(ctx, f, W);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      break;
    }
    case "elipse": {
      const c = caixa(ctx, f, W);
      ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "texto":
      ctx.font = fonte(f);
      ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = Math.max(2, tamTexto(f) / 8);
      ctx.strokeText(f.texto, f.x, f.y);
      ctx.fillText(f.texto, f.x, f.y);
      break;
    default:
  }
  ctx.restore();
}

function desenharSelecao(ctx, f, W) {
  ctx.save();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  if (!["linha", "seta"].includes(f.tipo)) {
    const c = caixa(ctx, f, W);
    ctx.strokeRect(c.x - 5, c.y - 5, c.w + 10, c.h + 10);
  }
  ctx.setLineDash([]);
  if (DOIS_PONTOS.includes(f.tipo)) for (const p of [f.a, f.b]) {
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000000";
    ctx.fillRect(p.x - 5, p.y - 5, 10, 10); ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
  }
  ctx.restore();
}

// Desenha a foto e as formas; k é a escala dos pixels (densidade da tela ou resolução de exportação)
function renderizar(canvas, img, W, H, k, formas, { rascunho, sel, oculta, visivel = () => true } = {}) {
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, W * k, H * k);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  formas.forEach((f, i) => { if (i !== oculta && visivel(f)) desenharForma(ctx, f, W); });
  if (rascunho) desenharForma(ctx, rascunho, W);
  if (sel != null && formas[sel] && sel !== oculta && visivel(formas[sel])) desenharSelecao(ctx, formas[sel], W);
}

// Duas camadas na mesma foto: a análise feita na hora do trade e a feita depois, na revisão
const CAMADAS = [["hora", "Na hora", "#2ee6a0"], ["revisao", "Revisão", "#f5b941"]];
const camadaDe = f => f.camada || "hora";

// formasIniciais: desenhos já salvos da foto (continuam editáveis). onSave(file, formas).
export default function ImageEditor({ src: srcOriginal, onSave, onClose, formasIniciais, camadaInicial = "hora" }) {
  const src = useImagemSegura(srcOriginal);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const textInputRef = useRef(null);
  const arrasto = useRef(null);
  const [hist, setHist] = useState({ desfazer: [], refazer: [] }); // pilhas de versões da lista de formas
  const [dim, setDim] = useState(null); // tamanho do editor na tela
  const [formas, setFormas] = useState(() => formasIniciais || []);
  const [rascunho, setRascunho] = useState(null);
  const [sel, setSel] = useState(null);
  const [tool, setTool] = useState("caneta");
  const [camada, setCamada] = useState(camadaInicial);
  const [visiveis, setVisiveis] = useState({ hora: true, revisao: true });
  const [color, setColor] = useState(camadaInicial === "revisao" ? "#f5b941" : "#2ee6a0");
  const [lineW, setLineW] = useState(2);
  const [texto, setTexto] = useState(null); // { x, y, idx, valor } enquanto digita
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.95, 1100);
      const maxH = Math.min(window.innerHeight * 0.78, 720);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      imgRef.current = img;
      setDim({ W: Math.round(img.width * scale), H: Math.round(img.height * scale) });
    };
    img.src = src;
  }, [src]);

  const dpr = window.devicePixelRatio || 1;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!dim || !canvas) return;
    if (canvas.width !== Math.round(dim.W * dpr)) { canvas.width = Math.round(dim.W * dpr); canvas.height = Math.round(dim.H * dpr); }
    renderizar(canvas, imgRef.current, dim.W, dim.H, dpr, formas, { rascunho, sel, oculta: texto?.idx, visivel: f => visiveis[camadaDe(f)] });
  }, [dim, dpr, formas, rascunho, sel, texto, visiveis]);

  useEffect(() => {
    if (texto && textInputRef.current) textInputRef.current.focus();
  }, [texto?.x, texto?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toda mudança que entra no histórico passa por aqui
  function aplicar(novas) {
    registrar(formas);
    setFormas(novas);
  }
  function registrar(antes) {
    setHist(h => ({ desfazer: [...h.desfazer.slice(-49), antes], refazer: [] }));
  }
  function undo() {
    if (!hist.desfazer.length) return;
    setHist({ desfazer: hist.desfazer.slice(0, -1), refazer: [...hist.refazer, formas] });
    setFormas(hist.desfazer[hist.desfazer.length - 1]); setSel(null);
  }
  function redo() {
    if (!hist.refazer.length) return;
    setHist({ desfazer: [...hist.desfazer, formas], refazer: hist.refazer.slice(0, -1) });
    setFormas(hist.refazer[hist.refazer.length - 1]); setSel(null);
  }
  function apagarSelecionado() {
    if (sel == null) return;
    aplicar(formas.filter((_, i) => i !== sel)); setSel(null);
  }

  function selecionar(idx) {
    setSel(idx);
    if (idx == null) return;
    setColor(formas[idx].cor); setLineW(formas[idx].esp);
  }
  // Cor e espessura valem para o próximo desenho e também para o que estiver selecionado
  function mudarCor(c) {
    setColor(c);
    if (sel != null && formas[sel].cor !== c) aplicar(formas.map((f, i) => i === sel ? { ...f, cor: c } : f));
  }
  function mudarEspessura(s) {
    setLineW(s);
    if (sel != null && formas[sel].esp !== s) aplicar(formas.map((f, i) => i === sel ? { ...f, esp: s } : f));
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (ctrl && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel != null) { e.preventDefault(); apagarSelecionado(); }
      else if (e.key === "Escape") setSel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function getPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function acharForma(p, soTexto) {
    const ctx = canvasRef.current.getContext("2d");
    for (let i = formas.length - 1; i >= 0; i--) {
      if (!visiveis[camadaDe(formas[i])]) continue;
      if (soTexto && formas[i].tipo !== "texto") continue;
      if (acerta(ctx, formas[i], p, dim.W)) return i;
    }
    return -1;
  }

  function onDown(e) {
    if (!dim) return;
    e.preventDefault();
    const p = getPos(e);
    if (texto) { confirmarTexto(); return; }
    canvasRef.current.setPointerCapture(e.pointerId);

    if (tool === "selecionar" || tool === "texto") {
      const atual = sel != null ? formas[sel] : null;
      if (tool === "selecionar" && atual && DOIS_PONTOS.includes(atual.tipo)) {
        const ponta = ["a", "b"].find(k => Math.hypot(p.x - atual[k].x, p.y - atual[k].y) < 9);
        if (ponta) { arrasto.current = { modo: "ponta", ponta, idx: sel, antes: formas, moveu: false }; return; }
      }
      const idx = acharForma(p, tool === "texto");
      if (idx >= 0) {
        selecionar(idx);
        arrasto.current = { modo: "mover", idx, inicio: p, original: formas[idx], antes: formas, moveu: false };
        return;
      }
      if (tool === "texto") { setSel(null); setTexto({ x: p.x, y: p.y, idx: null, valor: "" }); return; }
      setSel(null);
      return;
    }

    setSel(null);
    const base = { tipo: tool, cor: color, esp: lineW, camada };
    if (tool === "caneta" || tool === "marcador") setRascunho({ ...base, pts: [p] });
    else if (tool === "horizontal") setRascunho({ ...base, y: p.y });
    else setRascunho({ ...base, a: p, b: p });
  }

  function onMove(e) {
    const a = arrasto.current;
    if (!a && !rascunho) return;
    e.preventDefault();
    const p = getPos(e);
    if (a) {
      if (a.modo === "mover") {
        const dx = p.x - a.inicio.x, dy = p.y - a.inicio.y;
        if (!a.moveu && Math.hypot(dx, dy) < 3) return;
        a.moveu = true;
        setFormas(fs => fs.map((f, i) => i === a.idx ? transladar(a.original, dx, dy) : f));
      } else {
        a.moveu = true;
        setFormas(fs => fs.map((f, i) => i === a.idx ? { ...f, [a.ponta]: p } : f));
      }
      return;
    }
    setRascunho(r => r.pts ? { ...r, pts: [...r.pts, p] } : r.tipo === "horizontal" ? { ...r, y: p.y } : { ...r, b: p });
  }

  function onUp(e) {
    const a = arrasto.current;
    if (a) {
      arrasto.current = null;
      if (a.moveu) {
        registrar(a.antes);
      } else if (tool === "texto" && a.modo === "mover") {
        const f = formas[a.idx];
        setTexto({ x: f.x, y: f.y, idx: a.idx, valor: f.texto });
      }
      return;
    }
    if (!rascunho) return;
    e.preventDefault();
    const r = rascunho;
    setRascunho(null);
    if (r.a && Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y) < 4) return; // clique sem arrastar
    aplicar([...formas, r]);
  }

  function onDoubleClick(e) {
    if (tool !== "selecionar") return;
    const idx = acharForma(getPos(e), true);
    if (idx < 0) return;
    const f = formas[idx];
    setSel(idx); setTexto({ x: f.x, y: f.y, idx, valor: f.texto });
  }

  function confirmarTexto() {
    const t = texto;
    setTexto(null);
    if (!t) return;
    const valor = t.valor.trim();
    if (t.idx != null) {
      if (!valor) { aplicar(formas.filter((_, i) => i !== t.idx)); setSel(null); }
      else if (valor !== formas[t.idx].texto) aplicar(formas.map((f, i) => i === t.idx ? { ...f, texto: valor } : f));
      return;
    }
    if (valor) aplicar([...formas, { tipo: "texto", x: t.x, y: t.y, texto: valor, cor: color, esp: lineW, camada }]);
  }

  async function handleSave() {
    if (!dim) return;
    setSaving(true);
    // Exporta na resolução original da foto (até 2560 px no lado maior)
    const img = imgRef.current;
    const k = Math.max(1, Math.min(img.width / dim.W, 2560 / Math.max(dim.W, dim.H)));
    const out = document.createElement("canvas");
    out.width = Math.round(dim.W * k); out.height = Math.round(dim.H * k);
    renderizar(out, img, dim.W, dim.H, k, formas);
    out.toBlob(async blob => {
      try {
        await onSave(new File([blob], "annotated.jpg", { type: "image/jpeg" }), formas);
        onClose();
      } catch (e) {
        console.error("salvar foto:", e);
        setErro("Não foi possível salvar a foto. Verifique a conexão e tente de novo.");
      }
      setSaving(false);
    }, "image/jpeg", 0.93);
  }

  const COLORS = ["#2ee6a0","#f59e0b","#ef4444","#0099ff","#a78bfa","#f472b6","#f0f0f0","#000000"];
  const SIZES  = [1.5, 3, 5, 8];
  const divisor = <div style={{width:"1px",height:"24px",background:"#26352e"}}/>;
  const btnSec = {padding:"7px 11px",borderRadius:"8px",border:"1px solid #26352e",background:"transparent",color:"#a3b2ab",cursor:"pointer",fontSize:"12px",fontFamily:"var(--font-sans)"};
  const corTexto = texto?.idx != null ? formas[texto.idx]?.cor : color;
  const cursor = tool === "selecionar" ? "default" : tool === "texto" ? "text" : "crosshair";

  // portal no body: nenhum transform de página ou modal prende o position:fixed
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.94)",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px",overflow:"auto"}}>
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",justifyContent:"center",marginBottom:"10px",background:"#0b1210",border:"1px solid #18241f",borderRadius:"12px",padding:"10px 16px",maxWidth:"1100px",width:"100%",boxSizing:"border-box"}}>
        <div style={{display:"flex",gap:"2px",flexWrap:"wrap"}}>
          {FERRAMENTAS.map(([t, titulo, icone]) => (
            <button key={t} title={titulo} aria-label={titulo} onClick={()=>{ if (texto) confirmarTexto(); setTool(t); if (t !== "selecionar" && t !== "texto") setSel(null); }}
              style={{width:"34px",height:"34px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"8px",border:"none",background:tool===t?"rgba(46,230,160,0.2)":"transparent",color:tool===t?"#2ee6a0":"#888",cursor:"pointer"}}>{icone}</button>
          ))}
        </div>
        {divisor}
        {COLORS.map(col=>(
          <div key={col} onClick={()=>mudarCor(col)} style={{width:"22px",height:"22px",borderRadius:"50%",background:col,cursor:"pointer",border:color===col?"3px solid #fff":"2px solid transparent",flexShrink:0}}/>
        ))}
        {divisor}
        {SIZES.map(s=>(
          <div key={s} onClick={()=>mudarEspessura(s)} title="Espessura / tamanho do texto" style={{width:"30px",height:"30px",borderRadius:"7px",background:lineW===s?"rgba(255,255,255,0.1)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",border:lineW===s?"1px solid #444":"none"}}>
            <div style={{width:s*2.2,height:s*2.2,borderRadius:"50%",background:color}}/>
          </div>
        ))}
        {divisor}
        <button onClick={undo} disabled={!hist.desfazer.length} title="Desfazer (Ctrl+Z)" style={{...btnSec,opacity:hist.desfazer.length?1:0.4}}>↩ Desfazer</button>
        <button onClick={redo} disabled={!hist.refazer.length} title="Refazer (Ctrl+Y)" style={{...btnSec,opacity:hist.refazer.length?1:0.4}}>↪</button>
        {sel != null && <button onClick={apagarSelecionado} title="Apagar selecionado (Delete)" style={{...btnSec,borderColor:"#ff547044",color:"#ff7a90"}}>🗑 Apagar</button>}
        {formas.some(f => camadaDe(f) === camada) && <button onClick={()=>{ aplicar(formas.filter(f => camadaDe(f) !== camada)); setSel(null); }} title="Remover os desenhos desta camada" style={btnSec}>Limpar</button>}
        {divisor}
        <div style={{display:"flex",gap:"4px",alignItems:"center"}} title="Camadas: a análise da hora do trade e a da revisão. Desenhos novos vão para a camada ativa.">
          {CAMADAS.map(([id, rot, cor]) => {
            const ativa = camada === id;
            return (
              <div key={id} style={{display:"flex",alignItems:"center",borderRadius:"8px",border:"1px solid "+(ativa?cor+"66":"#26352e"),background:ativa?cor+"14":"transparent",overflow:"hidden"}}>
                <button onClick={()=>{ setCamada(id); setVisiveis(v=>({...v,[id]:true})); }} style={{padding:"6px 9px",border:"none",background:"transparent",color:ativa?cor:"#86978f",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"var(--font-sans)",display:"flex",alignItems:"center",gap:"6px"}}>
                  <span style={{width:"7px",height:"7px",borderRadius:"50%",background:cor,opacity:visiveis[id]?1:0.3}}/>{rot}
                </button>
                <button onClick={()=>{
                    // esconder a camada ativa passa a desenhar na outra (que fica visível)
                    const outra = id === "hora" ? "revisao" : "hora";
                    setSel(null);
                    if (camada === id && visiveis[id]) { setCamada(outra); setVisiveis({ [id]: false, [outra]: true }); }
                    else setVisiveis(v => ({ ...v, [id]: !v[id] }));
                  }}
                  title={visiveis[id]?"Esconder esta camada":"Mostrar esta camada"} aria-label={visiveis[id]?"Esconder camada "+rot:"Mostrar camada "+rot}
                  style={{padding:"6px 7px",border:"none",borderLeft:"1px solid #26352e",background:"transparent",color:visiveis[id]?"#a3b2ab":"#4b5a53",cursor:"pointer",lineHeight:0}}>
                  {visiveis[id]
                    ? SVG(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)
                    : SVG(<><path d="M17.94 17.94A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>)}
                </button>
              </div>
            );
          })}
        </div>
        <div style={{flex:1}}/>
        <button onClick={handleSave} disabled={saving||!dim} style={{padding:"9px 20px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#2ee6a0,#1fc98a)",color:"#000",fontWeight:"700",fontSize:"13px",cursor:saving?"not-allowed":"pointer",fontFamily:"var(--font-sans)",opacity:saving?0.7:1}}>{saving?"Salvando...":"✓ Salvar"}</button>
        <button onClick={onClose} style={{padding:"9px 14px",borderRadius:"9px",border:"1px solid #26352e",background:"transparent",color:"#a3b2ab",cursor:"pointer",fontSize:"13px",fontFamily:"var(--font-sans)"}}>✕</button>
      </div>

      <div style={{position:"relative",borderRadius:"12px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",touchAction:"none",cursor}}>
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDoubleClick}
          style={{display:"block",width:dim?dim.W+"px":0,height:dim?dim.H+"px":0}}/>
        {texto && (
          <div style={{position:"absolute",top:Math.max(0,texto.y-28),left:Math.min(texto.x,(dim?.W||300)-260),zIndex:10,display:"flex",gap:"6px"}}>
            <input ref={textInputRef} value={texto.valor} onChange={e=>setTexto(t=>({...t,valor:e.target.value}))}
              onKeyDown={e=>{if(e.key==="Enter")confirmarTexto();if(e.key==="Escape")setTexto(null);}}
              placeholder="Digite e pressione Enter"
              style={{background:"rgba(0,0,0,0.8)",border:"1px solid "+corTexto,borderRadius:"6px",padding:"6px 10px",color:corTexto,fontSize:"14px",fontWeight:"700",outline:"none",fontFamily:"var(--font-sans)",minWidth:"200px"}}/>
            <button onClick={confirmarTexto} style={{background:corTexto,border:"none",borderRadius:"6px",padding:"6px 12px",color:"#000",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>OK</button>
          </div>
        )}
      </div>
      {erro && <p role="alert" style={{color:"#ff7a90",fontSize:"12.5px",marginTop:"8px",textAlign:"center"}}>{erro}</p>}
      <p style={{color:"#64766e",fontSize:"11px",marginTop:"8px",textAlign:"center"}}>{DICAS[tool]}{!visiveis.hora||!visiveis.revisao ? " · uma camada está escondida (ela continua salva na foto)" : ""}</p>
    </div>,
    document.body
  );
}

export function ImageThumb({ url, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{position:"relative",width:"80px",height:"60px",borderRadius:"8px",overflow:"hidden",flexShrink:0,cursor:"pointer",border:"1px solid #18241f"}}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onEdit}>
      <ImagemSegura url={url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      {hover && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",gap:"4px",alignItems:"center",justifyContent:"center"}}>
          <button onClick={e=>{e.stopPropagation();onEdit();}} style={{background:"rgba(46,230,160,0.25)",border:"none",borderRadius:"5px",color:"#2ee6a0",cursor:"pointer",padding:"4px 7px",fontSize:"12px"}}>✏️</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"rgba(255,84,112,0.25)",border:"none",borderRadius:"5px",color:"#ff5470",cursor:"pointer",padding:"4px 7px",fontSize:"12px"}}>✕</button>
        </div>
      )}
    </div>
  );
}

export function ImageViewer({ url, onClose }) {
  return createPortal(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.96)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",padding:"16px"}}>
      <ImagemSegura url={url} style={{maxWidth:"100%",maxHeight:"95vh",borderRadius:"10px",objectFit:"contain"}}/>
      <button style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:"50%",width:"36px",height:"36px",fontSize:"18px",cursor:"pointer"}}>×</button>
    </div>,
    document.body
  );
}
