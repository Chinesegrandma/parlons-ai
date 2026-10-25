"""Single-owner private-site gateway. Disabled for ordinary local development."""

import base64
import hashlib
import hmac
import html
import json
import os
import secrets
import time
from urllib.parse import parse_qs, urlsplit

from starlette.datastructures import Headers
from starlette.responses import HTMLResponse, JSONResponse, RedirectResponse, Response

COOKIE = "parlons_session"
BILLABLE_PATHS = {"/chat", "/speech/transcribe", "/speech/synthesize"}
MAX_BODY = 9 * 1024 * 1024


def public_enabled():
    return os.getenv("PARLONS_PUBLIC_SITE", "false").lower() == "true"


def settings():
    password = os.getenv("SITE_PASSWORD", "")
    secret = os.getenv("SESSION_SECRET", "")
    if len(password.strip()) < 12 or len(password) > 256:
        raise RuntimeError("SITE_PASSWORD must contain 12–256 characters")
    if len(secret) < 32:
        raise RuntimeError("SESSION_SECRET must contain at least 32 characters")
    limits = {}
    for name, default in [("MAX_CALLS_PER_MINUTE", 12), ("MAX_CALLS_PER_DAY", 100)]:
        value = int(os.getenv(name, str(default)))
        if value < 1 or value > 10000:
            raise RuntimeError(f"{name} must be between 1 and 10000")
        limits[name] = value
    return password, secret, limits


def init_tables(db):
    db.execute(
        "CREATE TABLE IF NOT EXISTS site_limits "
        "(bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)"
    )


def signature(payload):
    password, secret, _ = settings()
    key = hmac.digest(secret.encode(), password.encode(), "sha256")
    return hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()


def make_session():
    payload = (
        base64.urlsafe_b64encode(
            json.dumps(
                {"exp": int(time.time()) + 12 * 3600, "nonce": secrets.token_hex(16)}
            ).encode()
        )
        .decode()
        .rstrip("=")
    )
    return payload + "." + signature(payload)


def valid_session(token):
    if not token or len(token) > 512:
        return False
    try:
        payload, supplied = token.split(".", 1)
        if not hmac.compare_digest(supplied, signature(payload)):
            return False
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        return isinstance(data, dict) and type(data.get("exp")) is int and data["exp"] > time.time()
    except (ValueError, TypeError, UnicodeError):
        return False


def take_limits(db_factory, limits):
    """Reserve all fixed-window counters atomically, before any provider request."""
    timestamp = int(time.time())
    with db_factory() as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM site_limits WHERE expires_at <= ?", (timestamp,))
        buckets = []
        for label, seconds, maximum in limits:
            start = timestamp // seconds * seconds
            bucket = f"{label}:{start}"
            row = db.execute("SELECT count FROM site_limits WHERE bucket=?", (bucket,)).fetchone()
            if row and row[0] >= maximum:
                return start + seconds - timestamp
            buckets.append((bucket, start + seconds))
        for bucket, end in buckets:
            db.execute(
                "INSERT INTO site_limits VALUES (?, 1, ?) "
                "ON CONFLICT(bucket) DO UPDATE SET count = count + 1",
                (bucket, end),
            )
    return None


