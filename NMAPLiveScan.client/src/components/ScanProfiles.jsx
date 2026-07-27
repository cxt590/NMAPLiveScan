import { useState } from "react";
import { Zap, Search, Layers, Bug, ChevronDown, ChevronRight, Target, Plus, X, Edit2 } from "lucide-react";

const DEFAULT_PROFILES = [
  {
    id: "quick",
    name: "Quick Scan",
    icon: "zap",
    color: "green",
    description: "Fast ping sweep + top 100 ports. Good first look at a target.",
    flags: "-T4 -F",
    flagDetails: [
      { flag: "-T4", desc: "Aggressive timing (faster)" },
      { flag: "-F",  desc: "Fast mode — top 100 ports only" },
    ],
  },
  {
    id: "service",
    name: "Service Detection",
    icon: "search",
    color: "cyan",
    description: "Identifies software versions running on open ports.",
    flags: "-sV -T4 --version-intensity 5",
    flagDetails: [
      { flag: "-sV",                  desc: "Probe open ports to determine service/version info" },
      { flag: "-T4",                  desc: "Aggressive timing" },
      { flag: "--version-intensity 5", desc: "Medium probe intensity (0–9)" },
    ],
  },
  {
    id: "fullport",
    name: "Full Port Scan",
    icon: "layers",
    color: "yellow",
    description: "Scans all 65 535 TCP ports. Thorough but slow.",
    flags: "-p- -T4 --open",
    flagDetails: [
      { flag: "-p-",    desc: "Scan all 65 535 ports" },
      { flag: "-T4",    desc: "Aggressive timing" },
      { flag: "--open", desc: "Only show open ports" },
    ],
  },
  {
    id: "vuln",
    name: "Vulnerability Scan",
    icon: "bug",
    color: "red",
    description: "Runs NSE vuln scripts + OS & version detection. Requires sudo.",
    flags: "-sV -O --script=vuln -T4",
    flagDetails: [
      { flag: "-sV",           desc: "Version detection" },
      { flag: "-O",            desc: "OS detection (requires sudo)" },
      { flag: "--script=vuln", desc: "Run all vulnerability NSE scripts" },
      { flag: "-T4",           desc: "Aggressive timing" },
    ],
    requiresSudo: true,
  },
  {
    id: "os",
    name: "OS Detection",
    icon: "search",
    color: "purple",
    description: "Detects operating system via TCP/IP fingerprinting. Requires sudo.",
    flags: "-O --osscan-guess",
    flagDetails: [
      { flag: "-O",              desc: "Enable OS detection" },
      { flag: "--osscan-guess",  desc: "Guess OS more aggressively" },
    ],
    requiresSudo: true,
  },
  {
    id: "ping",
    name: "Ping Sweep",
    icon: "zap",
    color: "green",
    description: "Discovers live hosts in a subnet without port scanning.",
    flags: "-sn",
    flagDetails: [
      { flag: "-sn", desc: "Disable port scan — host discovery only" },
    ],
  },
  {
    id: "udp",
    name: "UDP Scan",
    icon: "layers",
    color: "yellow",
    description: "Scans common UDP ports (DNS, DHCP, SNMP…). Requires sudo.",
    flags: "-sU -p 53,67,68,69,123,161,162,500 -T4",
    flagDetails: [
      { flag: "-sU",                                    desc: "UDP scan" },
      { flag: "-p 53,67,68,69,123,161,162,500",        desc: "Common UDP service ports" },
      { flag: "-T4",                                    desc: "Aggressive timing" },
    ],
    requiresSudo: true,
  },
  {
    id: "aggressive",
    name: "Aggressive Scan",
    icon: "bug",
    color: "red",
    description: "All-in-one: OS, version, scripts, traceroute. Requires sudo.",
    flags: "-A -T4",
    flagDetails: [
      { flag: "-A",  desc: "Enables OS detection, version detection, script scanning, and traceroute" },
      { flag: "-T4", desc: "Aggressive timing" },
    ],
    requiresSudo: true,
  },
];

