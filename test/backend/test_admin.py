"""Tests pour les endpoints réservés à l'administrateur."""

from typing import Any, cast

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


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
