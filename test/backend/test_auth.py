"""Tests pour les endpoints d'authentification (inscription, connexion)."""

import uuid
from typing import Any, cast

import pytest
from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def test_register_new_user(client: FlaskClient, cleanup_user: str):
    """Test d'enregistrement d'un nouvel utilisateur."""
    username = cleanup_user
    rv = client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("success") is True


def test_register_duplicate_user(client: FlaskClient, cleanup_user: str):
    """Test d'enregistrement d'un utilisateur déjà existant."""
    username = cleanup_user

    # Enregistrer une fois
    rv = client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("success") is True

    # Essayer d'enregistrer à nouveau
    rv = client.post(
        "/api/register", json={"username": username, "password": "othersecret"}
    )
    assert rv.status_code == 409
    assert rv.get_json().get("success") is False


def test_register_missing_fields(client: FlaskClient):
    """Test d'enregistrement avec des champs manquants."""
    rv = client.post("/api/register", json={"username": "test"})
    assert rv.status_code == 400


def test_login_correct_password(client: FlaskClient, cleanup_user: str):
    """Test de connexion avec le mot de passe correct."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Connexion avec le mot de passe correct
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is True


def test_login_incorrect_password(client: FlaskClient, cleanup_user: str):
    """Test de connexion avec un mot de passe incorrect."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Connexion avec un mot de passe incorrect
    rv = client.post(
        "/api/login", json={"username": username, "password": "wrongpassword"}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is False


def test_login_nonexistent_user(client: FlaskClient):
    """Test de connexion pour un utilisateur inexistant."""
    rv = client.post(
        "/api/login",
        json={"username": "nonexistent", "password": TEST_PASSWORD},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is False
    assert data.get("passwordIsCorrect") is False


def test_login_missing_fields(client: FlaskClient):
    """Test de connexion avec des champs manquants."""
    rv = client.post("/api/login", json={"username": "test"})
    assert rv.status_code == 400


def test_register_password_not_returned(
    client: FlaskClient, cleanup_user: str
):
    """Vérifie que la réponse d'enregistrement ne contient pas le mot de
    passe."""
    username = cleanup_user
    rv = client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    data = cast(dict[str, Any], rv.get_json() or {})
    assert "password" not in data


def test_multiple_registrations_and_logins(
    client: FlaskClient, db_conn: Any, cleanup_user: str
):
    """Enregistre plusieurs utilisateurs et vérifie leurs connexions."""
    user1 = cleanup_user
    user2 = f"{cleanup_user}_{uuid.uuid4().hex[:6]}"

    # Enregistrer les deux
    rv1 = client.post(
        "/api/register", json={"username": user1, "password": "pw1"}
    )
    rv2 = client.post(
        "/api/register", json={"username": user2, "password": "pw2"}
    )
    assert rv1.status_code == 200
    assert rv2.status_code == 200

    # Se connecter aux deux
    l1 = client.post("/api/login", json={"username": user1, "password": "pw1"})
    l2 = client.post("/api/login", json={"username": user2, "password": "pw2"})
    assert (
        l1.status_code == 200
        and l1.get_json().get("passwordIsCorrect") is True
    )
    assert (
        l2.status_code == 200
        and l2.get_json().get("passwordIsCorrect") is True
    )

    # Nettoyage manuel pour user2 (cleanup_user s'occupe de user1)
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (user2,))
    db_conn.commit()
    cur.close()


def test_login_after_admin_delete(client: FlaskClient, cleanup_user: str):
    """Après suppression par admin, la connexion doit indiquer que
    l'utilisateur n'existe plus."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Supprimer via endpoint admin
    rv = client.delete(
        f"/api/admin/delete-user/{username}", headers={"X-Admin-User": "admin"}
    )
    assert rv.status_code == 200

    # Tentative de connexion -> utilisateur introuvable
    login = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert login.status_code == 200
    assert login.get_json().get("userExist") is False


def test_register_handles_integrity_error(
    client: FlaskClient, monkeypatch: pytest.MonkeyPatch, cleanup_user: str
):
    """Simule une IntegrityError lors de l'INSERT et vérifie le retour 409."""
    import psycopg2  # type: ignore

    username = cleanup_user

    # Monkeypatch `get_db_cursor` to raise IntegrityError on INSERT
    from contextlib import contextmanager

    class FakeCursor:
        _real: Any

        def __init__(self, real: Any) -> None:
            self._real = real

        def execute(
            self, sql: Any, params: tuple[Any, ...] | None = None
        ) -> Any:
            try:
                cond = isinstance(sql, str) and "INSERT INTO users" in sql
            except (TypeError, AttributeError):
                cond = False
            if cond:
                raise psycopg2.IntegrityError()
            return self._real.execute(sql, params)

        def fetchone(self) -> Any:
            return self._real.fetchone()

        def fetchall(self) -> list[Any]:
            return self._real.fetchall()

        def close(self) -> None:
            try:
                self._real.close()
            except (psycopg2.Error, AttributeError):
                pass

    @contextmanager
    def fake_get_db_cursor(conn: Any):
        real_cur: Any = conn.cursor()
        try:
            yield FakeCursor(real_cur)
        finally:
            try:
                real_cur.close()
            except (psycopg2.Error, AttributeError):
                pass

    monkeypatch.setattr(
        "backend.pages.accueil.auth.db.get_db_cursor", fake_get_db_cursor
    )

    rv = client.post(
        "/api/register", json={"username": username, "password": "pw"}
    )
    assert rv.status_code == 409
    assert rv.get_json().get("success") is False
