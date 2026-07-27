import { useState } from "react";
import {
  Brain, Zap, ShieldAlert, Info, AlertTriangle,
  ChevronDown, ChevronRight, Terminal, Loader2,
  TriangleAlert, X, BadgeCheck, Copy, CheckCheck,
} from "lucide-react";

const SEVERITY_CONFIG = {
  Critical: { color: "text-red-400",    border: "border-red-800",    bg: "bg-red-900/20",    icon: <ShieldAlert size={13} /> },
  High:     { color: "text-orange-400", border: "border-orange-800", bg: "bg-orange-900/20", icon: <TriangleAlert size={13} /> },
  Medium:   { color: "text-yellow-400", border: "border-yellow-800", bg: "bg-yellow-900/20", icon: <AlertTriangle size={13} /> },
  Low:      { color: "text-blue-400",   border: "border-blue-800",   bg: "bg-blue-900/20",   icon: <Info size={13} /> },
  Info:     { color: "text-terminal-muted", border: "border-terminal-border", bg: "bg-terminal-bg", icon: <Info size={13} /> },
};

function riskColor(score) {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-yellow-400";
  return "text-terminal-green";
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="text-terminal-muted hover:text-white transition-colors p-0.5" title="Copy">
      {copied ? <CheckCheck size={12} className="text-terminal-green" /> : <Copy size={12} />}
    </button>
  );
}