const ICON_MAP = {
  zap:    <Zap    size={14} />,
  search: <Search size={14} />,
  layers: <Layers size={14} />,
  bug:    <Bug    size={14} />,
};

const COLOR_MAP = {
  green:  { badge: "text-terminal-green  border-green-800  bg-green-900/20",  dot: "bg-terminal-green"  },
  cyan:   { badge: "text-terminal-cyan   border-cyan-800   bg-cyan-900/20",   dot: "bg-terminal-cyan"   },
  yellow: { badge: "text-terminal-yellow border-yellow-800 bg-yellow-900/20", dot: "bg-terminal-yellow" },
  red:    { badge: "text-terminal-red    border-red-800    bg-red-900/20",    dot: "bg-terminal-red"    },
  purple: { badge: "text-terminal-purple border-purple-800 bg-purple-900/20", dot: "bg-terminal-purple" },
};

export default function ScanProfiles({ onApply }) {
  const [target, setTarget]               = useState("");
  const [selectedProfile, setSelected]    = useState(null);
  const [expandedProfile, setExpanded]    = useState(null);
  const [customTargets, setCustomTargets] = useState([]);
  const [newTarget, setNewTarget]         = useState("");
  const [addingTarget, setAddingTarget]   = useState(false);

  const buildCommand = (profile, tgt) => {
    const t = tgt || target;
    if (!t.trim()) return null;
    const sudo = profile.requiresSudo ? "sudo " : "";
    return `${sudo}nmap ${profile.flags} ${t.trim()}`;
  };

  const handleApply = (profile, tgt) => {
    const cmd = buildCommand(profile, tgt);
    if (cmd) {
      onApply(cmd);
    } else {
      // Still fill in the command stub so user just needs to add target
      const sudo = profile.requiresSudo ? "sudo " : "";
      onApply(`${sudo}nmap ${profile.flags} `);
    }
  };

  const addCustomTarget = () => {
    const t = newTarget.trim();
    if (t && !customTargets.includes(t)) {
      setCustomTargets((prev) => [...prev, t]);
      setTarget(t);
    }
    setNewTarget("");
    setAddingTarget(false);
  };

  const QUICK_TARGETS = [
    { label: "scanme.nmap.org", value: "scanme.nmap.org" },
    { label: "localhost",        value: "127.0.0.1"       },
    { label: "Local subnet",     value: "192.168.1.0/24"  },
    { label: "Local gateway",    value: "192.168.1.1"     },
    ...customTargets.map((t) => ({ label: t, value: t })),
  ];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* ── Target selector ─────────────────────────────── */}
      <section className="bg-terminal-surface border border-terminal-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase font-semibold text-terminal-muted flex items-center gap-1">
            <Target size={12} /> Target
          </h3>
          <button
            onClick={() => setAddingTarget((v) => !v)}
            className="text-terminal-muted hover:text-terminal-cyan transition-colors"
            title="Add custom target"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Quick-select chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TARGETS.map((qt) => (
            <button
              key={qt.value}
              onClick={() => setTarget(qt.value === target ? "" : qt.value)}
              className={`text-xs px-2 py-0.5 rounded-full border font-mono transition-colors ${
                target === qt.value
                  ? "border-terminal-cyan text-terminal-cyan bg-cyan-900/20"
                  : "border-terminal-border text-terminal-muted hover:border-terminal-cyan hover:text-terminal-cyan"
              }`}
            >
              {qt.label}
            </button>
          ))}
        </div>

        {/* Add custom target inline */}
        {addingTarget && (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomTarget();
                if (e.key === "Escape") setAddingTarget(false);
              }}
              placeholder="IP, hostname or CIDR…"
              className="flex-1 bg-terminal-bg border border-terminal-border text-terminal-cyan rounded px-2 py-1 text-xs font-mono outline-none focus:border-terminal-cyan"
            />
            <button
              onClick={addCustomTarget}
              className="text-xs px-2 py-1 bg-terminal-green text-black rounded font-semibold hover:bg-green-400 transition-colors"
            >
              Add
            </button>
            <button onClick={() => setAddingTarget(false)} className="text-terminal-muted hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Free-text override */}
        <div className="flex items-center gap-1 mt-1">
          <Edit2 size={11} className="text-terminal-muted shrink-0" />
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="or type any target…"
            className="flex-1 bg-transparent text-xs font-mono text-terminal-cyan placeholder-terminal-muted outline-none border-b border-terminal-border focus:border-terminal-cyan"
          />
        </div>
      </section>

      {/* ── Profile cards ───────────────────────────────── */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase font-semibold text-terminal-muted px-1">Scan Profiles</h3>

        {DEFAULT_PROFILES.map((profile) => {
          const colors   = COLOR_MAP[profile.color] ?? COLOR_MAP.green;
          const isOpen   = expandedProfile === profile.id;
          const cmd      = buildCommand(profile, target);

          return (
            <div
              key={profile.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                selectedProfile === profile.id
                  ? "border-terminal-cyan bg-cyan-900/10"
                  : "border-terminal-border bg-terminal-surface hover:border-terminal-muted"
              }`}
            >
              {/* Card header row */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Expand toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : profile.id)}
                  className="text-terminal-muted hover:text-white transition-colors shrink-0"
                >
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {/* Icon + name */}
                <button
                  className="flex items-center gap-2 flex-1 text-left"
                  onClick={() => {
                    setSelected(profile.id);
                    setExpanded(profile.id);
                  }}
                >
                  <span className={`${colors.badge} p-1 rounded border`}>
                    {ICON_MAP[profile.icon]}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white leading-tight">{profile.name}</div>
                    {profile.requiresSudo && (
                      <span className="text-[10px] text-terminal-yellow">requires sudo</span>
                    )}
                  </div>
                </button>

                {/* Apply button */}
                <button
                  onClick={() => handleApply(profile)}
                  className={`shrink-0 text-xs px-2 py-1 rounded border font-medium transition-colors ${
                    target
                      ? `${colors.badge} hover:opacity-80`
                      : "text-terminal-muted border-terminal-border hover:text-white"
                  }`}
                  title={target ? `Run: ${cmd}` : "Select a target first (or click to fill flags only)"}
                >
                  {target ? "Run ▶" : "Fill →"}
                </button>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-terminal-border px-3 py-2 space-y-2 bg-terminal-bg/40">
                  <p className="text-xs text-terminal-muted">{profile.description}</p>

                  {/* Flag breakdown */}
                  <div className="space-y-1">
                    {profile.flagDetails.map((fd) => (
                      <div key={fd.flag} className="flex items-start gap-2 text-xs">
                        <code className={`shrink-0 font-mono px-1.5 py-0.5 rounded border ${colors.badge}`}>
                          {fd.flag}
                        </code>
                        <span className="text-terminal-muted pt-0.5">{fd.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Preview command */}
                  <div className="bg-terminal-bg rounded p-2 font-mono text-xs">
                    <span className="text-terminal-muted">$ </span>
                    <span className="text-terminal-cyan">
                      {cmd ?? (
                        <>
                          {profile.requiresSudo ? "sudo " : ""}nmap {profile.flags}{" "}
                          <span className="text-terminal-yellow italic">&lt;target&gt;</span>
                        </>
                      )}
                    </span>
                  </div>

                  <button
                    onClick={() => handleApply(profile)}
                    className={`w-full text-xs py-1.5 rounded border font-semibold transition-colors ${
                      target
                        ? `${colors.badge} hover:opacity-80`
                        : "text-terminal-muted border-terminal-border hover:text-white"
                    }`}
                  >
                    {target ? `▶ Run against ${target}` : "→ Fill into terminal (add target)"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}