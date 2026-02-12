"""Tests pour les endpoints users (delete, reset, is-admin, language)."""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register(client, username):
    """Helper : inscrit un utilisateur."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )


def test_delete_user_via_delete(client: FlaskClient, cleanup_user: str):
    """Supprimer un utilisateur via méthode DELETE."""
    _register(client, cleanup_user)
    rv = client.delete(f"/api/user/delete-user/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_delete_user_via_post(client: FlaskClient, cleanup_user: str):
    """Supprimer un utilisateur via méthode POST."""
    _register(client, cleanup_user)
    rv = client.post(f"/api/user/delete-user/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_delete_admin_forbidden(client: FlaskClient):
    """Supprimer le compte admin est interdit (403)."""
    rv = client.delete("/api/user/delete-user/admin")
    assert rv.status_code == 403
    assert rv.get_json()["error"] == "forbidden"


def test_delete_admin_via_post_forbidden(client: FlaskClient):
    """Supprimer le compte admin via POST est aussi interdit."""
    rv = client.post("/api/user/delete-user/admin")
    assert rv.status_code == 403


def test_reset_sessions(client: FlaskClient, cleanup_user: str):
    """Reset des sessions et highscores d'un utilisateur."""
    _register(client, cleanup_user)
    # Créer des données
    client.post(
        "/api/score",
        json={
            "username": cleanup_user,
            "score": 100,
            "stage": 1,
            "timer": 10,
            "state": "game_over",
        },
    )
    # Reset
    rv = client.post(f"/api/user/reset-sessions/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
    # Vérifier
    rv = client.get(f"/api/user/sessions/{cleanup_user}")
    assert rv.get_json() == []


def test_is_admin_with_admin_user(client: FlaskClient, db_conn):
    """L'utilisateur 'admin' est bien admin quand is_admin=true en DB."""
    # Assurer que le flag is_admin est à true (par défaut il est false)
    cur = db_conn.cursor()
    cur.execute("UPDATE users SET is_admin = true WHERE username = 'admin'")
    db_conn.commit()
    cur.close()
    rv = client.get("/api/user/is-admin", headers={"X-Admin-User": "admin"})
    assert rv.status_code == 200
    assert rv.get_json()["is_admin"] is True


def test_is_admin_with_normal_user(client: FlaskClient, cleanup_user: str):
    """Un utilisateur normal n'est pas admin."""
    _register(client, cleanup_user)
    rv = client.get(
        "/api/user/is-admin", headers={"X-Admin-User": cleanup_user}
    )
    assert rv.status_code == 200
    assert rv.get_json()["is_admin"] is False


def test_is_admin_no_header(client: FlaskClient):
    """Appel sans header → 401."""
    rv = client.get("/api/user/is-admin")
    assert rv.status_code == 401


def test_is_admin_nonexistent_user(client: FlaskClient):
    """Appel avec un utilisateur inexistant."""
    rv = client.get(
        "/api/user/is-admin",
        headers={"X-Admin-User": f"ghost_{uuid.uuid4().hex[:6]}"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["is_admin"] is False


def test_set_language_empty_username(client: FlaskClient):
    """Changer la langue avec un username vide → 400."""
    rv = client.post(
        "/api/user/language", json={"username": "", "language": "en"}
    )
    assert rv.status_code == 400


def test_set_language_no_username(client: FlaskClient):
    """Changer la langue sans username → 400."""
    rv = client.post("/api/user/language", json={"language": "en"})
    assert rv.status_code == 400


def test_get_language_nonexistent_user(client: FlaskClient):
    """Langue d'un utilisateur inexistant → défaut fr."""
    rv = client.get(f"/api/user/language/ghost_{uuid.uuid4().hex[:6]}")
    assert rv.status_code == 200
    assert rv.get_json()["language"] == "fr"


def test_user_sessions_empty(client: FlaskClient, cleanup_user: str):
    """Sessions d'un utilisateur sans parties → liste vide."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/sessions/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_user_stats_no_games(client: FlaskClient, cleanup_user: str):
    """Stats d'un utilisateur sans parties → tous à zéro."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/stats/{cleanup_user}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["totalGames"] == 0
    assert data["bestScore"] == 0


def test_user_xp_new_user(client: FlaskClient, cleanup_user: str):
    """XP d'un nouvel utilisateur → 0."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/xp/{cleanup_user}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["xp"] == 0
    assert data["level"] == 1
