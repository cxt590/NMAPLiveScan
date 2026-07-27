import { useState, useRef, useCallback } from "react";
import type { TerminalLine, NmapResults, BackendStatus } from "../types";

interface ScanEventData {
  type: "output" | "error" | "exit" | "results";
  line?: string;
  message?: string;
  code?: number;
  data?: NmapResults;
}

export function useScanner() {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [scanResults, setScanResults] = useState<NmapResults | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const [lastCommand, setLastCommand] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setBackendStatus(data.nmap_available ? "ok" : "no-nmap");
      return data;
    } catch {
      setBackendStatus("error");
      return null;
    }
  }, []);

  const appendLine = useCallback((line: TerminalLine) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  const runScan = useCallback(
    (command: string) => {
      if (isScanning) return;

      setScanResults(null);
      setIsScanning(true);
      setLastCommand(command);

      appendLine({ type: "command", text: command });

      const encoded = encodeURIComponent(command);
      const es = new EventSource(`/api/scan?command=${encoded}`);
      eventSourceRef.current = es;

      es.onmessage = (event: MessageEvent) => {
        const data: ScanEventData = JSON.parse(event.data as string);

        if (data.type === "output") {
          appendLine({ type: "output", text: data.line ?? "" });
        } else if (data.type === "error") {
          appendLine({ type: "error", text: `Error: ${data.message ?? ""}` });
          es.close();
          setIsScanning(false);
        } else if (data.type === "exit") {
          appendLine({
            type: data.code === 0 ? "success" : "error",
            text: `\n[Process exited with code ${data.code}]`,
          });
        } else if (data.type === "results") {
          setScanResults(data.data ?? null);
          es.close();
          setIsScanning(false);
        }
      };

      es.onerror = () => {
        appendLine({ type: "error", text: "[Connection to backend lost]" });
        es.close();
        setIsScanning(false);
      };
    },
    [isScanning, appendLine]
  );

  const cancelScan = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      appendLine({ type: "error", text: "[Scan cancelled by user]" });
      setIsScanning(false);
    }
  }, [appendLine]);

  const clearTerminal = useCallback(() => {
    setTerminalLines([]);
    setScanResults(null);
  }, []);

  return {
    terminalLines,
    scanResults,
    isScanning,
    backendStatus,
    lastCommand,
    runScan,
    cancelScan,
    clearTerminal,
    checkBackend,
  };
}
