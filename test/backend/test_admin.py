"""Tests pour les endpoints réservés à l'administrateur."""

import uuid
from typing import Any, cast

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register(client, username):
    """Helper : inscrit un utilisateur."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )


def test_reset_test_account(client: FlaskClient):
    """Test de réinitialisation des scores du compte de test administrateur."""
    # Soumettre d'abord un score pour l'administrateur
    client.post("/api/score", json={"username": "admin", "score": 500})

    # Le réinitialiser
    rv = client.post("/api/admin/reset-test")
    assert rv.status_code == 200
    assert rv.get_json().get("ok") is True

    # Vérifier que le score est réinitialisé
    rv = client.get("/api/score/admin")
    assert rv.status_code == 200
    assert rv.get_json().get("highScore") == 0


def test_admin_list_users(client: FlaskClient, cleanup_user: str):
    """Test d'énumération de tous les utilisateurs (endpoint admin)."""
    username = cleanup_user

    # Enregistrer un utilisateur de test
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Lister les utilisateurs avec l'en-tête admin
    rv = client.get(
        "/api/admin/users",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)

    usernames: list[str] = []
    for u in cast(list[dict[str, Any]], data):
        maybe = u.get("username")
        if isinstance(maybe, str):
            usernames.append(maybe)

    assert username in usernames


def test_admin_list_users_unauthorized(client: FlaskClient):
    """Test qu'un non-admin ne peut pas lister les utilisateurs."""
    rv = client.get(
        "/api/admin/users",
        headers={"X-Admin-User": "nonadmin"},
    )
    assert rv.status_code == 401


def test_admin_reset_user_scores(client: FlaskClient, cleanup_user: str):
    """Test de réinitialisation des meilleurs scores d'un utilisateur
    spécifique."""
    username = cleanup_user

    # Enregistrer et soumettre un score
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/score", json={"username": username, "score": 300})

    # Réinitialiser les scores
    rv = client.post(
        f"/api/admin/reset-user/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json().get("ok") is True

    # Vérifier que le score est réinitialisé
    rv = client.get(f"/api/score/{username}")
    assert rv.status_code == 200
    assert rv.get_json().get("highScore") == 0


def test_admin_reset_user_sessions(client: FlaskClient, cleanup_user: str):
    """Test de suppression de toutes les sessions pour un utilisateur
    spécifique."""
    username = cleanup_user

    # Enregistrer et soumettre des scores (créé des sessions)
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/score", json={"username": username, "score": 100})
    client.post("/api/score", json={"username": username, "score": 200})

    # Réinitialiser les sessions
    rv = client.post(
        f"/api/admin/reset-sessions/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Vérifier que les sessions sont effacées
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.get_json() == []


def test_admin_delete_user(client: FlaskClient, cleanup_user: str):
    """Test de suppression complète d'un utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Delete user
    rv = client.delete(
        f"/api/admin/delete-user/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Vérifier que l'utilisateur est supprimé (la connexion doit échouer)
    rv = client.post(
        "/api/login", json={"username": username, "password": TEST_PASSWORD}
    )
    assert rv.get_json().get("userExist") is False


def test_admin_delete_xp_history(client: FlaskClient, cleanup_user: str):
    """Test de suppression de l'historique XP pour un utilisateur."""
    username = cleanup_user

    # Enregistrer et ajouter des XP
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 50})
    client.post("/api/user/xp", json={"username": username, "xp": 30})

    # Supprimer l'historique XP
    rv = client.post(
        f"/api/admin/delete-xp-history/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Vérifier que l'historique est effacé
    rv = client.get(f"/api/user/xp/history/{username}")
    assert rv.get_json() == []


def test_admin_unauthorized_operations(client: FlaskClient, cleanup_user: str):
    """Test que les utilisateurs non autorisés ne peuvent pas accéder aux
    endpoints admin."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    endpoints = [
        ("/api/admin/users", "GET"),
        (f"/api/admin/reset-user/{username}", "POST"),
        (f"/api/admin/reset-sessions/{username}", "POST"),
        (f"/api/admin/delete-user/{username}", "DELETE"),
        (f"/api/admin/delete-xp-history/{username}", "POST"),
    ]

    for endpoint, method in endpoints:
        if method == "GET":
            rv = client.get(endpoint, headers={"X-Admin-User": "wronguser"})
        else:
            rv = client.post(endpoint, headers={"X-Admin-User": "wronguser"})

        assert (
            rv.status_code == 401
        ), f"{method} {endpoint} doit être réservé à l'admin"


def test_admin_cannot_delete_admin(client: FlaskClient):
    """L'admin ne doit pas pouvoir supprimer le compte `admin`."""
    rv = client.delete(
        "/api/admin/delete-user/admin",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 403
    data = rv.get_json()
    assert data.get("error") == "forbidden"


def test_check_admin_true(client: FlaskClient, db_conn):
    """L'utilisateur 'admin' est reconnu comme admin quand is_admin=true en DB."""
    # Assurer que le flag is_admin est a true (par defaut il est false)
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
    # Verifier
    rv = client.get(f"/api/admin/check/{cleanup_user}")
    assert rv.get_json()["isAdmin"] is True


def test_set_admin_already_admin(client: FlaskClient):
    """Promouvoir 'admin' retourne 400 (deja admin)."""
    rv = client.post(
        "/api/admin/set-admin/admin",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_set_admin_unauthorized(client: FlaskClient, cleanup_user: str):
    """Promouvoir sans etre admin -> 401."""
    _register(client, cleanup_user)
    rv = client.post(f"/api/admin/set-admin/{cleanup_user}")
    assert rv.status_code == 401


def test_remove_admin(client: FlaskClient, cleanup_user: str):
    """Retrograder un admin."""
    _register(client, cleanup_user)
    # Promouvoir
    client.post(
        f"/api/admin/set-admin/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    # Retrograder
    rv = client.post(
        f"/api/admin/remove-admin/{cleanup_user}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
    rv = client.get(f"/api/admin/check/{cleanup_user}")
    assert rv.get_json()["isAdmin"] is False


def test_remove_admin_original_forbidden(client: FlaskClient):
    """Retrograder le compte admin original -> 403."""
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
    """Bannir un utilisateur de facon permanente."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"reason": "Abus repetes"},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_ban_admin_forbidden(client: FlaskClient):
    """Bannir le compte admin -> 403."""
    rv = client.post(
        "/api/admin/ban-user/admin",
        json={"duration_hours": 1},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 403


def test_ban_invalid_duration_negative(client: FlaskClient, cleanup_user: str):
    """Bannir avec une duree negative -> 400."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": -5},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_ban_invalid_duration_string(client: FlaskClient, cleanup_user: str):
    """Bannir avec une duree non numerique -> 400."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": "abc"},
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 400


def test_ban_unauthorized(client: FlaskClient, cleanup_user: str):
    """Bannir sans etre admin -> 401."""
    _register(client, cleanup_user)
    rv = client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 1},
    )
    assert rv.status_code == 401


def test_unban_user(client: FlaskClient, cleanup_user: str):
    """Debannir un utilisateur."""
    _register(client, cleanup_user)
    # Bannir
    client.post(
        f"/api/admin/ban-user/{cleanup_user}",
        json={"duration_hours": 1},
        headers={"X-Admin-User": "admin"},
    )
    # Debannir
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
    """Un utilisateur debanni peut se reconnecter."""
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
