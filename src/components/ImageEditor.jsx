import { useState, useRef, useEffect } from "react";
import { supabase } from "../supabase";

export async function uploadTradeImage(file, userId, dateKey, tradeIdx) {
  const ext = file.name?.split(".").pop() || "jpg";
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

export default function ImageEditor({ src, onSave, onClose }) {
  const canvasRef = useRef(null);
  const textInputRef = useRef(null);
  const lastPos = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#00d4aa");
  const [lineW, setLineW] = useState(2);
  const [history, setHistory] = useState([]);
  const [textMode, setTextMode] = useState(null);
  const [textVal, setTextVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(window.innerWidth * 0.95, 1100);
      const maxH = Math.min(window.innerHeight * 0.78, 720);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (textMode && textInputRef.current) textInputRef.current.focus();
  }, [textMode]);

  function getPos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function startDraw(e) {
    e.preventDefault();
    if (tool === "text") { setTextMode(getPos(e)); setTextVal(""); return; }
    setDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing || tool === "text") return;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw(e) {
    e.preventDefault();
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    setHistory(h => [...h.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }

  function commitText() {
    if (!textMode || !textVal.trim()) { setTextMode(null); setTextVal(""); return; }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const fs = lineW * 5 + 14;
    ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
    ctx.strokeStyle = "rgba(0,0,0,0.7)"; ctx.lineWidth = Math.max(2, lineW);
    ctx.strokeText(textVal, textMode.x, textMode.y);
    ctx.fillStyle = color; ctx.fillText(textVal, textMode.x, textMode.y);
    setHistory(h => [...h.slice(-15), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setTextMode(null); setTextVal("");
  }

  function undo() {
    if (history.length < 2) return;
    canvasRef.current.getContext("2d").putImageData(history[history.length - 2], 0, 0);
    setHistory(h => h.slice(0, -1));
  }

  async function handleSave() {
    setSaving(true);
    canvasRef.current.toBlob(async blob => {
      await onSave(new File([blob], "annotated.jpg", { type: "image/jpeg" }));
      setSaving(false); onClose();
    }, "image/jpeg", 0.93);
  }

  const COLORS = ["#00d4aa","#f59e0b","#ef4444","#0099ff","#a78bfa","#f472b6","#f0f0f0","#000000"];
  const SIZES  = [1.5, 3, 5, 8];

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.94)",display:"flex",flexDirection:"column",alignItems:"center",padding:"10px",overflow:"auto"}}>
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap",justifyContent:"center",marginBottom:"10px",background:"#0d0d14",border:"1px solid #1a1a2e",borderRadius:"12px",padding:"10px 16px",maxWidth:"1100px",width:"100%"}}>
        {[["pen","✏️"],["text","T"]].map(([t,ic])=>(
          <button key={t} onClick={()=>setTool(t)} style={{padding:"7px 12px",borderRadius:"8px",border:"none",background:tool===t?"rgba(0,212,170,0.2)":"transparent",color:tool===t?"#00d4aa":"#888",cursor:"pointer",fontSize:t==="text"?"15px":"17px",fontWeight:t==="text"?"900":"normal"}}>{ic}</button>
        ))}
        <div style={{width:"1px",height:"24px",background:"#2a2a3a"}}/>
        {COLORS.map(col=>(
          <div key={col} onClick={()=>setColor(col)} style={{width:"22px",height:"22px",borderRadius:"50%",background:col,cursor:"pointer",border:color===col?"3px solid #fff":"2px solid transparent",flexShrink:0}}/>
        ))}
        <div style={{width:"1px",height:"24px",background:"#2a2a3a"}}/>
        {SIZES.map(s=>(
          <div key={s} onClick={()=>setLineW(s)} style={{width:"30px",height:"30px",borderRadius:"7px",background:lineW===s?"rgba(255,255,255,0.1)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",border:lineW===s?"1px solid #444":"none"}}>
            <div style={{width:s*2.2,height:s*2.2,borderRadius:"50%",background:color}}/>
          </div>
        ))}
        <div style={{width:"1px",height:"24px",background:"#2a2a3a"}}/>
        <button onClick={undo} style={{padding:"7px 13px",borderRadius:"8px",border:"1px solid #2a2a3a",background:"transparent",color:"#888",cursor:"pointer",fontSize:"12px",fontFamily:"Inter,sans-serif"}}>↩ Desfazer</button>
        <div style={{flex:1}}/>
        <button onClick={handleSave} disabled={saving} style={{padding:"9px 20px",borderRadius:"9px",border:"none",background:"linear-gradient(135deg,#00d4aa,#00b894)",color:"#000",fontWeight:"700",fontSize:"13px",cursor:saving?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",opacity:saving?0.7:1}}>{saving?"Salvando...":"✓ Salvar"}</button>
        <button onClick={onClose} style={{padding:"9px 14px",borderRadius:"9px",border:"1px solid #2a2a3a",background:"transparent",color:"#888",cursor:"pointer",fontSize:"13px",fontFamily:"Inter,sans-serif"}}>✕</button>
      </div>

      <div style={{position:"relative",borderRadius:"12px",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.6)",touchAction:"none",cursor:tool==="text"?"text":"crosshair"}}>
        <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} style={{display:"block"}}/>
        {textMode && (
          <div style={{position:"absolute",top:Math.max(0,textMode.y-24),left:textMode.x,zIndex:10,display:"flex",gap:"6px"}}>
            <input ref={textInputRef} value={textVal} onChange={e=>setTextVal(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")commitText();if(e.key==="Escape"){setTextMode(null);setTextVal("");}}}
              placeholder="Digite e pressione Enter"
              style={{background:"rgba(0,0,0,0.8)",border:"1px solid "+color,borderRadius:"6px",padding:"6px 10px",color:color,fontSize:"14px",fontWeight:"700",outline:"none",fontFamily:"Inter,sans-serif",minWidth:"200px"}}/>
            <button onClick={commitText} style={{background:color,border:"none",borderRadius:"6px",padding:"6px 12px",color:"#000",fontWeight:"700",fontSize:"12px",cursor:"pointer"}}>OK</button>
          </div>
        )}
      </div>
      <p style={{color:"#333",fontSize:"11px",marginTop:"8px"}}>{tool==="pen"?"Desenhe no gráfico":"Clique onde quer inserir texto — depois Enter"}</p>
    </div>
  );
}

export function ImageThumb({ url, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{position:"relative",width:"80px",height:"60px",borderRadius:"8px",overflow:"hidden",flexShrink:0,cursor:"pointer",border:"1px solid #1a1a2e"}}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={onEdit}>
      <img src={url} alt="trade" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
      {hover && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",gap:"4px",alignItems:"center",justifyContent:"center"}}>
          <button onClick={e=>{e.stopPropagation();onEdit();}} style={{background:"rgba(0,212,170,0.25)",border:"none",borderRadius:"5px",color:"#00d4aa",cursor:"pointer",padding:"4px 7px",fontSize:"12px"}}>✏️</button>
          <button onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"rgba(255,77,77,0.25)",border:"none",borderRadius:"5px",color:"#ff4d4d",cursor:"pointer",padding:"4px 7px",fontSize:"12px"}}>✕</button>
        </div>
      )}
    </div>
  );
}

export function ImageViewer({ url, onClose }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.96)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out",padding:"16px"}}>
      <img src={url} alt="trade" style={{maxWidth:"100%",maxHeight:"95vh",borderRadius:"10px",objectFit:"contain"}}/>
      <button style={{position:"absolute",top:"16px",right:"16px",background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:"50%",width:"36px",height:"36px",fontSize:"18px",cursor:"pointer"}}>×</button>
    </div>
  );
}
