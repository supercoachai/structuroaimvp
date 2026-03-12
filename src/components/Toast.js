import React, { useEffect, useState } from "react";

let push;
export function useToast() {
  const [q, setQ] = useState([]);
  push = (msg, opts = {}) => {
    const { durationMs = 3000, replace = false } = opts || {};
    const id = Math.random();
    setQ((s) => (replace ? [{ id, msg }] : [...s, { id, msg }]));
    if (typeof durationMs === "number" && durationMs > 0) {
      setTimeout(() => {
        setQ((s) => s.filter((x) => x.id !== id));
      }, durationMs);
    }
  };
  const dismiss = (id) => setQ((s) => s.filter((x) => x.id !== id));
  return { q, dismiss };
}

export function ToastHost() {
  const { q, dismiss } = useToast();
  useEffect(()=>{ /* no-op, hook singleton-ish */ },[]);
  
  return (
    <div style={{ 
      position:"fixed", 
      bottom:16, 
      left:"50%", 
      transform:"translateX(-50%)", 
      display:"grid", 
      gap:8, 
      zIndex:9999 
    }}>
      {q.map(t=>(
        <div key={t.id} style={{ 
          background:"#fff", 
          border:"1px solid #E6E8EE", 
          borderRadius:10, 
          padding:"8px 12px", 
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
          fontSize: '14px',
          color: '#374151'
        }}>
          {t.msg}
          <button 
            onClick={()=>dismiss(t.id)} 
            style={{ 
              marginLeft:8, 
              border:"1px solid #E6E8EE", 
              borderRadius:8, 
              padding:"2px 6px", 
              background:"#fff",
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ok
          </button>
        </div>
      ))}
    </div>
  );
}

// Backwards-compatible: toast("msg") and toast("msg", { durationMs, replace })
export const toast = (m, opts) => push?.(m, opts);
