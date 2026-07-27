import { useState } from "react";
import { ChevronDown, ChevronRight, Monitor, Globe, Shield, Clock } from "lucide-react";
import type { NmapHost } from "../types";

const STATE_COLORS: Record<string, string> = {
  open: "text-terminal-green bg-green-900/30 border-green-800",
  closed: "text-terminal-red bg-red-900/30 border-red-800",
  filtered: "text-terminal-yellow bg-yellow-900/30 border-yellow-800",
};

interface HostCardProps {
  host: NmapHost;
  index: number;
}

export default function HostCard({ host, index: _index }: HostCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [expandedPorts, setExpandedPorts] = useState<Record<string, boolean>>({});

  const ipAddr = host.addresses.find((a) => a.addrtype === "ipv4" || a.addrtype === "ipv6");
  const macAddr = host.addresses.find((a) => a.addrtype === "mac");
  const hostname = host.hostnames[0]?.name;
  const openPorts = host.ports.filter((p) => p.state === "open");
  const filteredPorts = host.ports.filter((p) => p.state === "filtered");
  const closedPorts = host.ports.filter((p) => p.state === "closed");

  const togglePort = (portid: string) => {
    setExpandedPorts((prev) => ({ ...prev, [portid]: !prev[portid] }));
  };

  return (
    <div className="border border-terminal-border rounded-lg overflow-hidden fade-in bg-terminal-surface">
      {/* Host header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <Monitor size={16} className="text-terminal-cyan" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-terminal-cyan font-semibold">{ipAddr?.addr ?? "Unknown"}</span>
              {hostname && (
                <span className="text-terminal-muted text-xs">({hostname})</span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  host.status === "up"
                    ? "text-terminal-green border-green-800 bg-green-900/30"
                    : "text-terminal-red border-red-800 bg-red-900/30"
                }`}
              >
                {host.status}
              </span>
            </div>
            {macAddr && (
              <div className="text-terminal-muted text-xs mt-0.5">
                MAC: {macAddr.addr} {macAddr.vendor && `(${macAddr.vendor})`}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-terminal-muted">
          <span className="text-terminal-green">{openPorts.length} open</span>
          {filteredPorts.length > 0 && (
            <span className="text-terminal-yellow">{filteredPorts.length} filtered</span>
          )}
          {closedPorts.length > 0 && (
            <span className="text-terminal-red">{closedPorts.length} closed</span>
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-terminal-border">
          {/* OS Detection */}
          {host.os.length > 0 && (
            <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/50 flex items-center gap-2 text-xs">
              <Shield size={12} className="text-terminal-purple" />
              <span className="text-terminal-muted">OS:</span>
              <span className="text-terminal-purple">{host.os[0].name}</span>
              <span className="text-terminal-muted">({host.os[0].accuracy}% accuracy)</span>
            </div>
          )}

          {/* Uptime */}
          {host.uptime && (
            <div className="px-4 py-2 border-b border-terminal-border bg-terminal-bg/50 flex items-center gap-2 text-xs">
              <Clock size={12} className="text-terminal-yellow" />
              <span className="text-terminal-muted">Uptime:</span>
              <span className="text-terminal-yellow">
                {Math.floor(Number(host.uptime.seconds) / 86400)}d{" "}
                {Math.floor((Number(host.uptime.seconds) % 86400) / 3600)}h
              </span>
              {host.uptime.lastboot && (
                <span className="text-terminal-muted">(last boot: {host.uptime.lastboot})</span>
              )}
            </div>
          )}

          {/* Ports table */}
          {host.ports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-terminal-bg/80 text-terminal-muted uppercase text-left">
                    <th className="px-4 py-2 w-20">PORT</th>
                    <th className="px-4 py-2 w-20">PROTO</th>
                    <th className="px-4 py-2 w-24">STATE</th>
                    <th className="px-4 py-2 w-32">SERVICE</th>
                    <th className="px-4 py-2">VERSION / INFO</th>
                  </tr>
                </thead>
                <tbody>
                  {host.ports.map((port) => (
                    <>
                      <tr
                        key={port.portid}
                        className="border-t border-terminal-border hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => port.scripts.length > 0 && togglePort(port.portid)}
                      >
                        <td className="px-4 py-2 font-semibold text-terminal-cyan">{port.portid}</td>
                        <td className="px-4 py-2 text-terminal-muted">{port.protocol}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-xs font-medium ${
                              STATE_COLORS[port.state] ?? "text-gray-400 border-gray-700 bg-gray-900/30"
                            }`}
                          >
                            {port.state}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-terminal-yellow">{port.service?.name ?? "unknown"}</td>
                        <td className="px-4 py-2 text-terminal-muted">
                          {[port.service?.product, port.service?.version, port.service?.extrainfo]
                            .filter(Boolean)
                            .join(" ")}
                          {port.service?.cpe && port.service.cpe.length > 0 && (
                            <span className="ml-2 text-terminal-purple opacity-70">{port.service.cpe[0]}</span>
                          )}
                          {port.scripts.length > 0 && (
                            <span className="ml-2 text-terminal-cyan opacity-60">[+scripts]</span>
                          )}
                        </td>
                      </tr>
                      {/* Script output */}
                      {expandedPorts[port.portid] &&
                        port.scripts.map((script) => (
                          <tr key={script.id} className="bg-terminal-bg/40">
                            <td colSpan={5} className="px-8 py-2 text-terminal-muted">
                              <span className="text-terminal-purple font-semibold">{script.id}:</span>{" "}
                              <pre className="inline whitespace-pre-wrap text-xs">{script.output}</pre>
                            </td>
                          </tr>
                        ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-4 text-terminal-muted text-xs text-center">
              No port data available for this host.
            </div>
          )}

          {/* Host scripts */}
          {host.scripts.length > 0 && (
            <div className="border-t border-terminal-border px-4 py-3 space-y-2">
              <div className="text-xs text-terminal-muted uppercase font-semibold">Host Scripts</div>
              {host.scripts.map((s) => (
                <div key={s.id} className="bg-terminal-bg rounded p-2">
                  <div className="text-terminal-purple text-xs font-semibold">{s.id}</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap mt-1">{s.output}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
