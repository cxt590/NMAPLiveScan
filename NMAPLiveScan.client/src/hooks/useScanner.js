import { useState, useRef, useCallback } from "react";

export function useScanner() {
  const [terminalLines, setTerminalLines] = useState([]);
  const [scanResults, setScanResults]     = useState(null);
  const [isScanning, setIsScanning]       = useState(false);
  const [backendStatus, setBackendStatus] = useState("unknown");
  const [lastCommand, setLastCommand]     = useState("");   // ← NEW
  const eventSourceRef = useRef(null);

  const checkBackend = useCallback(async () => {
    try {
      const res  = await fetch("/api/health");
      const data = await res.json();
      setBackendStatus(data.nmap_available ? "ok" : "no-nmap");
      return data;
    } catch {
      setBackendStatus("error");
      return null;
    }
  }, []);

  const appendLine = useCallback((line) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  const runScan = useCallback(
    (command) => {
      if (isScanning) return;

      setScanResults(null);
      setIsScanning(true);
      setLastCommand(command);      // ← NEW

      appendLine({ type: "command", text: command });

      const encoded = encodeURIComponent(command);
      const es      = new EventSource(`/api/scan?command=${encoded}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "output") {
          appendLine({ type: "output", text: data.line });
        } else if (data.type === "error") {
          appendLine({ type: "error", text: `Error: ${data.message}` });
          es.close();
          setIsScanning(false);
        } else if (data.type === "exit") {
          appendLine({
            type: data.code === 0 ? "success" : "error",
            text: `\n[Process exited with code ${data.code}]`,
          });
        } else if (data.type === "results") {
          setScanResults(data.data);
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
    lastCommand,        // ← NEW
    runScan,
    cancelScan,
    clearTerminal,
    checkBackend,
  };
}