def login_page(error="", language="zh"):
    message = f'<p class="error" role="alert">{html.escape(error)}</p>' if error else ""
    markup = (
        """<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 · Parlons AI</title><style>
*{box-sizing:border-box}body{margin:0;background:#f7f7f2;color:#283d36;
font-family:Arial,'PingFang SC',sans-serif;min-height:100dvh;display:grid;place-items:center;
padding:24px}main{width:100%;max-width:410px;background:white;border:1px solid #e2e6db;
border-radius:22px;padding:38px;box-shadow:0 14px 60px #243c2d08}
.brand{font:38px Georgia,serif;letter-spacing:-2px}.brand span{color:#d4755c}
small{display:block;color:#859078;font-size:10px;letter-spacing:2px;margin:10px 0 35px}
h1{font-size:23px;font-weight:500;margin:0 0 12px}p{font-size:13px;line-height:1.8;color:#7d8c73}
label{display:block;font-size:12px;margin:24px 0 8px}input{width:100%;border:1px solid #dce3d3;
border-radius:9px;padding:13px;font:16px Arial;background:#fbfcf8}
button{width:100%;border:0;border-radius:9px;background:#254c3f;color:white;
padding:14px;margin-top:17px;font:14px Arial;cursor:pointer}button:hover{background:#193c2e}
input:focus-visible,button:focus-visible{outline:3px solid #cfaa82;outline-offset:3px}
.error{color:#a45f45;background:#fcf0e7;border-radius:8px;padding:10px}
footer{font-size:11px;color:#9aab8f;margin-top:24px;line-height:1.8}
</style></head><body><main><div class="brand">parlons<span> .</span></div>
<small>UN PEU, CHAQUE JOUR</small><h1>欢迎回到你的法语空间。</h1>
<p>这是一个私人测试站。输入站点密码，继续练习。</p>"""
        + message
        + """<form method="post" action="/auth/login"><label for="password">站点密码</label>
<input id="password" type="password" name="password" required maxlength="256"
autocomplete="current-password"><button type="submit">进入练习空间 →</button></form>
<footer>登录后，主动发送、转写或朗读可能消耗 API 额度。<br>
请勿在这里输入 OpenAI 或 ElevenLabs 密钥。</footer></main></body></html>"""
    )

    replacements = {
        "zh-CN": "en",
        "登录 · Parlons AI": "Log in · Parlons AI",
        "欢迎回到你的法语空间。": "Welcome to your French space.",
        "这是一个私人测试站。输入站点密码，继续练习。": (
            "This is a private practice site. Enter the site password to continue."
        ),
        "站点密码": "Site password",
        "进入练习空间 →": "Enter practice →",
        "登录后，主动发送、转写或朗读可能消耗 API 额度。": (
            "Sending, transcribing and playback may use API credits."
        ),
        "请勿在这里输入 OpenAI 或 ElevenLabs 密钥。": (
            "Do not enter OpenAI or ElevenLabs API keys here."
        ),
    }
    if language == "en":
        for original, translated in replacements.items():
            markup = markup.replace(original, translated)
    switch = (
        '<p><a href="/auth/login?lang=en">English</a> · <a href="/auth/login?lang=zh">中文</a></p>'
    )
    return HTMLResponse(markup.replace("</main>", switch + "</main>"))


def secure_headers(response):
    response.headers.update(
        {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "same-origin",
            "Permissions-Policy": "microphone=(self), camera=()",
            "Content-Security-Policy": (
                "default-src 'self'; script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                "media-src 'self' blob:; connect-src 'self'; "
                "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
            ),
        }
    )
    return response


