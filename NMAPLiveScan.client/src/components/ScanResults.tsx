import { Clock, Server, Activity, Download } from "lucide-react";
import HostCard from "./HostCard";
import type { NmapResults } from "../types";

interface ScanResultsProps {
  results: NmapResults;
  compact?: boolean;
}

export default function ScanResults({ results }: ScanResultsProps) {
  if (!results) return null;

  const { scanner, version, args, start_time, scan_info, hosts, run_stats } = results;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nmap-scan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 fade-in">
      {/* Scan summary header */}
      <div className="bg-terminal-surface border border-terminal-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-terminal-green font-semibold flex items-center gap-2">
            <Activity size={16} /> Scan Results
          </h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-xs text-terminal-muted hover:text-white border border-terminal-border px-2 py-1 rounded transition-colors"
          >
            <Download size={12} /> Export JSON
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Scanner" value={`${scanner} ${version}`} color="cyan" />
          <Stat label="Hosts Up" value={String(run_stats?.hosts_up ?? "?")} color="green" />
          <Stat label="Hosts Down" value={String(run_stats?.hosts_down ?? "?")} color="red" />
          <Stat label="Duration" value={`${run_stats?.elapsed ?? "?"}s`} color="yellow" />
        </div>

        {/* Scan metadata */}
        <div className="text-xs text-terminal-muted font-mono bg-terminal-bg rounded p-2 space-y-1">
          <div><span className="text-terminal-purple">command:</span> {args}</div>
          {start_time && <div><span className="text-terminal-purple">started:</span> {start_time}</div>}
          {run_stats?.end_time && <div><span className="text-terminal-purple">ended:</span> {run_stats.end_time}</div>}
          {scan_info?.map((si, i) => (
            <div key={i}>
              <span className="text-terminal-purple">scan type:</span> {si.type} ({si.protocol}) — {si.num_services} services
            </div>
          ))}
          {run_stats?.summary && <div><span className="text-terminal-purple">summary:</span> {run_stats.summary}</div>}
        </div>
      </div>

      {/* Hosts */}
      {hosts.length === 0 ? (
        <div className="text-center py-8 text-terminal-muted text-sm">
          No hosts found in scan results.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-terminal-muted uppercase font-semibold flex items-center gap-2">
            <Server size={12} /> {hosts.length} host{hosts.length !== 1 ? "s" : ""} discovered
          </div>
          {hosts.map((host, i) => (
            <HostCard key={i} host={host} />
          ))}
        </div>
      )}
    </div>
  );
}

type StatColor = "cyan" | "green" | "red" | "yellow";

interface StatProps {
  label: string;
  value: string;
  color: StatColor;
}

function Stat({ label, value, color }: StatProps) {
  const colorMap: Record<StatColor, string> = {
    cyan: "text-terminal-cyan",
    green: "text-terminal-green",
    red: "text-terminal-red",
    yellow: "text-terminal-yellow",
  };
  return (
    <div className="bg-terminal-bg rounded p-2 text-center">
      <div className={`text-lg font-bold font-mono ${colorMap[color]}`}>{value}</div>
      <div className="text-terminal-muted text-xs">{label}</div>
    </div>
  );
}
