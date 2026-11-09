"""Launch the public beta's internal Next.js process and public FastAPI gateway."""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "frontend/runtime"
BACKEND = ROOT / "backend"


def main():
    if os.getenv("PARLONS_CLOUD_SITE") != "true":
        raise SystemExit("Refusing cloud startup without PARLONS_CLOUD_SITE=true")
    port = int(os.getenv("PORT", "10000"))
    frontend_port = int(os.getenv("FRONTEND_PORT", "3000"))
    if not 1024 <= port <= 65535 or not 1024 <= frontend_port <= 65535 or port == frontend_port:
        raise SystemExit("PORT and FRONTEND_PORT must be distinct valid ports")
    env = os.environ.copy()
    env["HOSTNAME"] = "127.0.0.1"
    env["PARLONS_BACKEND_URL"] = f"http://127.0.0.1:{port}"
    env["NEXT_PUBLIC_API_URL"] = "/api/backend"
    # Real provider calls occur only after authenticated user actions.
    frontend_env = {**env, "PORT": str(frontend_port)}
    for secret in (
        "SUPABASE_SERVICE_ROLE_KEY",
        "PARLONS_OPENAI_API_KEY",
        "OPENAI_API_KEY",
        "ELEVENLABS_API_KEY",
    ):
        frontend_env.pop(secret, None)
    processes = [
        subprocess.Popen(["node", "server.js"], cwd=UI, env=frontend_env),
        subprocess.Popen(
            [
                sys.executable, "-m", "uvicorn", "app.main:app", "--host",
                "0.0.0.0", "--port", str(port), "--workers", "1",
            ],
            cwd=BACKEND, env=env,
        ),
    ]

    def stop(_sig=None, _frame=None):
        for process in reversed(processes):
            if process.poll() is None:
                process.terminate()
        for process in reversed(processes):
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        while all(process.poll() is None for process in processes):
            time.sleep(1)
        raise SystemExit("One of the web processes exited unexpectedly")
    finally:
        stop()


if __name__ == "__main__":
    main()
