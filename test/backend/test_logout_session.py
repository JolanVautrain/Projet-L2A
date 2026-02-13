"""Tests pour les endpoints de logout et session (auth.py)."""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register_and_login(client, username):
    """Helper : inscrit et connecte un utilisateur, retourne le token."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    return rv.get_json()["session_token"]


def test_logout_via_body(client: FlaskClient, cleanup_user: str):
    """Logout avec username et token dans le body JSON."""
    token = _register_and_login(client, cleanup_user)
    rv = client.post(
        "/api/logout",
        json={"username": cleanup_user, "session_token": token},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_logout_via_headers(client: FlaskClient, cleanup_user: str):
    """Logout via les headers X-Session-User et X-Session-Token."""
    token = _register_and_login(client, cleanup_user)
    rv = client.post(
        "/api/logout",
        headers={
            "X-Session-User": cleanup_user,
            "X-Session-Token": token,
        },
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_logout_missing_credentials(client: FlaskClient):
    """Logout sans identifiants retourne 400."""
    rv = client.post("/api/logout", json={})
    assert rv.status_code == 400


def test_logout_missing_token(client: FlaskClient):
    """Logout avec seulement le username retourne 400."""
    rv = client.post("/api/logout", json={"username": "someone"})
    assert rv.status_code == 400


def test_logout_missing_username(client: FlaskClient):
    """Logout avec seulement le token retourne 400."""
    rv = client.post("/api/logout", json={"session_token": "abc"})
    assert rv.status_code == 400


def test_session_ping_get(client: FlaskClient):
    """Ping de session en GET."""
    rv = client.get("/api/session/ping")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_session_ping_post(client: FlaskClient):
    """Ping de session en POST."""
    rv = client.post("/api/session/ping")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
