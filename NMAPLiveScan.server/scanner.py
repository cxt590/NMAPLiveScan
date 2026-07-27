import subprocess
import xml.etree.ElementTree as ET
import shlex
import os
import platform

def validate_nmap_command(command: str) -> tuple[bool, str]:
    """Validate that the command is a safe nmap command."""
    parts = shlex.split(command.strip())
    if not parts:
        return False, "Empty command"
    if parts[0] not in ("nmap", "sudo"):
        return False, "Only nmap commands are allowed"
    if parts[0] == "sudo" and (len(parts) < 2 or parts[1] != "nmap"):
        return False, "Only 'sudo nmap' is permitted"
    # Block shell operators
    for char in [";", "&&", "||", "|", ">", "<", "`", "$("]:
        if char in command:
            return False, f"Shell operator '{char}' is not allowed"
    return True, ""


def run_nmap_scan(command: str):
    """
    Generator that yields lines of nmap output in real time,
    then yields the parsed XML result as the final item.
    """
    valid, reason = validate_nmap_command(command)
    if not valid:
        yield {"type": "error", "message": reason}
        return

    parts = shlex.split(command.strip())

    # Inject XML output to a temp file so we can parse it
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".xml", delete=False) as tmp:
        xml_path = tmp.name

    # Insert -oX <path> before the target (last arg)
    # Find position to insert: before the last positional arg
    insert_idx = len(parts)
    parts = parts[:insert_idx] + ["-oX", xml_path] + parts[insert_idx:]

    try:
        process = subprocess.Popen(
            parts,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        for line in iter(process.stdout.readline, ""):
            yield {"type": "output", "line": line.rstrip()}

        process.wait()
        return_code = process.returncode

        yield {"type": "exit", "code": return_code}

        # Parse XML results
        if os.path.exists(xml_path) and os.path.getsize(xml_path) > 0:
            try:
                results = parse_nmap_xml(xml_path)
                yield {"type": "results", "data": results}
            except Exception:  # noqa: BLE001
                yield {"type": "error", "message": "Failed to parse scan results."}
        else:
            yield {"type": "error", "message": "No XML output generated"}

    except FileNotFoundError:
        yield {"type": "error", "message": "nmap not found. Please install nmap on your system."}
    except PermissionError:
        yield {"type": "error", "message": "Permission denied. Try prefixing with 'sudo'."}
    finally:
        if os.path.exists(xml_path):
            os.unlink(xml_path)


def parse_nmap_xml(xml_path: str) -> dict:
    """Parse nmap XML output into a structured dict."""
    tree = ET.parse(xml_path)
    root = tree.getroot()

    scan_info = {
        "scanner": root.get("scanner", "nmap"),
        "version": root.get("version", ""),
        "args": root.get("args", ""),
        "start_time": root.get("startstr", ""),
        "scan_info": [],
        "hosts": [],
        "run_stats": {},
    }

    # Scan type info
    for si in root.findall("scaninfo"):
        scan_info["scan_info"].append({
            "type": si.get("type"),
            "protocol": si.get("protocol"),
            "num_services": si.get("numservices"),
            "services": si.get("services"),
        })

    # Hosts
    for host in root.findall("host"):
        host_data = {
            "status": "",
            "addresses": [],
            "hostnames": [],
            "ports": [],
            "os": [],
            "uptime": None,
            "distance": None,
            "scripts": [],
        }

        # Status
        status_el = host.find("status")
        if status_el is not None:
            host_data["status"] = status_el.get("state", "")

        # Addresses
        for addr in host.findall("address"):
            host_data["addresses"].append({
                "addr": addr.get("addr"),
                "addrtype": addr.get("addrtype"),
                "vendor": addr.get("vendor", ""),
            })

        # Hostnames
        hostnames_el = host.find("hostnames")
        if hostnames_el is not None:
            for hn in hostnames_el.findall("hostname"):
                host_data["hostnames"].append({
                    "name": hn.get("name"),
                    "type": hn.get("type"),
                })

        # Ports
        ports_el = host.find("ports")
        if ports_el is not None:
            for port in ports_el.findall("port"):
                port_data = {
                    "portid": port.get("portid"),
                    "protocol": port.get("protocol"),
                    "state": "",
                    "service": {},
                    "scripts": [],
                }
                state_el = port.find("state")
                if state_el is not None:
                    port_data["state"] = state_el.get("state", "")
                    port_data["reason"] = state_el.get("reason", "")

                service_el = port.find("service")
                if service_el is not None:
                    port_data["service"] = {
                        "name": service_el.get("name", ""),
                        "product": service_el.get("product", ""),
                        "version": service_el.get("version", ""),
                        "extrainfo": service_el.get("extrainfo", ""),
                        "tunnel": service_el.get("tunnel", ""),
                        "cpe": [c.text for c in service_el.findall("cpe")],
                    }

                for script in port.findall("script"):
                    port_data["scripts"].append({
                        "id": script.get("id"),
                        "output": script.get("output"),
                    })

                host_data["ports"].append(port_data)

        # OS detection
        os_el = host.find("os")
        if os_el is not None:
            for osmatch in os_el.findall("osmatch"):
                host_data["os"].append({
                    "name": osmatch.get("name"),
                    "accuracy": osmatch.get("accuracy"),
                    "osclass": [
                        {
                            "type": oc.get("type"),
                            "vendor": oc.get("vendor"),
                            "osfamily": oc.get("osfamily"),
                            "osgen": oc.get("osgen"),
                            "accuracy": oc.get("accuracy"),
                        }
                        for oc in osmatch.findall("osclass")
                    ],
                })

        # Uptime
        uptime_el = host.find("uptime")
        if uptime_el is not None:
            host_data["uptime"] = {
                "seconds": uptime_el.get("seconds"),
                "lastboot": uptime_el.get("lastboot", ""),
            }

        # Host scripts
        hostscript_el = host.find("hostscript")
        if hostscript_el is not None:
            for script in hostscript_el.findall("script"):
                host_data["scripts"].append({
                    "id": script.get("id"),
                    "output": script.get("output"),
                })

        scan_info["hosts"].append(host_data)

    # Run stats
    runstats_el = root.find("runstats")
    if runstats_el is not None:
        finished_el = runstats_el.find("finished")
        hosts_el = runstats_el.find("hosts")
        if finished_el is not None:
            scan_info["run_stats"]["elapsed"] = finished_el.get("elapsed")
            scan_info["run_stats"]["summary"] = finished_el.get("summary")
            scan_info["run_stats"]["exit"] = finished_el.get("exit")
            scan_info["run_stats"]["end_time"] = finished_el.get("timestr", "")
        if hosts_el is not None:
            scan_info["run_stats"]["hosts_up"] = hosts_el.get("up")
            scan_info["run_stats"]["hosts_down"] = hosts_el.get("down")
            scan_info["run_stats"]["hosts_total"] = hosts_el.get("total")

    return scan_info