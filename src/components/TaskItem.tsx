import React, { useState, useEffect } from "react";
const theme = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#2F3441",
  sub: "rgba(47,52,65,0.75)",
  line: "#E6E8EE",
  accent: "#4A90E2",
  soft: "rgba(74,144,226,0.06)",
};

interface Task {
  id: string;
  title: string;
  priority: number | null;
  duration?: number;
}

interface TaskItemProps {
  task: Task;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
  onPriorityChange?: (priority: number) => void;
  onRemovePriority?: () => void;
  isPriority?: boolean;
  completed?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  showPriorityLabel?: boolean;
}

const PRIORITY_LABELS = {
  1: "Kernfocus",
  2: "Vervolgstap",
  3: "Bonusactie",
};

/** Kalme taakkaart met één duidelijke actie: afvinken. */
export default function TaskItem({ 
  task, 
  checked, 
  onChange, 
  highlight = false,
  onPriorityChange,
  onRemovePriority,
  isPriority = false,
  completed = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  showPriorityLabel = true
}: TaskItemProps) {
  const [fade, setFade] = useState(false);

  // subtiele dopamine: korte kleurflits & fade bij afronden
  useEffect(() => {
    if (checked) {
      setFade(true);
      const t = setTimeout(() => setFade(false), 300);
      return () => clearTimeout(t);
    }
  }, [checked]);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return "#4A90E2"; // zachte blauw voor alle prioriteiten
      case 2: return "#4A90E2";
      case 3: return "#4A90E2";
      default: return theme.text;
    }
  };

  if (completed) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "24px 1fr",
          alignItems: "center",
          gap: 10,
          padding: 12,
          border: "1px solid " + theme.line,
          borderRadius: 12,
          background: "#F8F9FA",
          opacity: 0.7,
        }}
      >
        <div style={{ color: theme.accent, fontSize: 16 }}>✓</div>
        <div>
          <div style={{ fontSize: 14, color: theme.sub, textDecoration: "line-through" }}>
            {task.title}
          </div>
          {task.duration && (
            <div style={{ fontSize: 12, color: theme.sub }}>{task.duration} min</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        border: "1px solid " + theme.line,
        borderRadius: 12,
        background: highlight ? "rgba(74,144,226,0.03)" : theme.card,
        transition: "all 220ms ease",
        position: "relative" as const,
        cursor: draggable ? "grab" : "default",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (draggable) {
          e.currentTarget.style.cursor = "grabbing";
          e.currentTarget.style.transform = "scale(1.02)";
        }
      }}
      onMouseLeave={(e) => {
        if (draggable) {
          e.currentTarget.style.cursor = "grab";
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "24px 1fr auto",
          alignItems: "center",
          gap: 10,
          padding: 12,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-label={`Taak: ${task.title}`}
          style={{ 
            width: 18, 
            height: 18, 
            accentColor: theme.accent, 
            cursor: "pointer" 
          }}
        />

        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
          {task.duration && (
            <div style={{ fontSize: 12, color: theme.sub }}>
              ⏱ {task.duration} min
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Zachte prioriteit label - alleen tonen als showPriorityLabel true is */}
          {task.priority != null && showPriorityLabel && (
            <span
              title={PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid " + getPriorityColor(task.priority),
                color: getPriorityColor(task.priority),
                background: "rgba(74,144,226,0.05)",
                fontWeight: 500,
              }}
            >
              {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
            </span>
          )}

          {/* Prioriteit acties - alleen voor overige taken */}
          {!isPriority && onPriorityChange && (
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3].map((priority) => (
                <button
                  key={priority}
                  onClick={() => onPriorityChange(priority)}
                  style={{
                    width: 28,
                    height: 28,
                    border: "1px solid " + theme.line,
                    borderRadius: 6,
                    background: theme.card,
                    color: theme.sub,
                    fontSize: 11,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 200ms ease",
                  }}
                  title={`Promoveren naar ${PRIORITY_LABELS[priority as keyof typeof PRIORITY_LABELS]}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFF";
                    e.currentTarget.style.borderColor = theme.accent;
                    e.currentTarget.style.color = theme.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.card;
                    e.currentTarget.style.borderColor = theme.line;
                    e.currentTarget.style.color = theme.sub;
                  }}
                >
                  {priority}
                </button>
              ))}
            </div>
          )}

          {/* Verwijder prioriteit knop */}
          {isPriority && onRemovePriority && (
            <button
              onClick={onRemovePriority}
              style={{
                width: 24,
                height: 24,
                border: "1px solid " + theme.line,
                borderRadius: 4,
                background: theme.card,
                color: theme.sub,
                fontSize: 10,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 200ms ease",
              }}
              title="Prioriteit verwijderen"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F8FAFF";
                e.currentTarget.style.borderColor = "#EF4444";
                e.currentTarget.style.color = "#EF4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.card;
                e.currentTarget.style.borderColor = theme.line;
                e.currentTarget.style.color = theme.sub;
              }}
            >
              ×
            </button>
          )}

          {/* Drag indicator */}
          {draggable && (
            <div style={{ 
              color: theme.sub, 
              fontSize: 12,
              opacity: 0.6
            }}>
              ⋮⋮
            </div>
          )}
        </div>
      </div>

      {/* lichte feedbackflash */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          pointerEvents: "none",
          transform: "translateX(-9999px)", // offscreen; alleen voor assistive tech rust
          opacity: fade ? 1 : 0,
          transition: "opacity 220ms",
        }}
      >
        ✔️
      </div>
    </div>
  );
}
