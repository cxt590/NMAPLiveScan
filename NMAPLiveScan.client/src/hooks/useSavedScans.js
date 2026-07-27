import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "nmap_saved_scans";
const MAX_SAVED = 50;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(scans) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
  } catch {
    console.warn("localStorage quota exceeded — oldest scans will be pruned.");
  }
}

export function useSavedScans() {
  const [savedScans, setSavedScans] = useState(loadFromStorage);
  // Up to 2 scan IDs selected for side-by-side comparison
  const [compareIds, setCompareIds] = useState([]);

  // Persist on every change
  useEffect(() => {
    saveToStorage(savedScans);
  }, [savedScans]);

  /** Save a completed scan result. Returns the new entry. */
  const saveScan = useCallback((results, command) => {
    const entry = {
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
  const renameScan = useCallback((id, newLabel) => {
    setSavedScans((prev) =>
      prev.map((s) => (s.id === id ? { ...s, label: newLabel } : s))
    );
  }, []);

  /** Delete one scan */
  const deleteScan = useCallback((id) => {
    setSavedScans((prev) => prev.filter((s) => s.id !== id));
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
  }, []);

  /** Clear all saved scans */
  const clearAll = useCallback(() => {
    setSavedScans([]);
    setCompareIds([]);
  }, []);

  /** Toggle a scan in/out of the comparison set (max 2) */
  const toggleCompare = useCallback((id) => {
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
  const importFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) return;
        setSavedScans((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = imported.filter((s) => s.id && !existingIds.has(s.id));
          return [...newOnes, ...prev].slice(0, MAX_SAVED);
        });
      } catch {
        alert("Could not parse the import file.");
      }
    };
    reader.readAsText(file);
  }, []);

  const getById = useCallback(
    (id) => savedScans.find((s) => s.id === id) ?? null,
    [savedScans]
  );

  const compareScans = compareIds.map(getById).filter(Boolean);

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
function deriveLabel(results) {
  const hosts = results.hosts ?? [];
  if (hosts.length === 1) {
    const ip = hosts[0].addresses?.find(
      (a) => a.addrtype === "ipv4" || a.addrtype === "ipv6"
    )?.addr;
    const hn = hosts[0].hostnames?.[0]?.name;
    return hn || ip || "1 host";
  }
  if (hosts.length > 1) return `${hosts.length} hosts`;
  // Fall back to target from the args string
  const parts = (results.args ?? "").split(" ");
  return parts[parts.length - 1] || "scan";
}