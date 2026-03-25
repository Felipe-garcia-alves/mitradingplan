import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../supabase";

// ── Upload helper
export async function uploadTradeImage(file, userId, dateKey, tradeIdx) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${dateKey}/trade-${tradeIdx}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("diario-imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("diario-imagens").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteTradeImage(url) {
  try {
    const path = url.split("/diario-imagens/")[1];
    if (path) await supabase.storage.from("diario-imagens").remove([path]);
  } catch(e) { console.error(e); }
}

// ── Image Editor Modal (upload + draw)
export default function ImageEditor({ src, onSave, onClose }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pen"); // pen | arrow | rect | text
  const [color, setColor] = useState("#00d4aa");
  const [lineW, setLineW] = useState(2);
  const [history, setHistory] = useState([]);
  const lastPos = useRef(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(window.innerWidth - 48, 900);
      const scale = Math.min(maxW / img.width, 600 / img.height, 1);
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = src;
  }, [src]);

  function getPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - r.left, y: touch.clientY - r.top };
  }

  function startDraw(e) {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPos.current = pos;
  }

  function endDraw(e) {
    e.preventDefault();
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    setHistory(h => [...h.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function undo() {
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    const ctx = canvasRef.current.getContext("2d");
    ctx.putImageData(prev, 0, 0);
    setHistory(h => h.slice(0, -1));
  }

  async function handleSave() {
    setSaving(true);
    const canvas = canvasRef.current;
    canvas.toBlob(async blob => {
      const file = new File([blob], "annotated.jpg", { type:"image/jpeg" });
      await onSave(file);
      setSaving(false);
      onClose();
    }, "image/jpeg", 0.92);
  }

  const COLORS = ["#00d4aa","#f59e0b","#ef4444","#0099ff","#a78bfa","#f0f0f0","#000000"];
  const SIZES  = [1.5, 2.5, 4, 7];

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"16px",overflow:"auto"}}>
      {/* Toolbar */}
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",justifyContent:"center",marginBottom:"12px",background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"10px 14px",maxWidth:"900px",width:"100%"}}>
        {/* Pen */}
        <button onClick={()=>setTool("pen")} title="Caneta"
          style={{padding:"7px 12px",borderRadius:"8px",border:"none",background:tool==="pen"?"rgba(0,212,170,0.2)":"transparent",color:tool==="pen"?"#00d4aa":"#888",cursor:"pointer",fontSize:"16px"}}>
          ✏️
        </button>

        {/* Colors */}
        <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>setColor(c)}
              style={{width:"20px",height:"20px",borderRadius:"50%",background:c,cursor:"pointer",border:color===c?"3px solid #fff":"2px solid transparent",flexShrink:0,transition:"border 0.15s"}}/>
          ))}
        </div>

        {/* Line sizes */}
        <div style={{display:"flex",gap:"5px",alignItems:"center"}}>
          {SIZES.map(s=>(
            <div key={s} onClick={()=>setLineW(s)}
              style={{width:"28px",height:"28px",borderRadius:"6px",background:lineW===s?"rgba(255,255,255,0.1)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",border:lineW===s?"1px solid #444":"none"}}>
              <div style={{width:s*2,height:s*2,borderRadius:"50%",background:color}}/>
            </div>
          ))}
        </div>

        {/* Undo */}
        <button onClick={undo} title="Desfazer"
          style={{padding:"7px 12px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#888",cursor:"pointer",fontSize:"13px",fontFamily:"Inter,sans-serif"}}>
          ↩ Desfazer
        </button>

        <div style={{flex:1}}/>

        {/* Actions */}
        <button onClick={handleSave} disabled={saving}
          style={{padding:"8px 18px",borderRadius:"8px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"13px",cursor:"pointer",fontFamily:"Inter,sans-serif",opacity:saving?0.7:1}}>
          {saving ? "Salvando..." : "✓ Salvar"}
        </button>
        <button onClick={onClose}
          style={{padding:"8px 14px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#888",cursor:"pointer",fontSize:"13px",fontFamily:"Inter,sans-serif"}}>
          Cancelar
        </button>
      </div>

      {/* Canvas */}
      <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.5)",cursor:"crosshair",touchAction:"none"}}>
        <canvas ref={canvasRef}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
      </div>

      <p style={{color:"#444",fontSize:"12px",marginTop:"10px"}}>Desenhe diretamente no gráfico — anote entradas, saídas e observações</p>
    </div>
  );
}

// ── Image Thumbnail component
export function ImageThumb({ url, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{position:"relative",width:"80px",height:"60px",borderRadius:"8px",overflow:"hidden",flexShrink:0,cursor:"pointer",border:"1px solid #1a1a2e"}}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <img src={url} alt="trade" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      {hover && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",gap:"4px",alignItems:"center",justifyContent:"center"}}>
          <button onClick={e=>{e.stopPropagation();onEdit();}}
            style={{background:"rgba(0,212,170,0.2)",border:"none",borderRadius:"5px",color:"#00d4aa",cursor:"pointer",padding:"4px 6px",fontSize:"12px"}}>✏️</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}}
            style={{background:"rgba(255,77,77,0.2)",border:"none",borderRadius:"5px",color:"#ff4d4d",cursor:"pointer",padding:"4px 6px",fontSize:"12px"}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Image Viewer (fullscreen click)
export function ImageViewer({ url, onClose }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",padding:"20px"}}>
      <img src={url} alt="trade" style={{maxWidth:"100%",maxHeight:"100%",borderRadius:"12px",objectFit:"contain"}}/>
      <button style={{position:"absolute",top:"20px",right:"20px",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:"50%",width:"36px",height:"36px",fontSize:"18px",cursor:"pointer"}}>×</button>
    </div>
  );
}
