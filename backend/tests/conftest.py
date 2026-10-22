import os
import socket

os.environ["MOCK_AI"] = "true"

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import main, providers  # noqa: E402


@pytest.fixture(autouse=True)
def no_external_network(monkeypatch):
    monkeypatch.setenv("MOCK_AI", "true")

    def blocked(*_args, **_kwargs):
        raise AssertionError("Real network access is forbidden in tests")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    main.app.state.provider_transport = httpx.MockTransport(providers.mock_response)
    with TestClient(main.app) as client:
        yield client
    del main.app.state.provider_transport


@pytest.fixture
def session(api):
    response = api.post("/sessions", json={"topic": "cafe"})
    assert response.status_code == 200
    return response.json()["id"]


@pytest.fixture
def transport():
    def set_handler(handler):
        main.app.state.provider_transport = httpx.MockTransport(handler)

    return set_handler
