from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app


def test_security_headers_are_present() -> None:
    client = TestClient(app)
    response = client.get("/", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 200, response.text
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_unapproved_origin_is_not_reflected() -> None:
    client = TestClient(app)
    response = client.get("/", headers={"Origin": "http://evil.example"})

    assert response.status_code == 200, response.text
    assert "access-control-allow-origin" not in response.headers
