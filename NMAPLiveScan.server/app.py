import json
import logging
import os
import shutil
import urllib.request
import urllib.error

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

from scanner import run_nmap_scan

app = Flask(__name__)
CORS(app)
logger = logging.getLogger(__name__)


@app.errorhandler(Exception)
def handle_unhandled_exception(exc: Exception) -> Response:
    """Catch-all error handler so stack traces are never sent to clients."""
    logger.exception("Unhandled exception in request %s", request.path)
    return jsonify({"error": "An internal server error occurred."}), 500  # type: ignore[return-value]

# ── Health check ────────────────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    nmap_available = shutil.which("nmap") is not None
    return jsonify({
        "status": "ok",
        "nmap_available": nmap_available,
    })

# ── Live scan (SSE) ───────────────────────────────────────────────────────────────────────────────

@app.route("/api/scan")
def scan():
    command = request.args.get("command", "").strip()
    if not command:
        return jsonify({"error": "No command provided"}), 400

    def generate():
        try:
            for event in run_nmap_scan(command):
                yield f"data: {json.dumps(event)}\n\n"
        except GeneratorExit:
            return  # client disconnected — normal closure
        except Exception:  # noqa: BLE001
            logger.exception("Unexpected error during scan stream for command: %s", command)
            yield f"data: {json.dumps({'type': 'error', 'message': 'An unexpected error occurred.'})}\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

# ── AI analysis (streaming) ───────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a cybersecurity expert analyzing nmap scan results. "
    "Return ONLY a JSON object — no markdown fences, no extra text — with this exact schema:\n"
    "{\n"
    '  "risk_score": <integer 0-100>,\n'
    '  "summary": "<brief security assessment>",\n'
    '  "findings": [\n'
    "    {\n"
    '      "severity": "<Critical|High|Medium|Low|Info>",\n'
    '      "service": "<service name>",\n'
    '      "port": "<portid/protocol>",\n'
    '      "vector": "<attack vector>",\n'
    '      "description": "<detailed description>",\n'
    '      "exploitation": "<exploitation approach>",\n'
    '      "cve_hints": ["CVE-XXXX-XXXX"],\n'
    '      "follow_up_command": "<nmap follow-up command>"\n'
    "    }\n"
    "  ],\n"
    '  "recommended_next_scans": ["<nmap command>"]\n'
    "}"
)


def _build_prompt(scan_data: dict) -> str:
    lines = [
        f"Nmap scan: {scan_data.get('args', 'unknown command')}",
        "",
    ]
    for host in scan_data.get("hosts", []):
        addrs = ", ".join(a.get("addr", "") for a in host.get("addresses", []))
        lines.append(f"Host: {addrs}  status={host.get('status', 'unknown')}")
        for port in host.get("ports", []):
            svc = port.get("service") or {}
            svc_name = svc.get("name", "")
            svc_ver = " ".join(filter(None, [svc.get("product"), svc.get("version")]))
            lines.append(
                f"  {port.get('portid')}/{port.get('protocol')} "
                f"{port.get('state')} {svc_name} {svc_ver}".rstrip()
            )
        for osm in host.get("os", []):
            lines.append(f"  OS: {osm.get('name')} ({osm.get('accuracy')}% accuracy)")
    return "\n".join(lines)


@app.route("/api/analyze", methods=["POST"])
def analyze():
    scan_data = request.get_json(silent=True)
    if not scan_data:
        return jsonify({"error": "No scan data provided"}), 400

    api_key = (
        # GITHUB_TOKEN: GitHub Models / Copilot API (https://models.inference.ai.azure.com)
        # OPENAI_API_KEY: OpenAI API (https://api.openai.com)
        # COPILOT_API_KEY: any other OpenAI-compatible provider set via OPENAI_BASE_URL
        os.environ.get("GITHUB_TOKEN")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("COPILOT_API_KEY")
    )
    if not api_key:
        return jsonify({
            "error": (
                "No API key configured. "
                "Set GITHUB_TOKEN, OPENAI_API_KEY, or COPILOT_API_KEY."
            )
        }), 500

    base_url = os.environ.get(
        "OPENAI_BASE_URL", "https://models.inference.ai.azure.com"
    )
    model = os.environ.get("ANALYSIS_MODEL", "gpt-4o-mini")

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _build_prompt(scan_data)},
        ],
        "stream": True,
        "temperature": 0.3,
        "max_tokens": 2048,
    }).encode()

    # Build the auth header before entering the generator to avoid it appearing
    # in any exception context inside stream_analysis.
    auth_header = "Bearer " + api_key

    def stream_analysis():
        req = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=payload,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8").rstrip("\r\n")
                    if line:
                        yield line + "\n\n"
        except urllib.error.HTTPError as exc:
            # Distinguish auth failures (bad/missing key) from other provider errors.
            if exc.code in (401, 403):
                logger.warning("Analysis API auth failure (HTTP %s)", exc.code)
                yield f"data: {json.dumps({'error': 'Analysis API authentication failed. Check your API key.'})}\n\n"
            else:
                logger.warning("Analysis API HTTP error (HTTP %s)", exc.code)
                yield f"data: {json.dumps({'error': 'Analysis API request failed.'})}\n\n"
        except (urllib.error.URLError, TimeoutError, OSError):
            logger.exception("Could not reach analysis API at %s", base_url)
            yield f"data: {json.dumps({'error': 'Could not reach the analysis API. Check your network and API configuration.'})}\n\n"
        except Exception:  # noqa: BLE001 — last-resort catch; do not surface internals
            logger.exception("Unexpected error in analysis stream")
            yield f"data: {json.dumps({'error': 'An unexpected error occurred during analysis.'})}\n\n"

    return Response(
        stream_analysis(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Entry point ────────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    host = "127.0.0.1" if os.environ.get("FLASK_ENV") != "production" else "0.0.0.0"
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host=host, port=5000, debug=debug, threaded=True)
