import { History, ChevronRight } from "lucide-react";
import type { TerminalLine } from "../types";

interface CommandHistoryProps {
  lines: TerminalLine[];
  onRerun: (cmd: string) => void;
}

export default function CommandHistory({ lines, onRerun }: CommandHistoryProps) {
  const commands = lines.filter((l) => l.type === "command").map((l) => l.text);
  const unique = [...new Set(commands)].reverse();

  if (unique.length === 0) return null;

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3 space-y-2">
      <div className="text-xs text-terminal-muted uppercase font-semibold flex items-center gap-2">
        <History size={12} /> Recent Commands
      </div>
      {unique.slice(0, 8).map((cmd, i) => (
        <button
          key={i}
          onClick={() => onRerun(cmd)}
          className="w-full flex items-center gap-2 text-xs text-left hover:text-terminal-cyan text-terminal-muted transition-colors font-mono group"
        >
          <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 shrink-0" />
          <span className="truncate">{cmd}</span>
        </button>
      ))}
    </div>
  );
}
