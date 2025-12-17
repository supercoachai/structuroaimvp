import { useEffect } from "react";

export function useTaskShortcuts({ onAdd, onPromote1, onPromote2, onPromote3, onFocus, onDelete }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in input fields
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      // Task shortcuts
      if (e.key === "1") onPromote1?.();
      if (e.key === "2") onPromote2?.();
      if (e.key === "3") onPromote3?.();
      if (e.key.toLowerCase() === "f") onFocus?.();
      if (e.key === "Enter") onAdd?.();
      if (e.key === "Backspace") onDelete?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAdd, onPromote1, onPromote2, onPromote3, onFocus, onDelete]);
}
