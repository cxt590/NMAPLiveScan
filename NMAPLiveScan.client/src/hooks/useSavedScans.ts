import { useState, useEffect, useCallback } from "react";
import type { SavedScan, NmapResults, NmapAddress, NmapHostname } from "../types";

const STORAGE_KEY = "nmap_saved_scans";
const MAX_SAVED = 50;

function loadFromStorage(): SavedScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedScan[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(scans: SavedScan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch {
    console.warn("localStorage quota exceeded — oldest scans will be pruned.");
  }
}

export function useSavedScans() {
  const [savedScans, setSavedScans] = useState<SavedScan[]>(loadFromStorage);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    saveToStorage(savedScans);
  }, [savedScans]);

  /** Save a completed scan result. Returns the new entry. */
  const saveScan = useCallback((results: NmapResults, command?: string): SavedScan => {
    const entry: SavedScan = {
      id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      savedAt: new Date().toISOString(),
      command: command ?? results.args ?? "",
      label: deriveLabel(results),
      hostsUp: Number(results.run_stats?.hosts_up ?? 0),
      elapsed: results.run_stats?.elapsed ?? "?",
      results,
    };
    setSavedScans((prev) => [entry, ...prev].slice(0, MAX_SAVED));
    return entry;
  }, []);

  /** Rename a saved scan */
  const renameScan = useCallback((id: string, newLabel: string) => {
    setSavedScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: newLabel } : s))
    );
  }, []);

  /** Delete one scan */
  const deleteScan = useCallback((id: string) => {
    setSavedScans((prev) => prev.filter((s) => s.id !== id));
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
  }, []);

  /** Clear all saved scans */
  const clearAll = useCallback(() => {
    setSavedScans([]);
    setCompareIds([]);
  }, []);

  /** Toggle a scan in/out of the comparison set (max 2) */
  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((cid) => cid !== id);
      if (prev.length >= 2) return [prev[1], id]; // slide window
      return [...prev, id];
    });
  }, []);

  /** Export all saved scans as a JSON file download */
  const exportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(savedScans, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nmap-saved-scans-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedScans]);

  /** Import from a JSON file (merges, de-dupes by id) */
  const importFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as unknown[];
        if (!Array.isArray(imported)) return;
        setSavedScans((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = (imported as SavedScan[]).filter(
            (s) => s.id && !existingIds.has(s.id)
          );
          return [...newOnes, ...prev].slice(0, MAX_SAVED);
        });
      } catch {
        alert("Could not parse the import file.");
      }
    };
    reader.readAsText(file);
  }, []);

  const getById = useCallback(
    (id: string): SavedScan | null =>
      savedScans.find((s) => s.id === id) ?? null,
    [savedScans]
  );

  const compareScans = compareIds.map(getById).filter((s): s is SavedScan => s !== null);

  return {
    savedScans,
    compareIds,
    compareScans,
    saveScan,
    renameScan,
    deleteScan,
    clearAll,
    toggleCompare,
    exportAll,
    importFile,
    getById,
  };
}

// ── helpers ──────────────────────────────────────────────
function deriveLabel(results: NmapResults): string {
  const hosts = results.hosts ?? [];
  if (hosts.length === 1) {
    const ip = hosts[0].addresses?.find(
      (a: NmapAddress) => a.addrtype === "ipv4" || a.addrtype === "ipv6"
    )?.addr;
    const hn = hosts[0].hostnames?.[0] as NmapHostname | undefined;
    return hn?.name ?? ip ?? "1 host";
  }
  if (hosts.length > 1) return `${hosts.length} hosts`;
  const parts = (results.args ?? "").split(" ");
  return parts[parts.length - 1] || "scan";
}
