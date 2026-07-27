import { useState, useRef } from "react";
import {
  BookMarked, Trash2, Download, Upload, GitCompare,
  CheckSquare, Square, Pencil, X, ChevronDown,
  ChevronRight, Server, Clock, AlertTriangle,
} from "lucide-react";
import ScanResults from "./ScanResults";
import SavedScansSearch, { useSavedScansFilter } from "./SavedScansSearch";

export default function SavedScans({
  savedScans, compareIds, compareScans,
  onDelete, onClearAll, onRename, onToggleCompare,
  onExportAll, onImport, onLoad,
}) {
  const [view,       setView]       = useState("list");
  const [expandedId, setExpandedId] = useState(null);
  const [editingId,  setEditingId]  = useState(null);
  const [editLabel,  setEditLabel]  = useState("");
  const fileInputRef = useRef(null);

  const {
    filtered, query, setQuery,
    scanType, setScanType,
    portFilter, setPortFilter,
    hasFilters, clearFilters,
  } = useSavedScansFilter(savedScans);

  const handleRenameStart  = (scan) => { setEditingId(scan.id); setEditLabel(scan.label); };
  const handleRenameCommit = () => { if (editLabel.trim()) onRename(editingId, editLabel.trim()); setEditingId(null); };
  const handleFileImport   = (e)  => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border bg-terminal-surface shrink-0">
        <div className="flex items-center gap-2">
          <BookMarked size={13} className="text-terminal-purple" />
          <span className="text-xs font-semibold text-terminal-muted uppercase tracking-widest">Saved Scans</span>
          {savedScans.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-terminal-purple/20 text-terminal-purple border border-purple-800">
              {savedScans.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {compareIds.length === 2 && (
            <button
              onClick={() => setView((v) => v === "compare" ? "list" : "compare")}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                view === "compare"
                  ? "text-terminal-cyan border-cyan-700 bg-cyan-900/20"
                  : "text-terminal-muted border-terminal-border hover:text-terminal-cyan"
              }`}
            >
              <GitCompare size={11} /> Compare
            </button>
          )}
          <button onClick={() => fileInputRef.current?.click()} className="text-terminal-muted hover:text-white transition-colors p-1" title="Import"><Upload size={13} /></button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileImport} />
          {savedScans.length > 0 && <button onClick={onExportAll} className="text-terminal-muted hover:text-white transition-colors p-1" title="Export"><Download size={13} /></button>}
          {savedScans.length > 0 && <button onClick={() => { if (window.confirm("Delete all saved scans?")) onClearAll(); }} className="text-terminal-muted hover:text-terminal-red transition-colors p-1" title="Clear all"><Trash2 size={13} /></button>}
        </div>
      </div>

      {/* Search + filters */}
      {savedScans.length > 0 && (
        <SavedScansSearch
          query={query} setQuery={setQuery}
          scanType={scanType} setScanType={setScanType}
          portFilter={portFilter} setPortFilter={setPortFilter}
          hasFilters={hasFilters} clearFilters={clearFilters}
          totalCount={savedScans.length} filteredCount={filtered.length}
        />
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {savedScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-terminal-muted text-xs px-4 text-center">
            <BookMarked size={28} className="opacity-20" />
            <p>No saved scans yet.</p>
            <p className="opacity-60">Scans are saved automatically when they complete.</p>
          </div>
        ) : view === "compare" && compareScans.length === 2 ? (
          <CompareView scans={compareScans} onClose={() => setView("list")} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-terminal-muted text-xs px-4 text-center">
            <p>No scans match your filters.</p>
            <button onClick={clearFilters} className="text-terminal-cyan hover:underline">Clear filters</button>
          </div>
        ) : (
          <ul className="divide-y divide-terminal-border">
            {filtered.map((scan) => {
              const isCompared = compareIds.includes(scan.id);
              const isExpanded = expandedId === scan.id;
              const isEditing  = editingId  === scan.id;

              return (
                <li key={scan.id} className="group">
                  <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors">
                    <button onClick={() => onToggleCompare(scan.id)} className={`shrink-0 transition-colors ${isCompared ? "text-terminal-cyan" : "text-terminal-border hover:text-terminal-muted"}`} title="Toggle comparison">
                      {isCompared ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                    <button className="flex-1 text-left min-w-0" onClick={() => setExpandedId(isExpanded ? null : scan.id)}>
                      {isEditing ? (
                        <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameCommit(); if (e.key === "Escape") setEditingId(null); }}
                          onBlur={handleRenameCommit} onClick={(e) => e.stopPropagation()}
                          className="w-full bg-terminal-bg border border-terminal-cyan rounded px-1 text-xs font-mono text-terminal-cyan outline-none" />
                      ) : (
                        <div className="text-xs font-medium text-white truncate">{scan.label}</div>
                      )}
                      <div className="text-[10px] text-terminal-muted flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5"><Server size={9} />{scan.hostsUp} up</span>
                        <span className="flex items-center gap-0.5"><Clock size={9} />{scan.elapsed}s</span>
                        <span className="opacity-60 truncate" title={scan.savedAt}>{formatRelative(scan.savedAt)}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => onLoad(scan.results)} className="text-terminal-muted hover:text-terminal-green transition-colors p-1" title="Load into results panel"><ChevronRight size={12} /></button>
                      <button onClick={() => handleRenameStart(scan)} className="text-terminal-muted hover:text-terminal-yellow transition-colors p-1" title="Rename"><Pencil size={12} /></button>
                      <button onClick={() => onDelete(scan.id)} className="text-terminal-muted hover:text-terminal-red transition-colors p-1" title="Delete"><Trash2 size={12} /></button>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : scan.id)} className="text-terminal-muted shrink-0">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-3 bg-terminal-bg/40 border-t border-terminal-border">
                      <div className="font-mono text-[11px] text-terminal-muted bg-terminal-bg rounded px-2 py-1.5 mt-2 break-all">
                        <span className="text-terminal-green">❯ </span>
                        <span className="text-terminal-cyan">{scan.command}</span>
                      </div>
                      <div className="max-h-[600px] overflow-y-auto">
                        <ScanResults results={scan.results} compact />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {view === "list" && compareIds.length === 1 && (
        <div className="shrink-0 px-3 py-2 border-t border-terminal-border bg-terminal-surface text-[11px] text-terminal-yellow flex items-center gap-1">
          <AlertTriangle size={11} /> Select one more scan to compare
        </div>
      )}
    </div>
  );
}

// ── Comparison view (unchanged from previous version) ───────────────────────
function CompareView({ scans, onClose }) {
  const [a, b] = scans;
  const portsA = buildPortMap(a.results);
  const portsB = buildPortMap(b.results);
  const allKeys = [...new Set([...Object.keys(portsA), ...Object.keys(portsB)])].sort();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-terminal-surface border-b border-terminal-border shrink-0">
        <span className="text-xs font-semibold text-terminal-cyan flex items-center gap-1">
          <GitCompare size={13} /> Side-by-side comparison
        </span>
        <button onClick={onClose} className="text-terminal-muted hover:text-white"><X size={14} /></button>
      </div>
      <div className="overflow-y-auto flex-1 p-3 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[a, b].map((scan, i) => (
            <div key={scan.id} className={`rounded border p-2 text-xs space-y-1 ${i === 0 ? "border-terminal-cyan bg-cyan-900/10" : "border-terminal-purple bg-purple-900/10"}`}>
              <div className={`font-semibold ${i === 0 ? "text-terminal-cyan" : "text-terminal-purple"}`}>{i === 0 ? "A" : "B"} — {scan.label}</div>
              <div className="text-terminal-muted">{formatRelative(scan.savedAt)}</div>
              <div className="flex gap-3"><span className="text-terminal-green">{scan.hostsUp} up</span><span className="text-terminal-muted">{scan.elapsed}s</span></div>
              <div className="font-mono text-[10px] text-terminal-muted truncate">{scan.command}</div>
            </div>
          ))}
        </div>
        {allKeys.length > 0 && (
          <div>
            <div className="text-[11px] uppercase text-terminal-muted font-semibold mb-1 px-1">Port diff</div>
            <table className="w-full text-[11px] border border-terminal-border rounded overflow-hidden">
              <thead>
                <tr className="bg-terminal-bg text-terminal-muted uppercase">
                  <th className="px-2 py-1 text-left">Port</th>
                  <th className="px-2 py-1 text-center text-terminal-cyan">A</th>
                  <th className="px-2 py-1 text-center text-terminal-purple">B</th>
                  <th className="px-2 py-1 text-left">Service</th>
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key) => {
                  const pa = portsA[key], pb = portsB[key];
                  const onlyA = pa && !pb, onlyB = !pa && pb;
                  const changed = pa && pb && pa.state !== pb.state;
                  const rowClass = onlyA ? "bg-cyan-900/10" : onlyB ? "bg-purple-900/10" : changed ? "bg-yellow-900/10" : "";
                  return (
                    <tr key={key} className={`border-t border-terminal-border ${rowClass}`}>
                      <td className="px-2 py-1 font-mono text-terminal-cyan">{key}</td>
                      <td className="px-2 py-1 text-center"><StateChip state={pa?.state} /></td>
                      <td className="px-2 py-1 text-center"><StateChip state={pb?.state} /></td>
                      <td className="px-2 py-1 text-terminal-muted">
                        {(pa ?? pb)?.service ?? ""}
                        {changed && <span className="ml-1 text-terminal-yellow text-[10px]">changed</span>}
                        {onlyA && <span className="ml-1 text-terminal-cyan text-[10px]">only in A</span>}
                        {onlyB && <span className="ml-1 text-terminal-purple text-[10px]">only in B</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <OsDiff a={a.results} b={b.results} />
      </div>
    </div>
  );
}

function StateChip({ state }) {
  if (!state) return <span className="text-terminal-muted opacity-40">—</span>;
  const c = { open: "text-terminal-green", closed: "text-terminal-red", filtered: "text-terminal-yellow" };
  return <span className={`font-mono ${c[state] ?? "text-gray-400"}`}>{state}</span>;
}

function OsDiff({ a, b }) {
  const osA = a.hosts?.[0]?.os?.[0]?.name, osB = b.hosts?.[0]?.os?.[0]?.name;
  if (!osA && !osB) return null;
  return (
    <div>
      <div className="text-[11px] uppercase text-terminal-muted font-semibold mb-1 px-1">OS Detection</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-cyan-900/10 border border-cyan-900 rounded p-2 text-terminal-cyan">{osA ?? "—"}</div>
        <div className="bg-purple-900/10 border border-purple-900 rounded p-2 text-terminal-purple">{osB ?? "—"}</div>
      </div>
    </div>
  );
}

function buildPortMap(results) {
  const map = {};
  for (const host of results.hosts ?? [])
    for (const port of host.ports ?? [])
      map[`${port.portid}/${port.protocol}`] = { state: port.state, service: [port.service?.name, port.service?.product, port.service?.version].filter(Boolean).join(" ") };
  return map;
}

function formatRelative(iso) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}