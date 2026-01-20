"""Tests pour les endpoints de profil utilisateur (XP, langue, sessions,
statistiques)."""

from typing import Any, cast

from flask.testing import FlaskClient

from backend.tests.conftest import TEST_PASSWORD


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
