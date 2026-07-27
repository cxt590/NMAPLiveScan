# ── Build stage (installs deps) ────────────────────────────────────────────
FROM python:3.12-slim AS base

# Install nmap + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        nmap \
        gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM base AS runtime

# Non-root user (nmap still works; raw-socket scans need --privileged / NET_RAW)
RUN useradd -m appuser
USER appuser

ENV PYTHONUNBUFFERED=1 \
    FLASK_ENV=production

EXPOSE 5000

CMD ["python", "app.py"]