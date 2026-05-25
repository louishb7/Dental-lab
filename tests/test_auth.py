from __future__ import annotations

from fastapi.testclient import TestClient

from backend.core import settings
from backend.main import app


def _configure_test_security(monkeypatch) -> None:
    monkeypatch.setattr(settings, "SECRET_KEY", "test-secret")
    monkeypatch.setattr(settings, "ALGORITHM", "HS256")
    monkeypatch.setattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 60)


def _register_user(client: TestClient) -> dict:
    response = client.post(
        "/auth/register",
        json={
            "email": "admin@cadista.local",
            "username": "admin",
            "password": "secret123",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_register_login_and_me_endpoint(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)

    register_payload = _register_user(client)
    assert register_payload["token_type"] == "bearer"
    assert register_payload["username"] == "admin"
    assert register_payload["email"] == "admin@cadista.local"
    assert register_payload["access_token"]

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {register_payload['access_token']}"},
    )
    assert me_response.status_code == 200, me_response.text
    assert me_response.json() == {
        "id": 1,
        "username": "admin",
        "email": "admin@cadista.local",
    }

    login_response = client.post(
        "/auth/login",
        json={"identifier": "admin", "password": "secret123"},
    )
    assert login_response.status_code == 200, login_response.text
    assert login_response.json()["username"] == "admin"

    login_by_email = client.post(
        "/auth/login",
        json={"identifier": "admin@cadista.local", "password": "secret123"},
    )
    assert login_by_email.status_code == 200, login_by_email.text
    assert login_by_email.json()["email"] == "admin@cadista.local"


def test_business_routes_require_bearer_token(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)

    doctors_response = client.get("/doctors/")
    cases_response = client.get("/cases/")

    assert doctors_response.status_code == 401, doctors_response.text
    assert cases_response.status_code == 401, cases_response.text

    token = _register_user(client)["access_token"]

    authorized_doctors = client.get(
        "/doctors/",
        headers={"Authorization": f"Bearer {token}"},
    )
    authorized_cases = client.get(
        "/cases/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert authorized_doctors.status_code == 200, authorized_doctors.text
    assert authorized_doctors.json() == []
    assert authorized_cases.status_code == 200, authorized_cases.text
    assert authorized_cases.json() == []


def test_registration_allows_multiple_users_and_rejects_duplicate_identity(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)

    first_response = _register_user(client)
    assert first_response["username"] == "admin"

    second_response = client.post(
        "/auth/register",
        json={
            "email": "operator@cadista.local",
            "username": "operator",
            "password": "secret123",
        },
    )
    assert second_response.status_code == 201, second_response.text
    assert second_response.json()["username"] == "operator"

    duplicate_response = client.post(
        "/auth/register",
        json={
            "email": "admin@cadista.local",
            "username": "another-admin",
            "password": "secret123",
        },
    )
    assert duplicate_response.status_code == 409, duplicate_response.text

    duplicate_username_response = client.post(
        "/auth/register",
        json={
            "email": "another@cadista.local",
            "username": "admin",
            "password": "secret123",
        },
    )
    assert duplicate_username_response.status_code == 409, duplicate_username_response.text


def test_login_rejects_invalid_credentials(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    client = TestClient(app)
    _register_user(client)

    response = client.post(
        "/auth/login",
        json={"identifier": "admin", "password": "wrong"},
    )
    assert response.status_code == 401, response.text


def test_registered_user_can_login_again_in_a_new_client_session(monkeypatch) -> None:
    _configure_test_security(monkeypatch)
    first_client = TestClient(app)
    _register_user(first_client)

    second_client = TestClient(app)
    response = second_client.post(
        "/auth/login",
        json={"identifier": "admin", "password": "secret123"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["username"] == "admin"
