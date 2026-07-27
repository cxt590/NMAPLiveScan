# NMAPLiveScan

NMAPLiveScan is a web-based interface for running **Nmap** scans with live terminal output and structured results.  
It includes:
- real-time scan streaming (SSE),
- parsed host/port/service results,
- saved scan history in the browser,
- optional AI-assisted analysis in the UI.

## Project Description

This project is split into two services:

- **`NMAPLiveScan.client`**: React + TypeScript frontend UI
- **`NMAPLiveScan.server`**: Flask backend that validates and runs Nmap commands, then parses XML output to JSON

The frontend talks to backend API routes under `/api/*` (for example, health checks, scans, and analysis).

## Setup Instructions

## 1) Prerequisites

- Node.js 18+ (or 20+ recommended)
- npm
- Python 3.12+
- `nmap` installed on the machine running the backend

## 2) Backend setup (`NMAPLiveScan.server`)

```bash
cd /home/runner/work/NMAPLiveScan/NMAPLiveScan/NMAPLiveScan.server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend default URL: `http://localhost:5000`

## 3) Frontend setup (`NMAPLiveScan.client`)

Open a second terminal:

```bash
cd /home/runner/work/NMAPLiveScan/NMAPLiveScan/NMAPLiveScan.client
npm install
npm start
```

Frontend default URL: `http://localhost:3000`

The client is configured to proxy API calls to `http://localhost:5000`.

## 4) Run tests (backend)

```bash
cd /home/runner/work/NMAPLiveScan/NMAPLiveScan/NMAPLiveScan.server
pytest
```

## Requirements List (API Keys, Access, and System Needs)

### Required
- **No API key is required** for core Nmap scanning.
- Local machine access with permission to run `nmap`.
- Elevated privileges may be required for some scan types (for example SYN/raw-socket scans).

### Optional / Feature-dependent
- **AI Analysis (`/api/analyze`)**: requires whatever provider credentials your backend analysis integration uses (for example a model provider API key).  
  The specific key name and provider depend on your backend implementation/environment.

### Security and Legal
- Scan only systems you own or have explicit written authorization to test.

