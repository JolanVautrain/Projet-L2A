"""Tests pour les endpoints admin (ban, unban, set-admin, remove-admin, check)."""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register(client, username):
    """Helper : inscrit un utilisateur."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )


def test_check_admin_true(client: FlaskClient, db_conn):
    """L'utilisateur 'admin' est reconnu comme admin quand is_admin=true en DB."""
    # Assurer que le flag is_admin est à true (par défaut il est false)
    cur = db_conn.cursor()
    cur.execute("UPDATE users SET is_admin = true WHERE username = 'admin'")
    db_conn.commit()
    cur.close()
    rv = client.get("/api/admin/check/admin")
    assert rv.status_code == 200
    assert rv.get_json()["isAdmin"] is True


def test_check_admin_false(client: FlaskClient, cleanup_user: str):
    """Un utilisateur normal n'est pas admin."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/admin/check/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json()["isAdmin"] is False


def test_check_admin_nonexistent(client: FlaskClient):
    """Un utilisateur inexistant n'est pas admin."""
    rv = client.get(f"/api/admin/check/ghost_{uuid.uuid4().hex[:6]}")
    assert rv.status_code == 200
    assert rv.get_json()["isAdmin"] is False


def test_set_admin(client: FlaskClient, cleanup_user: str):
    """Promouvoir un utilisateur comme admin."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/set-admin/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
    # Vérifier
    rv = client.get(f"/api/admin/check/{cleanup_user}")
    assert rv.get_json()["isAdmin"] is True


def test_set_admin_already_admin(client: FlaskClient):
    """Promouvoir 'admin' retourne 400 (déjà admin)."""
    rv = client.post(
        "/api/admin/set-admin/admin",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_set_admin_unauthorized(client: FlaskClient, cleanup_user: str):
    """Promouvoir sans être admin → 401."""
    _register(client, cleanup_user)
    rv = client.post(f"/api/admin/set-admin/{cleanup_user}")
    assert rv.status_code == 401


def test_remove_admin(client: FlaskClient, cleanup_user: str):
    """Rétrograder un admin."""
    _register(client, cleanup_user)
    # Promouvoir
    client.post(
        f"/api/admin/set-admin/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    # Rétrograder
    rv = client.post(
        f"/api/admin/remove-admin/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
    rv = client.get(f"/api/admin/check/{cleanup_user}")
    assert rv.get_json()["isAdmin"] is False


def test_remove_admin_original_forbidden(client: FlaskClient):
    """Rétrograder le compte admin original → 403."""
    rv = client.post(
        "/api/admin/remove-admin/admin",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 403


def test_ban_user_temporary(client: FlaskClient, cleanup_user: str):
    """Bannir un utilisateur temporairement."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 24, "reason": "Triche"},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_ban_user_permanent(client: FlaskClient, cleanup_user: str):
    """Bannir un utilisateur de façon permanente."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"reason": "Abus répétés"},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_ban_admin_forbidden(client: FlaskClient):
    """Bannir le compte admin → 403."""
    rv = client.post(
        "/api/admin/ban-user/admin",
        json={"duration_hours": 1},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 403


def test_ban_invalid_duration_negative(client: FlaskClient, cleanup_user: str):
    """Bannir avec une durée négative → 400."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": -5},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_ban_invalid_duration_string(client: FlaskClient, cleanup_user: str):
    """Bannir avec une durée non numérique → 400."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": "abc"},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_ban_unauthorized(client: FlaskClient, cleanup_user: str):
    """Bannir sans être admin → 401."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 1},
    )
    assert rv.status_code == 401


def test_unban_user(client: FlaskClient, cleanup_user: str):
    """Débannir un utilisateur."""
    _register(client, cleanup_user)
    # Bannir
    client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 1},
        headers={"X-Admin-User": "admin"},
    )
    # Débannir
    rv = client.post(
        f"/api/admin/unban-user/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_login_banned_user(client: FlaskClient, cleanup_user: str):
    """Un utilisateur banni ne peut pas se connecter."""
    _register(client, cleanup_user)
    client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 24, "reason": "Test ban"},
        headers={"X-Admin-User": "admin"},
    )
    rv = client.post(
        "/api/login",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    data = rv.get_json()
    assert data.get("banned") is True
    assert "ban_reason" in data
    assert "banned_until" in data


def test_login_after_unban(client: FlaskClient, cleanup_user: str):
    """Un utilisateur débanni peut se reconnecter."""
    _register(client, cleanup_user)
    client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 1},
        headers={"X-Admin-User": "admin"},
    )
    client.post(
        f"/api/admin/unban-user/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    rv = client.post(
        "/api/login",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    assert rv.get_json()["passwordIsCorrect"] is True
