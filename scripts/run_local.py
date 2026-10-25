"""Start a private local web studio. Real calls occur only after user interactions."""

import argparse
import getpass
import json
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_VOICE_ID = "cuo3D4C6LVenyV7b2Kpd"


def configure_voice(env, present):
    """Use the project's selected voice without an interactive configuration step."""
    if not present.get("ELEVENLABS_VOICE_ID"):
        env["ELEVENLABS_VOICE_ID"] = DEFAULT_VOICE_ID


def free_port(port):
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            raise RuntimeError(
                f"Port {port} is already in use; stop that service or choose another port."
            )


def wait_for(url, processes, timeout=60):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if any(process.poll() is not None for process in processes):
            raise RuntimeError("A service exited. Check the startup messages above.")
        try:
            with opener.open(url, timeout=2) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.3)
    raise RuntimeError("Startup timed out. Check the service logs above.")


def launch(args, cwd, env):
    options = {"start_new_session": True} if os.name != "nt" else {}
    return subprocess.Popen(args, cwd=cwd, env=env, **options)


def stop(process):
    if os.name == "nt":
        if process.poll() is not None:
            return
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], check=False)
    else:
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--real", action="store_true", help="Enable real API use; billable on interaction"
    )
    parser.add_argument(
        "--tunnel",
        action="store_true",
        help="Publish a password-protected temporary HTTPS URL using cloudflared",
    )
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument(
        "--backend-python", type=Path, help="Reuse an already prepared Python environment"
    )
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error("Python 3.11 or later is required")
    if args.tunnel and not shutil.which("cloudflared"):
        parser.error(
            "Install cloudflared first: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/"
        )
    node, npm = shutil.which("node"), shutil.which("npm")
    if not node or not npm:
        parser.error("Install Node.js 22 or 24 LTS (including npm) first")
    version = subprocess.check_output([node, "--version"], text=True).strip().lstrip("v")
    if tuple(int(part) for part in version.split(".")[:2]) < (20, 9):
        parser.error("Node.js 20.9+ is required; use Node.js 22 or 24 LTS")
    if args.port == args.api_port or not all(
        1024 <= p <= 65535 for p in [args.port, args.api_port]
    ):
        parser.error("Choose distinct port numbers between 1024 and 65535")
    free_port(args.port)
    free_port(args.api_port)
    env = os.environ.copy()
    env.update(
        MOCK_AI="false" if args.real else "true",
        NEXT_TELEMETRY_DISABLED="1",
        PARLONS_PUBLIC_SITE="true" if args.tunnel else "false",
    )
    python = args.backend_python
    if python is None:
        venv = ROOT / "backend/.venv"
        python = venv / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
        if not python.exists():
            subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
            subprocess.run(
                [str(python), "-m", "pip", "install", "-r", "requirements.txt"],
                cwd=ROOT / "backend",
                env=env,
                check=True,
            )
    # Preserve venv interpreter symlinks: resolving them would select system Python.
    python = python.absolute()
    if not python.is_file():
        parser.error("Backend Python executable not found")
    if not (ROOT / "frontend/node_modules/next/package.json").exists():
        subprocess.run(
            [npm, "ci", "--no-audit", "--no-fund"], cwd=ROOT / "frontend", env=env, check=True
        )
    if args.real:
        # Query presence only, not values; preserve existing backend/.env and injected bindings.
        code = (
            "import os,json;from dotenv import load_dotenv;load_dotenv('.env');"
            "print(json.dumps({n:bool(os.getenv(n,'').strip()) for n in "
            "['PARLONS_OPENAI_API_KEY','OPENAI_API_KEY','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID']}))"
        )
        present = json.loads(
            subprocess.check_output(
                [str(python), "-c", code], cwd=ROOT / "backend", env=env, text=True
            )
        )
        for name in ["PARLONS_OPENAI_API_KEY", "ELEVENLABS_API_KEY"]:
            if present[name] or (name == "PARLONS_OPENAI_API_KEY" and present["OPENAI_API_KEY"]):
                continue
            value = getpass.getpass(f"Enter {name} (hidden; not saved to disk): ").strip()
            if not value:
                parser.error(f"{name} is required for the full voice workflow")
            env[name] = value
        configure_voice(env, present)
        print(
            "REAL API MODE: text, transcription and playback may consume API credits.",
            flush=True,
        )
    else:
        print("MOCK MODE: fixed replies and synthetic tones; no provider calls.", flush=True)
    env["PARLONS_BACKEND_URL"] = f"http://127.0.0.1:{args.api_port}"
    # Always use the same-origin proxy when launched this way, even with an old .env.local.
    env["NEXT_PUBLIC_API_URL"] = "/api/backend"
    env["FRONTEND_ORIGIN"] = f"http://localhost:{args.port}"
    frontend_env = env.copy()
    for name in [
        "SITE_PASSWORD",
        "SESSION_SECRET",
        "PARLONS_OPENAI_API_KEY",
        "OPENAI_API_KEY",
        "ELEVENLABS_API_KEY",
    ]:
        frontend_env.pop(name, None)
    if args.tunnel:
        env["SITE_PASSWORD"] = os.getenv("SITE_PASSWORD") or secrets.token_urlsafe(18)
        env["SESSION_SECRET"] = secrets.token_urlsafe(48)
        env["FRONTEND_PORT"] = str(args.port)
        # Persistent on the machine running this command, independent of tunnel URLs.
        env.setdefault("DATABASE_PATH", str(ROOT / "backend/parlons.sqlite3"))
        build_env = frontend_env.copy()
        build_env["MOCK_AI"] = "true"
        subprocess.run([npm, "run", "build"], cwd=ROOT / "frontend", env=build_env, check=True)
        standalone = ROOT / "frontend/.next/standalone"
        shutil.copytree(
            ROOT / "frontend/.next/static", standalone / ".next/static", dirs_exist_ok=True
        )
        shutil.copytree(ROOT / "frontend/public", standalone / "public", dirs_exist_ok=True)
        frontend_env.update(PORT=str(args.port), HOSTNAME="127.0.0.1", NODE_ENV="production")
    processes = []

    def interrupt(_signal, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGINT, interrupt)
    signal.signal(signal.SIGTERM, interrupt)
    try:
        if args.tunnel:
            processes.append(launch([node, "server.js"], standalone, frontend_env))
            wait_for(f"http://127.0.0.1:{args.port}/", processes)
        processes.append(
            launch(
                [
                    str(python),
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(args.api_port),
                ],
                ROOT / "backend",
                env,
            )
        )
        if args.tunnel:
            wait_for(f"http://127.0.0.1:{args.api_port}/health/live", processes)
            print(
                f"\nPrivate tunnel site password: {env['SITE_PASSWORD']}\n"
                "Open the https://….trycloudflare.com URL printed below. "
                "Keep this terminal running; Ctrl+C stops access.\n",
                flush=True,
            )
            processes.append(
                launch(
                    [
                        shutil.which("cloudflared"),
                        "tunnel",
                        "--url",
                        f"http://127.0.0.1:{args.api_port}",
                        "--no-autoupdate",
                    ],
                    ROOT,
                    frontend_env,
                )
            )
            while all(process.poll() is None for process in processes):
                time.sleep(0.5)
            raise RuntimeError("A service or tunnel stopped unexpectedly")
        health = json.loads(wait_for(f"http://127.0.0.1:{args.api_port}/health", processes))
        if health["mock_ai"] == args.real:
            raise RuntimeError("Backend mode does not match the requested mode")
        if args.real and (health["mode"] != "ai" or not health["speech_ready"]):
            raise RuntimeError("Real chat and speech are not fully configured")
        processes.append(
            launch(
                [npm, "run", "dev", "--", "--hostname", "127.0.0.1", "--port", str(args.port)],
                ROOT / "frontend",
                frontend_env,
            )
        )
        wait_for(f"http://127.0.0.1:{args.port}", processes)
        url = f"http://localhost:{args.port}"
        print(
            f"\nStudio ready: {url}\n"
            "Use the root page, not /demo. Press Ctrl+C to stop both services.\n",
            flush=True,
        )
        if not args.no_browser:
            webbrowser.open(url)
        while all(process.poll() is None for process in processes):
            time.sleep(0.5)
        raise RuntimeError("One service stopped unexpectedly")
    except KeyboardInterrupt:
        print("\nStopping the studio.", flush=True)
    finally:
        for process in reversed(processes):
            stop(process)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError, EOFError) as error:
        print(f"Startup failed: {error}", file=sys.stderr)
        sys.exit(1)
