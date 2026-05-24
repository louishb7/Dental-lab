from __future__ import annotations

from fastapi.testclient import TestClient

from backend.core import settings
from backend.main import app


def test_login_and_me_endpoint(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_USERNAME", "admin")
    monkeypatch.setattr(settings, "AUTH_PASSWORD", "secret123")
    monkeypatch.setattr(settings, "AUTH_PASSWORD_HASH", "")
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    client = TestClient(app)

    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "secret123"},
    )
    assert response.status_code == 200, response.text

    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["username"] == "admin"
    assert payload["access_token"]

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {payload['access_token']}"},
    )
    assert me_response.status_code == 200, me_response.text
    assert me_response.json() == {"username": "admin"}


def test_login_rejects_invalid_credentials(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_USERNAME", "admin")
    monkeypatch.setattr(settings, "AUTH_PASSWORD", "secret123")
    monkeypatch.setattr(settings, "AUTH_PASSWORD_HASH", "")
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)

    client = TestClient(app)

    response = client.post(
        "/auth/login",
        json={"username": "admin", "password": "wrong"},
    )
    assert response.status_code == 401, response.text
