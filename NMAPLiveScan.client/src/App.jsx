import { useEffect, useState, useCallback } from "react";
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  PanelLeftClose, PanelLeftOpen, BookMarked, Brain,
} from "lucide-react";
import Terminal        from "./components/Terminal";
import ScanResults     from "./components/ScanResults";
import CommandHistory  from "./components/CommandHistory";
import ScanProfiles    from "./components/ScanProfiles";
import SavedScans      from "./components/SavedScans";
import AnalyticsPanel  from "./components/AnalyticsPanel";
import { useScanner }    from "./hooks/useScanner";
import { useSavedScans } from "./hooks/useSavedScans";
import { useAnalytics }  from "./hooks/useAnalytics";

export default function App() {
  const {
    terminalLines, scanResults, isScanning,
    backendStatus, lastCommand,
    runScan, cancelScan, clearTerminal, checkBackend,
  } = useScanner();

  const {
    savedScans, compareIds, compareScans,
    saveScan, renameScan, deleteScan, clearAll,
    toggleCompare, exportAll, importFile,
  } = useSavedScans();

  const {
    isAnalyzing, rawStream, analysis, error,
    analyze, cancel: cancelAnalysis, reset: resetAnalysis,
  } = useAnalytics();

  const [activeTab,      setActiveTab]      = useState("terminal");
  const [profilesOpen,   setProfilesOpen]   = useState(true);
  const [savedOpen,      setSavedOpen]      = useState(true);
  const [analyticsOpen,  setAnalyticsOpen]  = useState(false);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [loadedResults,  setLoadedResults]  = useState(null);
  // Which results the analytics panel is targeting
  const [analyticsTarget, setAnalyticsTarget] = useState(null);

  useEffect(() => { checkBackend(); }, [checkBackend]);

  useEffect(() => {
    if (scanResults) {
      saveScan(scanResults, lastCommand);
      setActiveTab("results");
      setLoadedResults(null);
      setAnalyticsTarget(scanResults);
    }
  }, [scanResults]); // eslint-disable-line

  const handleProfileApply = useCallback((cmd) => {
    setPendingCommand(cmd);
    if (!cmd.trim().endsWith(" ") && !cmd.includes("<")) {
      setTimeout(() => runScan(cmd), 80);
    }
  }, [runScan]);

  const handleRerun = useCallback((cmd) => {
    setActiveTab("terminal");
    setLoadedResults(null);
    runScan(cmd);
  }, [runScan]);

  const handleLoadSaved = useCallback((results) => {
    setLoadedResults(results);
    setActiveTab("results");
    setAnalyticsTarget(results);
  }, []);

  // Follow-up command from analytics panel → push into terminal
  const handleFollowUp = useCallback((cmd) => {
    setPendingCommand(cmd);
    setActiveTab("terminal");
  }, []);

  const handleOpenAnalytics = useCallback((results) => {
    setAnalyticsTarget(results ?? analyticsTarget);
    setAnalyticsOpen(true);
    resetAnalysis();
  }, [analyticsTarget, resetAnalysis]);

  const displayResults = loadedResults ?? scanResults;

  const StatusBadge = () => {
    if (backendStatus === "ok")      return <span className="flex items-center gap-1 text-xs text-terminal-green"><CheckCircle size={12} /> Connected</span>;
    if (backendStatus === "no-nmap") return <span className="flex items-center gap-1 text-xs text-terminal-yellow"><AlertTriangle size={12} /> nmap missing</span>;
    if (backendStatus === "error")   return <span className="flex items-center gap-1 text-xs text-terminal-red"><XCircle size={12} /> Backend offline</span>;
    return <span className="flex items-center gap-1 text-xs text-terminal-muted animate-pulse">Checking…</span>;
  };

  return (
    <div className="min-h-screen bg-terminal-bg text-gray-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-terminal-border bg-terminal-surface px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setProfilesOpen((v) => !v)} className="text-terminal-muted hover:text-white transition-colors" title="Toggle profiles">
            {profilesOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <Shield size={20} className="text-terminal-green" />
          <span className="font-bold text-terminal-green tracking-wide">NMAP</span>
          <span className="text-terminal-muted font-light">Scanner</span>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge />

          {/* Analytics toggle */}
          <button
            onClick={() => { setAnalyticsOpen((v) => !v); if (!analyticsOpen && displayResults) setAnalyticsTarget(displayResults); }}
            className={`flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded border ${
              analyticsOpen ? "text-terminal-purple border-purple-700 bg-purple-900/20" : "text-terminal-muted border-terminal-border hover:text-white"
            }`}
            title="AI Analysis"
          >
            <Brain size={14} />
            <span className="hidden sm:inline">AI Analysis</span>
            {(isAnalyzing) && <span className="w-1.5 h-1.5 rounded-full bg-terminal-purple animate-pulse" />}
          </button>

          {/* Saved scans toggle */}
          <button
            onClick={() => setSavedOpen((v) => !v)}
            className={`flex items-center gap-1 text-xs transition-colors ${savedOpen ? "text-terminal-purple" : "text-terminal-muted hover:text-white"}`}
            title="Saved scans"
          >
            <BookMarked size={14} />
            {savedScans.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-terminal-purple/20 text-terminal-purple border border-purple-800 text-[10px]">
                {savedScans.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Col 1 — Profiles */}
        {profilesOpen && (
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-terminal-border overflow-hidden">
            <div className="px-3 py-2 border-b border-terminal-border bg-terminal-surface shrink-0">
              <span className="text-xs uppercase font-semibold text-terminal-muted tracking-widest">Profiles &amp; Targets</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ScanProfiles onApply={handleProfileApply} />
            </div>
          </aside>
        )}

        {/* Col 2 — Terminal */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-terminal-border min-h-0">
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            <Terminal
              lines={terminalLines} isScanning={isScanning}
              onRun={runScan} onCancel={cancelScan} onClear={clearTerminal}
              externalInput={pendingCommand}
              onExternalInputConsumed={() => setPendingCommand(null)}
            />
            <CommandHistory lines={terminalLines} onRerun={handleRerun} />
          </div>
        </div>

        {/* Col 3 — Results */}
        <div className="hidden md:flex flex-col border-r border-terminal-border min-h-0 w-[30%] xl:w-[28%] shrink-0">
          <div className="flex items-center border-b border-terminal-border px-4 bg-terminal-surface shrink-0">
            {["terminal", "results"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab ? "border-terminal-green text-terminal-green" : "border-transparent text-terminal-muted hover:text-white"
                }`}
              >
                {tab}
                {tab === "results" && displayResults && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-terminal-green inline-block" />}
              </button>
            ))}
            {displayResults && (
              <button
                onClick={() => handleOpenAnalytics(displayResults)}
                className="ml-auto text-[11px] flex items-center gap-1 text-terminal-purple hover:text-purple-300 transition-colors py-2"
                title="Analyze with Copilot"
              >
                <Brain size={12} /> Analyze
              </button>
            )}
            {loadedResults && (
              <button onClick={() => setLoadedResults(null)} className="text-[10px] text-terminal-muted hover:text-white ml-2" title="Back to live results">
                <XCircle size={12} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "results" ? (
              displayResults ? <ScanResults results={displayResults} /> : (
                <div className="flex flex-col items-center justify-center h-full text-terminal-muted text-sm gap-3">
                  <Shield size={32} className="opacity-30" />
                  <p>Run a scan to see results here</p>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-terminal-muted text-xs opacity-60">Terminal output is in the centre panel</div>
            )}
          </div>
        </div>

        {/* Col 4 — Saved scans */}
        {savedOpen && (
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-terminal-border min-h-0 overflow-hidden">
            <SavedScans
              savedScans={savedScans} compareIds={compareIds} compareScans={compareScans}
              onDelete={deleteScan} onClearAll={clearAll} onRename={renameScan}
              onToggleCompare={toggleCompare} onExportAll={exportAll}
              onImport={importFile} onLoad={handleLoadSaved}
            />
          </aside>
        )}

        {/* Col 5 — Analytics */}
        {analyticsOpen && (
          <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 min-h-0 overflow-hidden">
            <AnalyticsPanel
              scanResults={analyticsTarget}
              isAnalyzing={isAnalyzing}
              rawStream={rawStream}
              analysis={analysis}
              error={error}
              onAnalyze={analyze}
              onCancel={cancelAnalysis}
              onRunFollowUp={handleFollowUp}
            />
          </aside>
        )}
      </div>

      {/* Mobile accordions */}
      <div className="lg:hidden border-t border-terminal-border divide-y divide-terminal-border">
        {[
          { label: "Profiles & Targets", content: <ScanProfiles onApply={handleProfileApply} /> },
          { label: `Saved Scans (${savedScans.length})`, content: <SavedScans savedScans={savedScans} compareIds={compareIds} compareScans={compareScans} onDelete={deleteScan} onClearAll={clearAll} onRename={renameScan} onToggleCompare={toggleCompare} onExportAll={exportAll} onImport={importFile} onLoad={handleLoadSaved} /> },
          { label: "AI Analysis", content: <AnalyticsPanel scanResults={analyticsTarget} isAnalyzing={isAnalyzing} rawStream={rawStream} analysis={analysis} error={error} onAnalyze={analyze} onCancel={cancelAnalysis} onRunFollowUp={handleFollowUp} /> },
        ].map(({ label, content }) => (
          <details key={label} className="bg-terminal-surface">
            <summary className="px-4 py-2 text-xs text-terminal-muted cursor-pointer select-none">▶ {label}</summary>
            <div className="border-t border-terminal-border max-h-96 overflow-y-auto">{content}</div>
          </details>
        ))}
        {displayResults && <div className="p-4"><ScanResults results={displayResults} /></div>}
      </div>
    </div>
  );
}