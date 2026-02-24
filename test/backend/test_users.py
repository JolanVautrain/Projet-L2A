"""Tests pour les endpoints de profil utilisateur (XP, langue, sessions,
statistiques)."""

import uuid
from typing import Any, cast

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register(client, username):
    """Helper : inscrit un utilisateur."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )


def test_get_user_xp_new_user(client: FlaskClient, cleanup_user: str):
    """Test de récupération des XP pour un nouvel utilisateur (doit être 0 XP,
    niveau 1)."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Récupérer les XP
    rv = client.get(f"/api/user/xp/{username}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("xp") == 0
    assert data.get("level") == 1


def test_add_user_xp(client: FlaskClient, cleanup_user: str):
    """Test d'ajout d'XP à un utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Ajouter des XP
    rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("xp") == 50
    assert data.get("level") == 1

    # Vérifier avec un GET
    rv = client.get(f"/api/user/xp/{username}")
    assert rv.get_json().get("xp") == 50


def test_add_user_xp_level_up(client: FlaskClient, cleanup_user: str):
    """Test qu'ajouter 100+ XP augmente le niveau."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Ajouter 100 XP (devrait monter de niveau)
    rv = client.post("/api/user/xp", json={"username": username, "xp": 100})
    data = rv.get_json()
    assert data.get("xp") == 100
    assert data.get("level") == 2

    # Ajouter 50 de plus (150 total = niveau 2)
    rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
    data = rv.get_json()
    assert data.get("xp") == 150
    assert data.get("level") == 2


def test_remove_user_xp(client: FlaskClient, cleanup_user: str):
    """Test de retrait d'XP (delta négatif)."""
    username = cleanup_user

    # Enregistrer et ajouter des XP
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 100})

    # Retirer des XP
    rv = client.post("/api/user/xp", json={"username": username, "xp": -30})
    assert rv.status_code == 200
    assert rv.get_json().get("xp") == 70


def test_xp_cannot_go_negative(client: FlaskClient, cleanup_user: str):
    """Test que les XP sont plafonnés à 0 (pas d'XP négatif)."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Essayer de retirer plus d'XP que disponible
    rv = client.post("/api/user/xp", json={"username": username, "xp": -100})
    assert rv.get_json().get("xp") == 0


def test_get_user_language(client: FlaskClient, cleanup_user: str):
    """Test de récupération de la préférence de langue d'un utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # La langue par défaut devrait être 'fr'
    rv = client.get(f"/api/user/language/{username}")
    assert rv.status_code == 200
    assert rv.get_json().get("language") == "fr"


