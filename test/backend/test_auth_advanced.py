"""Tests supplémentaires pour auth.py (bannissements, cas limites)."""

from datetime import datetime, timedelta, timezone
from typing import Any

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def test_login_banned_user(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """Test de connexion d'un utilisateur banni."""
    username = cleanup_user

    # Créer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Bannir l'utilisateur
    banned_until = datetime.now(timezone.utc) + timedelta(days=1)
    cur = db_conn.cursor()
    cur.execute(
        "UPDATE users SET banned_until = %s, ban_reason = %s WHERE username = %s",
        (banned_until, "Test ban", username),
    )
    db_conn.commit()
    cur.close()

    # Essayer de se connecter
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("banned") is True
    assert "ban_reason" in data
    assert data["ban_reason"] == "Test ban"


def test_login_expired_ban(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """Test de connexion avec un ban expiré."""
    username = cleanup_user

    # Créer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Bannir l'utilisateur avec une date passée
    banned_until = datetime.now(timezone.utc) - timedelta(days=1)
    cur = db_conn.cursor()
    cur.execute(
        "UPDATE users SET banned_until = %s, ban_reason = %s WHERE username = %s",
        (banned_until, "Expired ban", username),
    )
    db_conn.commit()
    cur.close()

    # Se connecter devrait fonctionner
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is True
    assert "banned" not in data or data.get("banned") is not True


def test_register_with_language(client: FlaskClient, cleanup_user: str):
    """Test d'inscription avec spécification de la langue."""
    username = cleanup_user

    rv = client.post(
        "/api/register",
        json={
            "username": username,
            "password": TEST_PASSWORD,
            "language": "en",
        },
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("success") is True

    # Vérifier que la langue est bien enregistrée
    rv = client.get(f"/api/user/language/{username}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("language") == "en"


def test_login_returns_user_data(client: FlaskClient, cleanup_user: str):
    """Test que le login retourne les bonnes données utilisateur."""
    username = cleanup_user

    # Créer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Se connecter
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is True
    assert "banned" not in data or data.get("banned") is not True
