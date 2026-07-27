import { useState, useMemo } from "react";
import { Search, X, Filter } from "lucide-react";
import type { SavedScan } from "../types";

const SCAN_TYPES = [
  { label: "Any type", value: "" },
  { label: "Quick (-F)",           value: "-F" },
  { label: "Service (-sV)",        value: "-sV" },
  { label: "Full port (-p-)",      value: "-p-" },
  { label: "Vuln (--script=vuln)", value: "--script=vuln" },
  { label: "OS detect (-O)",       value: "-O" },
  { label: "Ping sweep (-sn)",     value: "-sn" },
  { label: "UDP (-sU)",            value: "-sU" },
  { label: "Aggressive (-A)",      value: "-A" },
];

export function useSavedScansFilter(savedScans: SavedScan[]) {
  const [query,      setQuery]      = useState("");
  const [scanType,   setScanType]   = useState("");
  const [portFilter, setPortFilter] = useState("");

  const filtered = useMemo(() => {
    const q  = query.trim().toLowerCase();
    const pf = portFilter.trim();

    return savedScans.filter((scan) => {
      if (q) {
        const targets = [
          scan.label,
          scan.command,
          ...(scan.results.hosts ?? []).flatMap((h) => [
            ...h.addresses.map((a) => a.addr),
            ...h.hostnames.map((hn) => hn.name),
          ]),
        ].join(" ").toLowerCase();
        if (!targets.includes(q)) return false;
      }

      if (scanType && !scan.command.includes(scanType)) return false;

      if (pf) {
        const allPorts = (scan.results.hosts ?? [])
          .flatMap((h) => h.ports ?? [])
          .map((p) => String(p.portid));
        if (!allPorts.includes(pf)) return false;
      }

      return true;
    });
  }, [savedScans, query, scanType, portFilter]);

  return {
    filtered,
    query,      setQuery,
    scanType,   setScanType,
    portFilter, setPortFilter,
    hasFilters: !!(query || scanType || portFilter),
    clearFilters: () => { setQuery(""); setScanType(""); setPortFilter(""); },
  };
}

interface SavedScansSearchProps {
  query: string;
  setQuery: (v: string) => void;
  scanType: string;
  setScanType: (v: string) => void;
  portFilter: string;
  setPortFilter: (v: string) => void;
  hasFilters: boolean;
  clearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function SavedScansSearch({
  query, setQuery,
  scanType, setScanType,
  portFilter, setPortFilter,
  hasFilters, clearFilters,
  totalCount, filteredCount,
}: SavedScansSearchProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2 px-3 pt-2 pb-1 border-b border-terminal-border bg-terminal-bg/60 shrink-0">
      {/* Search row */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 flex-1 bg-terminal-bg border border-terminal-border rounded px-2 py-1 focus-within:border-terminal-cyan transition-colors">
          <Search size={12} className="text-terminal-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search target, IP, command…"
            className="flex-1 bg-transparent text-xs font-mono text-terminal-cyan placeholder-terminal-muted outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-terminal-muted hover:text-white">
              <X size={11} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors ${
            showFilters || scanType || portFilter
              ? "border-terminal-cyan text-terminal-cyan bg-cyan-900/20"
              : "border-terminal-border text-terminal-muted hover:text-white"
          }`}
        >
          <Filter size={11} />
          Filters
          {(scanType || portFilter) && (
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-cyan inline-block" />
          )}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-terminal-muted hover:text-terminal-red text-[11px] transition-colors" title="Clear all filters">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {/* Scan type */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <label className="text-[10px] text-terminal-muted uppercase shrink-0">Type</label>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-1.5 py-1 text-[11px] text-terminal-cyan outline-none focus:border-terminal-cyan font-mono"
            >
              {SCAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {/* Port filter */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
            <label className="text-[10px] text-terminal-muted uppercase shrink-0">Port</label>
            <input
              type="text"
              value={portFilter}
              onChange={(e) => setPortFilter(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 443"
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-1.5 py-1 text-[11px] text-terminal-cyan font-mono outline-none focus:border-terminal-cyan"
            />
          </div>
        </div>
      )}

      {/* Result count */}
      {hasFilters && (
        <div className="text-[10px] text-terminal-muted">
          {filteredCount} of {totalCount} scan{totalCount !== 1 ? "s" : ""} match
        </div>
      )}
    </div>
  );
}
