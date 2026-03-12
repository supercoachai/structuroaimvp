"use client";

import React, { useState } from "react";
import { formatWhen } from "./ReminderEngine";
import { parseWhen } from "./nlDateParse";

const theme = {
  card: "#FFFFFF",
  text: "#2F3441",
  sub: "rgba(47,52,65,0.65)",
  line: "#E6E8EE",
  accent: "#4A90E2",
};

interface Task {
  id: string;
  title: string;
  dueAt?: string | null;
  reminders?: number[];
  repeat?: string;
  duration?: number | null;
  estimatedDuration?: number | null;
  micro_steps?: string[];
}

interface TaskScheduleEditorProps {
  task: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
}

export default function TaskScheduleEditor({ task, onSave, onClose }: TaskScheduleEditorProps) {
  const [date, setDate] = useState<Date | null>(task?.dueAt ? new Date(task.dueAt) : null);
  const [time, setTime] = useState<string>(task?.dueAt ? toTime(task.dueAt) : "");
  const [rem, setRem] = useState<number[]>(task?.reminders || [10]);
  const [rep, setRep] = useState<string>(task?.repeat || "none");
  const [nl, setNl] = useState<string>("");
  const [duration, setDuration] = useState<number | null>(task?.duration || null);

  const due = date && time ? toDate(date, time) : date ? atNine(date) : null;

  return (
    <div style={wrap} className="task-schedule-editor">
      <style>{`
        .task-schedule-editor input,
        .task-schedule-editor select {
          color: ${theme.text};
          background: ${theme.card};
        }
        .task-schedule-editor input::placeholder {
          color: #6B7280;
          opacity: 1;
        }
      `}</style>
      <div style={header}>
        <div style={{ fontWeight: 700, color: theme.text }}>Planning</div>
        <button onClick={onClose} style={ghost}>Sluiten</button>
      </div>

      <div style={row}>
        <label style={label}>Datum</label>
        <input type="date" value={dateInput(date)} onChange={(e)=>setDate(fromDateInput(e.target.value))} style={input}/>
      </div>
      <div style={row}>
        <label style={label}>Tijd</label>
        <input type="time" value={time} onChange={(e)=>setTime(e.target.value)} style={input}/>
      </div>
      <div style={row}>
        <label style={label}>Duur (min)</label>
        <input 
          type="number" 
          min="1" 
          max="480" 
          value={duration || ''} 
          onChange={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            setDuration(val);
          }} 
          placeholder="Bijv. 15, 30, 60"
          style={input}
        />
      </div>

      <div style={row}>
        <label style={label}>Herinnering</label>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[5,10,30,60].map((m)=>
            <button key={m} onClick={()=>toggle(rem,m,setRem)}
              style={{...chip, background: rem.includes(m)? theme.accent:"#FFF", color: rem.includes(m)?"#FFF":theme.text}}>
              {m} min
            </button>
          )}
        </div>
      </div>

      <div style={row}>
        <label style={label}>Herhaal</label>
        <select value={rep} onChange={(e)=>setRep(e.target.value)} style={input}>
          <option value="none">Niet herhalen</option>
          <option value="daily">Elke dag</option>
          <option value="weekly">Wekelijks</option>
        </select>
      </div>

      <div style={{...row, alignItems:"flex-start"}}>
        <label style={label}>Natuurlijke taal</label>
        <div style={{display:"grid",gap:6}}>
          <input placeholder='bijv. "morgen 15:00" of "over 2 uur"'
                 value={nl} onChange={(e)=>setNl(e.target.value)} style={input}/>
          <button style={ghost} onClick={()=>{
            const d = parseWhen(nl);
            if (d) { setDate(d); setTime(toTime(d.toISOString())); setNl(""); }
          }}>Parseer</button>
        </div>
      </div>

      {due && <div style={{fontSize:13,color:theme.sub, marginTop:8}}>Voorbeeld: {formatWhen(due)}</div>}

      <div style={{display:"flex",gap:8, marginTop:12}}>
        <button style={primary} onClick={()=>{
          onSave({
            ...task,
            dueAt: due ? due.toISOString() : null,
            reminders: rem.slice().sort((a: number,b: number)=>a-b),
            repeat: rep,
            duration: duration || null,
            estimatedDuration: duration || null
          });
          onClose?.();
        }}>Opslaan</button>
        <button style={ghost} onClick={()=>{
          onSave({...task, dueAt:null, reminders:[], repeat:"none"});
          onClose?.();
        }}>Verwijder planning</button>
      </div>
    </div>
  );
}

/* helpers + styles */
function toggle(arr: number[], val: number, set: (arr: number[]) => void){ 
  set(arr.includes(val)? arr.filter(x=>x!==val): [...arr,val]); 
}
function toTime(d: string){ 
  const t = new Date(d); 
  const hh=String(t.getHours()).padStart(2,"0"); 
  const mm=String(t.getMinutes()).padStart(2,"0"); 
  return `${hh}:${mm}`;
}
function toDate(date: Date, time: string){ 
  const d = new Date(date); 
  const [h,m]=time.split(":").map(Number); 
  d.setHours(h||9,m||0,0,0); 
  return d; 
}
function atNine(date: Date){ 
  const d = new Date(date); 
  d.setHours(9,0,0,0); 
  return d; 
}
function dateInput(d: Date | null){ 
  if(!d) return ""; 
  const x = new Date(d); 
  return x.toISOString().slice(0,10); 
}
function fromDateInput(v: string){ 
  if(!v) return null; 
  const [y,m,d]=v.split("-").map(Number); 
  const dt = new Date(y, m-1, d); 
  dt.setHours(9,0,0,0); 
  return dt; 
}

const wrap = { background:"#FFF", border:"1px solid #E6E8EE", borderRadius:12, padding:14, color: theme.text };
const header = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 };
const row = { display:"grid", gridTemplateColumns:"120px 1fr", alignItems:"center", gap:10, marginTop:8 };
const label = { fontSize:13, color: "#374151", fontWeight: 600 };
const input = { padding:"10px 12px", border:"1px solid #E6E8EE", borderRadius:10, outline:"none", background:"#FFFFFF", color: theme.text };
const chip = { padding:"6px 10px", border:"1px solid #E6E8EE", borderRadius:999, cursor:"pointer" };
const primary = { padding:"10px 14px", border:"1px solid #E6E8EE", borderRadius:10, background:"#FFF", cursor:"pointer" };
const ghost = { padding:"8px 12px", border:"1px solid #E6E8EE", borderRadius:10, background:"#FFF", color:"#374151", cursor:"pointer" };