def test_set_user_language(client: FlaskClient, cleanup_user: str):
    """Test du changement de préférence de langue d'un utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Définir la langue sur l'anglais
    rv = client.post(
        "/api/user/language", json={"username": username, "language": "en"}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("language") == "en"

    # Vérifier
    rv = client.get(f"/api/user/language/{username}")
    assert rv.get_json().get("language") == "en"


def test_get_user_sessions(client: FlaskClient, cleanup_user: str):
    """Test de récupération de toutes les sessions de jeu pour un
    utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur et soumettre des scores (qui créent des
    # sessions)
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/score", json={"username": username, "score": 100})
    client.post("/api/score", json={"username": username, "score": 200})

    # Récupérer les sessions
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.status_code == 200
    data = cast(list[dict[str, Any]], rv.get_json())
    assert isinstance(data, list)
    assert len(data) == 2

    # Vérifier trié par score décroissant
    assert data[0].get("score") == 200
    assert data[1].get("score") == 100


def test_get_user_sessions_empty(client: FlaskClient, cleanup_user: str):
    """Test de récupération des sessions pour un utilisateur sans sessions."""
    username = cleanup_user

    # Enregistrer l'utilisateur (sans soumettre de scores)
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Récupérer les sessions
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_get_user_stats(client: FlaskClient, cleanup_user: str):
    """Test de récupération des statistiques agrégées d'un utilisateur."""
    username = cleanup_user

    # Enregistrer et soumettre des scores
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 100, "stage": 2, "timer": 30},
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 200, "stage": 3, "timer": 45},
    )

    # Récupérer les statistiques
    rv = client.get(f"/api/user/stats/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert data.get("totalGames") == 2
    assert data.get("totalScore") == 300
    assert data.get("bestScore") == 200
    assert data.get("highestStage") == 3
    assert data.get("averageScore") == 150


def test_get_user_stats_no_sessions(client: FlaskClient, cleanup_user: str):
    """Test de récupération des statistiques pour un utilisateur sans
    sessions."""
    username = cleanup_user

    # Enregistrer uniquement l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Récupérer les statistiques
    rv = client.get(f"/api/user/stats/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert data.get("totalGames") == 0
    assert data.get("totalScore") == 0
    assert data.get("bestScore") == 0


def test_get_user_xp_history(client: FlaskClient, cleanup_user: str):
    """Test de récupération de l'historique XP pour un utilisateur."""
    username = cleanup_user

    # Enregistrer et ajouter des XP plusieurs fois
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 50})
    client.post("/api/user/xp", json={"username": username, "xp": 30})

    # Récupérer l'historique
    rv = client.get(f"/api/user/xp/history/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert len(data) >= 2
    # Vérifier que les entrées sont en ordre chronologique (ASC)
    assert int(data[0].get("xp")) <= int(data[-1].get("xp"))


def test_xp_add_missing_fields(client: FlaskClient):
    """Test d'ajout d'XP avec des champs manquants."""
    rv = client.post("/api/user/xp", json={"username": "test"})
    assert rv.status_code == 400


def test_delete_user_via_delete(client: FlaskClient, cleanup_user: str):
    """Supprimer un utilisateur via methode DELETE."""
    _register(client, cleanup_user)
    rv = client.delete(f"/api/user/delete-user/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True


def test_delete_user_via_post(client: FlaskClient, cleanup_user: str):
    """Supprimer un utilisateur via methode POST."""
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
    # Creer des donnees
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
    # Verifier
    rv = client.get(f"/api/user/sessions/{cleanup_user}")
    assert rv.get_json() == []


def test_is_admin_with_admin_user(client: FlaskClient, db_conn):
    """L'utilisateur 'admin' est bien admin quand is_admin=true en DB."""
    # Assurer que le flag is_admin est a true (par defaut il est false)
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
    """Appel sans header -> 401."""
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
    """Changer la langue avec un username vide -> 400."""
    rv = client.post(
        "/api/user/language", json={"username": "", "language": "en"}
    )
    assert rv.status_code == 400


def test_set_language_no_username(client: FlaskClient):
    """Changer la langue sans username -> 400."""
    rv = client.post("/api/user/language", json={"language": "en"})
    assert rv.status_code == 400


def test_get_language_nonexistent_user(client: FlaskClient):
    """Langue d'un utilisateur inexistant -> defaut fr."""
    rv = client.get(f"/api/user/language/ghost_{uuid.uuid4().hex[:6]}")
    assert rv.status_code == 200
    assert rv.get_json()["language"] == "fr"


def test_user_sessions_empty(client: FlaskClient, cleanup_user: str):
    """Sessions d'un utilisateur sans parties -> liste vide."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/sessions/{cleanup_user}")
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_user_stats_no_games(client: FlaskClient, cleanup_user: str):
    """Stats d'un utilisateur sans parties -> tous a zero."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/stats/{cleanup_user}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["totalGames"] == 0
    assert data["bestScore"] == 0


def test_user_xp_new_user(client: FlaskClient, cleanup_user: str):
    """XP d'un nouvel utilisateur -> 0."""
    _register(client, cleanup_user)
    rv = client.get(f"/api/user/xp/{cleanup_user}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["xp"] == 0
    assert data["level"] == 1
