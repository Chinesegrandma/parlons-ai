"""Supabase JWT authentication for public beta. Private local mode remains unchanged."""

import os
import uuid
from contextvars import ContextVar
from functools import lru_cache
from urllib.parse import urlparse

import jwt
from fastapi import HTTPException
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientError
from starlette.datastructures import Headers
from starlette.responses import JSONResponse

from .security import BILLABLE_PATHS, take_limits

_current_user: ContextVar[str | None] = ContextVar("parlons_current_user", default=None)


def enabled() -> bool:
    return os.getenv("PARLONS_CLOUD_SITE", "false").lower() == "true"


def config() -> tuple[str, str]:
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    publishable = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or not parsed.hostname.endswith(".supabase.co")
        or parsed.path
        or parsed.query
        or parsed.fragment
        or not publishable
    ):
        raise RuntimeError("Cloud beta requires a Supabase HTTPS URL and publishable key")
    if os.getenv("PARLONS_PUBLIC_SITE", "false").lower() == "true":
        raise RuntimeError("Private tunnel and cloud beta modes cannot both be enabled")
    if os.getenv("MOCK_AI", "true").lower() != "false":
        raise RuntimeError("Cloud beta cannot run with mock AI enabled")
    if not os.getenv("DATABASE_PATH", "").strip():
        raise RuntimeError("Cloud beta requires DATABASE_PATH on a durable volume")
    for name, default in (
        ("BETA_USER_CALLS_PER_MINUTE", 12),
        ("BETA_USER_CALLS_PER_DAY", 60),
        ("BETA_GLOBAL_CALLS_PER_DAY", 500),
    ):
        number = int(os.getenv(name, str(default)))
        if not 1 <= number <= 100000:
            raise RuntimeError(f"Invalid {name}")
    return url, publishable


@lru_cache(maxsize=4)
def jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", lifespan=300, timeout=5)


def verify_token(token: str) -> str:
    url, _ = config()
    if len(token) > 8192:
        raise ValueError("Invalid token")
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") not in {"RS256", "ES256"}:
            raise ValueError("Unsupported signing algorithm")
        signing_key = jwks_client(url).get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=f"{url}/auth/v1",
            options={"require": ["sub", "iss", "aud", "exp"]},
        )
        if claims.get("role") != "authenticated":
            raise ValueError("Not an authenticated user")
        return str(uuid.UUID(claims["sub"]))
    except (InvalidTokenError, PyJWKClientError, KeyError, TypeError) as exc:
        raise ValueError("Invalid access token") from exc


def user_id() -> str | None:
    user = _current_user.get()
    if enabled() and user is None:
        raise HTTPException(401, "Authentication required")
    return user


class CloudAuthMiddleware:
    """Require valid per-user JWTs for API routes, never trust client session IDs."""

    def __init__(self, app, db_factory):
        self.app = app
        self.db_factory = db_factory

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not enabled():
            return await self.app(scope, receive, send)
        path = scope["path"]
        if path.startswith("/api/backend/"):
            path = path[len("/api/backend") :]
            scope = dict(scope)
            scope["path"] = path
            scope["raw_path"] = path.encode()
        path = path.rstrip("/") or "/"
        method = scope["method"]
        api_path = (
            path == "/health"
            or path == "/voices"
            or path == "/chat"
            or path == "/lookup"
            or path == "/translate"
            or path == "/rewrite"
            or path == "/me/data"
            or path.startswith("/sessions")
            or path.startswith("/speech/")
        )
        if not api_path:
            return await self.app(scope, receive, send)

        async def respond(status: int, detail: str):
            response = JSONResponse({"detail": detail}, status_code=status)
            response.headers["Cache-Control"] = "no-store"
            return await response(scope, receive, send)

        headers = Headers(scope=scope)
        bearer = headers.get("authorization", "")
        if not bearer.startswith("Bearer ") or len(bearer) > 8200:
            return await respond(401, "Authentication required")
        try:
            user = verify_token(bearer[7:])
        except ValueError:
            return await respond(401, "Invalid or expired access token")
        except Exception:
            return await respond(503, "Authentication provider unavailable")

        if method == "POST":
            limits = []
            if path in BILLABLE_PATHS or (
                path.startswith("/sessions/") and path.endswith("/review")
            ):
                limits = [
                    (
                        f"beta-user-minute:{user}",
                        60,
                        int(os.getenv("BETA_USER_CALLS_PER_MINUTE", "12")),
                    ),
                    (
                        f"beta-user-day:{user}",
                        86400,
                        int(os.getenv("BETA_USER_CALLS_PER_DAY", "60")),
                    ),
                    (
                        "beta-global-day",
                        86400,
                        int(os.getenv("BETA_GLOBAL_CALLS_PER_DAY", "500")),
                    ),
                ]
            elif path == "/sessions":
                limits = [(f"beta-new-session-day:{user}", 86400, 30)]
            if limits:
                try:
                    retry = take_limits(self.db_factory, limits)
                except Exception:
                    return await respond(503, "Usage protection temporarily unavailable")
                if retry:
                    response = JSONResponse(
                        {"detail": "Daily or minute usage limit reached"},
                        status_code=429,
                        headers={"Retry-After": str(retry), "Cache-Control": "no-store"},
                    )
                    return await response(scope, receive, send)
        token = _current_user.set(user)
        try:
            return await self.app(scope, receive, send)
        finally:
            _current_user.reset(token)