class PublicSiteMiddleware:
    def __init__(self, app, db_factory):
        self.app = app
        self.db_factory = db_factory

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not public_enabled():
            return await self.app(scope, receive, send)
        _, _, limits = settings()
        scope = dict(scope)
        path = scope["path"]
        if path.startswith("/api/backend/"):
            path = path[len("/api/backend") :]
            scope["path"] = path
            scope["raw_path"] = path.encode()
        path = path.rstrip("/") or "/"
        method = scope["method"]
        headers = Headers(scope=scope)

        async def respond(response):
            await secure_headers(response)(scope, receive, send)

        if path == "/health/live" and method in {"GET", "HEAD"}:
            return await respond(JSONResponse({"status": "ok"}))
        if method not in {"GET", "HEAD", "OPTIONS"}:
            origin = headers.get("origin")
            if (origin and urlsplit(origin).netloc != headers.get("host")) or headers.get(
                "sec-fetch-site"
            ) == "cross-site":
                return await respond(JSONResponse({"detail": "Cross-site request blocked"}, 403))
        language_cookie = next(
            (
                part.strip().partition("=")[2]
                for part in headers.get("cookie", "").split(";")
                if part.strip().startswith("parlons_language=")
            ),
            "zh",
        )
        language = "en" if language_cookie == "en" else "zh"
        if path == "/auth/login" and method == "GET":
            selected = parse_qs(scope.get("query_string", b"").decode(errors="replace")).get(
                "lang", [language]
            )[0]
            language = "en" if selected == "en" else "zh"
            response = login_page(language=language)
            response.set_cookie(
                "parlons_language", language, max_age=31536000, secure=True, samesite="strict"
            )
            return await respond(response)
        cookies = {}
        for pair in headers.get("cookie", "").split(";"):
            name, separator, value = pair.strip().partition("=")
            if separator:
                cookies[name] = value
        authenticated = valid_session(cookies.get(COOKIE))
        if path != "/auth/login" and not authenticated:
            response = (
                JSONResponse({"detail": "Login required"}, 401)
                if path.startswith(("/sessions", "/chat", "/speech", "/health"))
                else RedirectResponse("/auth/login", status_code=303)
            )
            return await respond(response)
        if path == "/auth/logout" and method == "POST":
            response = RedirectResponse("/auth/login", status_code=303)
            response.delete_cookie(COOKIE, path="/", secure=True, httponly=True, samesite="strict")
            return await respond(response)
        if path == "/auth/login" and method != "POST":
            return await respond(JSONResponse({"detail": "Method not allowed"}, 405))

        # Cap the body before multipart parsing or disk spooling, including chunked requests.
        maximum = 4096 if path == "/auth/login" else MAX_BODY
        try:
            if int(headers.get("content-length", "0")) > maximum:
                return await respond(JSONResponse({"detail": "Request too large"}, 413))
        except ValueError:
            return await respond(JSONResponse({"detail": "Invalid content length"}, 400))
        body = bytearray()
        if method not in {"GET", "HEAD", "OPTIONS"}:
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > maximum:
                    return await respond(JSONResponse({"detail": "Request too large"}, 413))
                if not message.get("more_body", False):
                    break
        if path == "/auth/login":
            retry = take_limits(self.db_factory, [("login", 60, 10)])
            if retry:
                return await respond(
                    JSONResponse(
                        {"detail": "Too many login attempts"}, 429, {"Retry-After": str(retry)}
                    )
                )
            try:
                password = parse_qs(body.decode()).get("password", [""])[0]
            except UnicodeError:
                password = ""
            if not hmac.compare_digest(password.encode(), settings()[0].encode()):
                response = login_page(
                    "Incorrect password. Please try again."
                    if language == "en"
                    else "密码不正确，请重试。",
                    language,
                )
                response.status_code = 401
                return await respond(response)
            response = RedirectResponse("/", status_code=303)
            response.set_cookie(
                COOKIE,
                make_session(),
                max_age=12 * 3600,
                path="/",
                secure=True,
                httponly=True,
                samesite="strict",
            )
            return await respond(response)
        if method == "POST" and (
            path in BILLABLE_PATHS or (path.startswith("/sessions/") and path.endswith("/review"))
        ):
            retry = take_limits(
                self.db_factory,
                [
                    ("provider-minute", 60, limits["MAX_CALLS_PER_MINUTE"]),
                    ("provider-day", 86400, limits["MAX_CALLS_PER_DAY"]),
                ],
            )
            if retry:
                return await respond(
                    JSONResponse(
                        {"detail": "Call limit reached; try later"},
                        429,
                        {"Retry-After": str(retry)},
                    )
                )

        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        async def guarded_send(message):
            if message["type"] == "http.response.start":
                response = secure_headers(Response())
                overridden = {name for name, _ in response.raw_headers}
                message = dict(message)
                message["headers"] = [
                    (name, value)
                    for name, value in message.get("headers", [])
                    if name.lower() not in overridden and name.lower() != b"content-length"
                ] + [
                    (name, value)
                    for name, value in response.raw_headers
                    if name != b"content-length"
                ]
            await send(message)

        await self.app(scope, replay, guarded_send)
