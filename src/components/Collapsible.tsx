import React, { useState, useId } from "react";

const theme = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  text: "#2F3441",
  sub: "rgba(47,52,65,0.75)",
  line: "#E6E8EE",
  accent: "#4A90E2",
  soft: "rgba(74,144,226,0.06)",
};

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** Eenvoudige inklapper zonder zware animaties. */
export default function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div>
      <button
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid " + theme.line,
          background: theme.card,
          color: theme.text,
          cursor: "pointer",
          transition: "all 200ms ease",
          fontWeight: 600,
          fontSize: 14,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F8F9FA";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.card;
        }}
      >
        <span>{title}</span>
        <span 
          style={{ 
            color: theme.sub,
            fontSize: 16,
            transition: "transform 200ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)"
          }}
        >
          ▾
        </span>
      </button>

      <div
        id={id}
        style={{
          marginTop: open ? 12 : 0,
          maxHeight: open ? 1200 : 0,
          overflow: "hidden",
          transition: "max-height 300ms ease, margin-top 300ms ease, opacity 300ms ease",
          opacity: open ? 1 : 0,
        }}
      >
        {open && children}
      </div>
    </div>
  );
}
