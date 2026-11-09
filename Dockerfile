# Public beta: one web endpoint for Next.js + FastAPI, backed by a Render persistent disk.
FROM node:22-bookworm-slim AS webbuild
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_PARLONS_CLOUD_SITE=true
RUN npm run build

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv python3-pip \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/parlons-venv
COPY backend/requirements.txt /tmp/parlons-requirements.txt
RUN /opt/parlons-venv/bin/pip install --no-cache-dir -r /tmp/parlons-requirements.txt
WORKDIR /app
COPY backend/ /app/backend/
COPY scripts/start_cloud.py /app/scripts/start_cloud.py
COPY --from=webbuild /build/frontend/.next/standalone/ /app/frontend/runtime/
COPY --from=webbuild /build/frontend/.next/static/ /app/frontend/runtime/.next/static/
COPY --from=webbuild /build/frontend/public/ /app/frontend/runtime/public/
RUN mkdir -p /var/data
ENV PATH="/opt/parlons-venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=10000 \
    FRONTEND_PORT=3000
EXPOSE 10000
CMD ["python3", "/app/scripts/start_cloud.py"]
