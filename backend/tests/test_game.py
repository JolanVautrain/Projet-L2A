"""Tests pour les endpoints du jeu (lobby, inputs)."""

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def test_store_input(client: FlaskClient, cleanup_user: str):
    """Test de stockage d'un input utilisateur."""
    username = cleanup_user

    # Créer l'utilisateur d'abord
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Stocker un input
    rv = client.post(
        "/api/game/input",
        json={"username": username, "input": "test_input_data"},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("Success") == "input written"


def test_store_input_invalid_json(client: FlaskClient):
    """Test de stockage avec JSON invalide."""
    rv = client.post("/api/game/input", data="invalid")
    assert rv.status_code == 400
    data = rv.get_json()
    assert "Error" in data


def test_wait_for_game(client: FlaskClient, cleanup_user: str):
    """Test d'ajout d'un joueur au lobby."""
    username = cleanup_user

    # Ajouter le joueur au lobby
    rv = client.post("/api/game/lobby", json={"username": username})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("Success") == f"{username} waiting in lobby"


def test_wait_for_game_duplicate(client: FlaskClient, cleanup_user: str):
    """Test d'ajout d'un joueur déjà dans le lobby."""
    username = cleanup_user

    # Ajouter le joueur une première fois
    client.post("/api/game/lobby", json={"username": username})

    # Essayer de l'ajouter à nouveau
    rv = client.post("/api/game/lobby", json={"username": username})
    assert rv.status_code == 400
    data = rv.get_json()
    assert "Error" in data
    assert "already waiting" in data["Error"]


def test_wait_for_game_invalid_json(client: FlaskClient):
    """Test d'ajout au lobby avec JSON invalide."""
    rv = client.post("/api/game/lobby", data="invalid")
    assert rv.status_code == 400
    data = rv.get_json()
    assert "Error" in data


def test_get_players_count(client: FlaskClient):
    """Test de récupération du nombre de joueurs."""
    rv = client.get("/api/game/lobby/players")
    assert rv.status_code == 200
    data = rv.get_json()
    assert "count" in data
    assert isinstance(data["count"], int)
