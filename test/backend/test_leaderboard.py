"""Tests pour les endpoints de leaderboard (topUsers.py)."""

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _create_player_with_score(client, username, score, stage=1, timer=10):
    """Helper : crée un joueur et lui attribue un score."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post(
        "/api/score",
        json={
            "username": username,
            "score": score,
            "stage": stage,
            "timer": timer,
            "state": "game_over",
        },
    )


def test_leaderboard_score_empty(client: FlaskClient):
    """Le leaderboard retourne une liste (potentiellement vide)."""
    rv = client.get("/api/leaderboard/score")
    assert rv.status_code == 200
    assert isinstance(rv.get_json(), list)


def test_leaderboard_users_empty(client: FlaskClient):
    """Le leaderboard users retourne une liste."""
    rv = client.get("/api/leaderboard/users")
    assert rv.status_code == 200
    assert isinstance(rv.get_json(), list)


def test_leaderboard_score_structure(client: FlaskClient, cleanup_user: str):
    """Vérifier la structure d'un entry dans le leaderboard des scores."""
    _create_player_with_score(client, cleanup_user, 500, 5, 60)
    rv = client.get("/api/leaderboard/score")
    data = rv.get_json()
    assert len(data) >= 1
    entry = data[0]
    assert "rank" in entry
    assert "username" in entry
    assert "score" in entry
    assert "stage" in entry
    assert "timer" in entry
    assert "state" in entry


def test_leaderboard_users_structure(client: FlaskClient, cleanup_user: str):
    """Vérifier la structure d'un entry dans le leaderboard des users."""
    _create_player_with_score(client, cleanup_user, 300)
    rv = client.get("/api/leaderboard/users")
    data = rv.get_json()
    assert len(data) >= 1
    entry = data[0]
    assert "rank" in entry
    assert "username" in entry
    assert "highScore" in entry


def test_leaderboard_score_max_10(client: FlaskClient, db_conn):
    """Le leaderboard ne retourne pas plus de 10 résultats."""
    rv = client.get("/api/leaderboard/score")
    assert rv.status_code == 200
    assert len(rv.get_json()) <= 10


def test_leaderboard_users_max_10(client: FlaskClient):
    """Le leaderboard users ne retourne pas plus de 10 résultats."""
    rv = client.get("/api/leaderboard/users")
    assert rv.status_code == 200
    assert len(rv.get_json()) <= 10


def test_leaderboard_score_ordered_desc(
    client: FlaskClient, cleanup_user: str
):
    """Les scores du leaderboard sont triés par score décroissant."""
    _create_player_with_score(client, cleanup_user, 100)
    rv = client.get("/api/leaderboard/score")
    data = rv.get_json()
    scores = [e["score"] for e in data]
    assert scores == sorted(scores, reverse=True)
