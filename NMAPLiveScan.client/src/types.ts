// ── NMAP scan data types ─────────────────────────────────────────────────────

export interface NmapAddress {
  addr: string;
  addrtype: "ipv4" | "ipv6" | "mac";
  vendor?: string;
}

export interface NmapHostname {
  name: string;
  type: string;
}

export interface NmapScript {
  id: string;
  output: string;
}

export interface NmapService {
  name?: string;
  product?: string;
  version?: string;
  extrainfo?: string;
  tunnel?: string;
  cpe?: string[];
}

export interface NmapPort {
  portid: string;
  protocol: string;
  state: "open" | "closed" | "filtered" | string;
  reason?: string;
  service?: NmapService;
  scripts: NmapScript[];
}

export interface NmapOsClass {
  type?: string;
  vendor?: string;
  osfamily?: string;
  osgen?: string;
  accuracy?: string;
}

export interface NmapOs {
  name: string;
  accuracy: string;
  osclass?: NmapOsClass[];
}

export interface NmapUptime {
  seconds: string;
  lastboot?: string;
}

export interface NmapHost {
  addresses: NmapAddress[];
  hostnames: NmapHostname[];
  status: "up" | "down" | string;
  ports: NmapPort[];
  os: NmapOs[];
  uptime?: NmapUptime;
  distance?: string | number;
  scripts: NmapScript[];
}

export interface NmapScanInfo {
  type: string;
  protocol: string;
  num_services: string;
  services?: string;
}

export interface NmapRunStats {
  hosts_up?: string | number;
  hosts_down?: string | number;
  hosts_total?: string | number;
  elapsed?: string;
  end_time?: string;
  summary?: string;
  exit?: string;
}

export interface NmapResults {
  scanner: string;
  version: string;
  args: string;
  start_time?: string;
  scan_info?: NmapScanInfo[];
  hosts: NmapHost[];
  run_stats?: NmapRunStats;
}

// ── Terminal types ────────────────────────────────────────────────────────────

export type TerminalLineType = "command" | "output" | "error" | "success";

export interface TerminalLine {
  type: TerminalLineType;
  text: string;
}

// ── Backend status ────────────────────────────────────────────────────────────

export type BackendStatus = "unknown" | "ok" | "no-nmap" | "error";

// ── Saved scan types ──────────────────────────────────────────────────────────

export interface SavedScan {
  id: string;
  savedAt: string;
  command: string;
  label: string;
  hostsUp: number;
  elapsed: string;
  results: NmapResults;
}

// ── Analytics / AI analysis types ────────────────────────────────────────────

export interface AnalysisFinding {
  id?: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info" | string;
  service: string;
  port?: string;
  vector: string;
  description: string;
  exploitation?: string;
  cve_hints?: string[];
  follow_up_command?: string;
}

export interface Analysis {
  risk_score: number;
  summary: string;
  findings: AnalysisFinding[];
  recommended_next_scans?: string[];
}

// ── Scan profile types ────────────────────────────────────────────────────────

export interface FlagDetail {
  flag: string;
  desc: string;
}

export type ProfileColor = "green" | "cyan" | "yellow" | "red" | "purple";
export type ProfileIcon = "zap" | "search" | "layers" | "bug";

export interface ScanProfile {
  id: string;
  name: string;
  icon: ProfileIcon;
  color: ProfileColor;
  description: string;
  flags: string;
  flagDetails: FlagDetail[];
  requiresSudo?: boolean;
}
