import { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, X, Square } from "lucide-react";
import type { TerminalLine, TerminalLineType } from "../types";

const SUGGESTIONS = [
  "nmap -sV -p 80,443 scanme.nmap.org",
  "nmap -sn 192.168.1.0/24",
  "nmap -A -T4 scanme.nmap.org",
  "nmap -sU -p 53,67,123 192.168.1.1",
  "nmap --script=http-title scanme.nmap.org",
  "nmap -p- --open -T4 scanme.nmap.org",
];

interface TerminalProps {
  lines: TerminalLine[];
  isScanning: boolean;
  onRun: (cmd: string) => void;
  onCancel: () => void;
  onClear: () => void;
  externalInput?: string | null;
  onExternalInputConsumed?: () => void;
}

export default function Terminal({
  lines,
  isScanning,
  onRun,
  onCancel,
  onClear,
  externalInput,
  onExternalInputConsumed,
}: TerminalProps) {
  const [input, setInput] = useState("nmap ");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestion, setSuggestion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalInput !== undefined && externalInput !== null) {
      setInput(externalInput);
      setSuggestion("");
      setTimeout(() => {
        inputRef.current?.focus();
        const len = externalInput.length;
        inputRef.current?.setSelectionRange(len, len);
      }, 0);
      onExternalInputConsumed?.();
    }
  }, [externalInput, onExternalInputConsumed]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || isScanning) return;
    setHistory((h) => [cmd, ...h]);
    setHistoryIndex(-1);
    onRun(cmd);
    setInput("nmap ");
    setSuggestion("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(idx);
      setInput(history[idx] ?? "nmap ");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(historyIndex - 1, -1);
      setHistoryIndex(idx);
      setInput(idx === -1 ? "nmap " : history[idx]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestion) setInput(suggestion);
    } else if (e.key === "c" && e.ctrlKey && isScanning) {
      e.preventDefault();
      onCancel();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      onClear();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.length > 5) {
      const match = SUGGESTIONS.find((s) => s.startsWith(val) && s !== val);
      setSuggestion(match ?? "");
    } else {
      setSuggestion("");
    }
  };

  const lineColor = (type: TerminalLineType): string => {
    switch (type) {
      case "command": return "text-terminal-cyan font-semibold";
      case "error":   return "text-terminal-red";
      case "success": return "text-terminal-green";
      default:        return "text-gray-300";
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg border border-terminal-border rounded-lg overflow-hidden shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-terminal-surface border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:bg-red-400" onClick={onClear} title="Clear" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex items-center gap-2 text-terminal-muted text-xs">
          <TerminalIcon size={14} />
          <span>nmap terminal</span>
          {isScanning && (
            <span className="flex items-center gap-1 text-terminal-yellow">
              <span className="w-2 h-2 rounded-full bg-terminal-yellow animate-pulse" />
              scanning...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isScanning && (
            <button
              onClick={onCancel}
              className="text-terminal-red text-xs hover:text-red-400 flex items-center gap-1 px-2 py-0.5 border border-terminal-red rounded"
            >
              <Square size={10} /> Stop
            </button>
          )}
          <button
            onClick={onClear}
            className="text-terminal-muted text-xs hover:text-white flex items-center gap-1 px-2 py-0.5 border border-terminal-border rounded"
          >
            <X size={10} /> Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-0.5 min-h-0"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 && (
          <div className="text-terminal-muted text-xs space-y-1">
            <p>Welcome to the nmap terminal. Type a command or pick a profile on the left.</p>
            <p>Tip: ↑/↓ history · Tab autocomplete · Ctrl+C cancel · Ctrl+L clear</p>
          </div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`${lineColor(line.type)} whitespace-pre-wrap leading-5`}>
            {line.type === "command" && <span className="text-terminal-green mr-2">❯</span>}
            {line.text}
          </div>
        ))}
        {isScanning && (
          <div className="flex items-center gap-1 text-terminal-yellow text-xs mt-1">
            <span className="cursor-blink">█</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-terminal-border px-4 py-3 bg-terminal-surface">
        <div className="flex items-center gap-2 relative">
          <span className="text-terminal-green font-bold select-none">❯</span>
          <div className="relative flex-1">
            {suggestion && (
              <span
                className="absolute inset-0 pointer-events-none text-terminal-muted font-mono text-sm"
                style={{ top: "1px" }}
              >
                <span className="invisible">{input}</span>
                <span>{suggestion.slice(input.length)}</span>
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isScanning}
              className="w-full bg-transparent outline-none text-terminal-cyan caret-terminal-green font-mono text-sm disabled:opacity-50"
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              placeholder={isScanning ? "scanning..." : "nmap [options] <target>"}
            />
          </div>
          <button
            type="submit"
            disabled={isScanning || !input.trim()}
            className="text-xs px-3 py-1 bg-terminal-green text-black rounded font-semibold disabled:opacity-40 hover:bg-green-400 transition-colors"
          >
            Run
          </button>
        </div>
      </form>
    </div>
  );
}