function FindingCard({ finding, onRunFollowUp }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.Info;

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.border}`}>
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors ${cfg.bg}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cfg.color}>{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${cfg.color} ${cfg.border} ${cfg.bg}`}>
              {finding.severity}
            </span>
            {finding.port && (
              <code className="text-terminal-cyan text-xs font-mono">{finding.port}</code>
            )}
            <span className="text-white text-xs font-medium truncate">{finding.service}</span>
          </div>
          <p className="text-terminal-muted text-xs mt-0.5 truncate">{finding.vector}</p>
        </div>
        {open ? <ChevronDown size={13} className="text-terminal-muted shrink-0" /> : <ChevronRight size={13} className="text-terminal-muted shrink-0" />}
      </button>

      {open && (
        <div className={`border-t ${cfg.border} px-3 py-3 space-y-3 ${cfg.bg}`}>
          {/* Description */}
          <p className="text-xs text-gray-300 leading-relaxed">{finding.description}</p>

          {/* Exploitation */}
          {finding.exploitation && (
            <div>
              <div className="text-[10px] uppercase text-terminal-muted font-semibold mb-1">Exploitation Approach</div>
              <p className="text-xs text-gray-300 leading-relaxed bg-terminal-bg rounded p-2">{finding.exploitation}</p>
            </div>
          )}

          {/* CVE hints */}
          {finding.cve_hints?.filter(Boolean).length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-terminal-muted font-semibold mb-1">CVE References</div>
              <div className="flex flex-wrap gap-1">
                {finding.cve_hints.filter(Boolean).map((cve) => (
                  <a
                    key={cve}
                    href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2 py-0.5 rounded border border-terminal-border text-terminal-cyan hover:border-terminal-cyan transition-colors font-mono"
                  >
                    {cve}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up command */}
          {finding.follow_up_command && (
            <div>
              <div className="text-[10px] uppercase text-terminal-muted font-semibold mb-1">Suggested Follow-up</div>
              <div className="flex items-center gap-2 bg-terminal-bg rounded px-2 py-1.5">
                <code className="flex-1 text-terminal-cyan font-mono text-xs break-all">
                  {finding.follow_up_command}
                </code>
                <CopyButton text={finding.follow_up_command} />
                <button
                  onClick={() => onRunFollowUp(finding.follow_up_command)}
                  className="text-[11px] px-2 py-0.5 bg-terminal-green text-black rounded font-semibold hover:bg-green-400 transition-colors shrink-0"
                >
                  Run ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPanel({ scanResults, isAnalyzing, rawStream, analysis, error, onAnalyze, onCancel, onRunFollowUp }) {
  const [filterSeverity, setFilterSeverity] = useState("All");
  const severities = ["All", "Critical", "High", "Medium", "Low", "Info"];

  const findings = analysis?.findings ?? [];
  const filtered = filterSeverity === "All"
    ? findings
    : findings.filter((f) => f.severity === filterSeverity);

  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border bg-terminal-surface shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-terminal-purple" />
          <span className="text-xs font-semibold text-terminal-muted uppercase tracking-widest">
            AI Analysis
          </span>
          <span className="text-[10px] text-terminal-muted px-1.5 py-0.5 rounded border border-terminal-border">
            Copilot
          </span>
        </div>
        {isAnalyzing && (
          <button onClick={onCancel} className="flex items-center gap-1 text-[11px] text-terminal-red hover:text-red-400 border border-red-800 px-2 py-0.5 rounded">
            <X size={10} /> Stop
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {/* No scan loaded */}
        {!scanResults && !analysis && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-terminal-muted text-xs text-center px-4">
            <Brain size={28} className="opacity-20" />
            <p>Run a scan first, then click Analyze to get AI-powered attack vector advice.</p>
          </div>
        )}

        {/* Analyze button */}
        {scanResults && !isAnalyzing && (
          <button
            onClick={() => onAnalyze(scanResults)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded border border-terminal-purple text-terminal-purple hover:bg-purple-900/20 transition-colors text-sm font-semibold"
          >
            <Brain size={15} />
            {analysis ? "Re-analyze" : "Analyze with Copilot"}
          </button>
        )}

        {/* Streaming indicator */}
        {isAnalyzing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-terminal-purple">
              <Loader2 size={13} className="animate-spin" />
              Copilot is analyzing your scan…
            </div>
            <div className="bg-terminal-bg rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-[11px] text-terminal-muted whitespace-pre-wrap font-mono leading-relaxed">
                {rawStream || "Waiting for response…"}
              </pre>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-800 bg-red-900/20 rounded p-3 space-y-2">
            <div className="flex items-center gap-1 text-terminal-red text-xs font-semibold">
              <ShieldAlert size={12} /> Analysis error
            </div>
            <p className="text-xs text-red-300">{error}</p>
            {rawStream && (
              <details>
                <summary className="text-[11px] text-terminal-muted cursor-pointer">Raw output</summary>
                <pre className="text-[10px] text-terminal-muted mt-1 whitespace-pre-wrap">{rawStream}</pre>
              </details>
            )}
          </div>
        )}

        {/* Structured results */}
        {analysis && !isAnalyzing && (
          <div className="space-y-4">
            {/* Risk score + summary */}
            <div className="bg-terminal-surface border border-terminal-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-terminal-muted uppercase font-semibold">Risk Score</span>
                <BadgeCheck size={14} className="text-terminal-purple" />
              </div>
              <div className="flex items-end gap-3">
                <span className={`text-4xl font-bold font-mono ${riskColor(analysis.risk_score)}`}>
                  {analysis.risk_score}
                </span>
                <span className="text-terminal-muted text-sm mb-1">/ 100</span>
                {/* Mini bar */}
                <div className="flex-1 h-2 bg-terminal-bg rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      analysis.risk_score >= 80 ? "bg-red-500" :
                      analysis.risk_score >= 60 ? "bg-orange-500" :
                      analysis.risk_score >= 40 ? "bg-yellow-500" : "bg-terminal-green"
                    }`}
                    style={{ width: `${analysis.risk_score}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{analysis.summary}</p>

              {/* Finding counts */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(counts).map(([sev, n]) => {
                  const cfg = SEVERITY_CONFIG[sev] ?? SEVERITY_CONFIG.Info;
                  return (
                    <span key={sev} className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                      {n} {sev}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Severity filter */}
            {findings.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {severities.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                      filterSeverity === s
                        ? "border-terminal-cyan text-terminal-cyan bg-cyan-900/20"
                        : "border-terminal-border text-terminal-muted hover:text-white"
                    }`}
                  >
                    {s}{s !== "All" && counts[s] ? ` (${counts[s]})` : ""}
                  </button>
                ))}
              </div>
            )}

            {/* Finding cards */}
            <div className="space-y-2">
              {filtered.map((f, i) => (
                <FindingCard key={f.id ?? i} finding={f} onRunFollowUp={onRunFollowUp} />
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-terminal-muted text-xs py-4">No findings at this severity level.</p>
              )}
            </div>

            {/* Recommended next scans */}
            {analysis.recommended_next_scans?.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] uppercase text-terminal-muted font-semibold px-1">
                  Recommended Follow-up Scans
                </div>
                {analysis.recommended_next_scans.map((cmd, i) => (
                  <div key={i} className="flex items-center gap-2 bg-terminal-bg border border-terminal-border rounded px-2 py-1.5">
                    <Zap size={11} className="text-terminal-yellow shrink-0" />
                    <code className="flex-1 text-terminal-cyan font-mono text-xs break-all">{cmd}</code>
                    <CopyButton text={cmd} />
                    <button
                      onClick={() => onRunFollowUp(cmd)}
                      className="text-[11px] px-2 py-0.5 bg-terminal-green text-black rounded font-semibold hover:bg-green-400 transition-colors shrink-0"
                    >
                      Run ▶
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Disclaimer */}
            <div className="border border-yellow-900 bg-yellow-900/10 rounded p-2 text-[10px] text-yellow-400 flex gap-1.5">
              <TriangleAlert size={12} className="shrink-0 mt-0.5" />
              Only scan and test systems you own or have explicit written permission to test. Unauthorised scanning may be illegal.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}