"""Tests pour les endpoints liés aux scores."""

import uuid
from typing import Any, cast

from flask.testing import FlaskClient

from backend.tests.conftest import TEST_PASSWORD


def test_submit_score(client: FlaskClient, cleanup_user: str):
    """Test de soumission d'un score pour un utilisateur."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Soumettre un score
    rv = client.post(
        "/api/score",
        json={"username": username, "score": 100, "stage": 2, "timer": 30},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("updated") is True
    assert data.get("highScore") == 100


def test_submit_score_update_highscore(client: FlaskClient, cleanup_user: str):
    """Test qu'un score plus élevé met à jour le meilleur score."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Soumettre le score initial
    rv = client.post("/api/score", json={"username": username, "score": 50})
    assert rv.get_json().get("highScore") == 50

    # Soumettre un score supérieur
    rv = client.post("/api/score", json={"username": username, "score": 100})
    data = rv.get_json()
    assert data.get("updated") is True
    assert data.get("highScore") == 100


def test_submit_score_no_update_lower(client: FlaskClient, cleanup_user: str):
    """Test qu'un score inférieur ne met pas à jour le meilleur score."""
    username = cleanup_user

    # Enregistrer l'utilisateur
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # Soumettre le score initial
    client.post("/api/score", json={"username": username, "score": 100})

    # Soumettre un score inférieur
    rv = client.post("/api/score", json={"username": username, "score": 50})
    data = rv.get_json()
    assert data.get("updated") is False
    assert data.get("highScore") == 100


def test_get_high_score(client: FlaskClient, cleanup_user: str):
    """Test de récupération du meilleur score d'un utilisateur."""
    username = cleanup_user

    # Enregistrer et soumettre un score
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 150, "stage": 3, "timer": 45},
    )

    # Récupérer le meilleur score
    rv = client.get(f"/api/score/{username}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("username") == username
    assert data.get("highScore") == 150
    assert data.get("stage") == 3
    assert data.get("timer") == 45


def test_get_high_score_not_found(client: FlaskClient):
    """Test de récupération du meilleur score pour un utilisateur
    inexistant."""
    rv = client.get("/api/score/nonexistent_user")
    assert rv.status_code == 404


def test_list_high_scores(client: FlaskClient, cleanup_user: str):
    """Test de listing de tous les meilleurs scores."""
    username = cleanup_user

    # Enregistrer et soumettre un score
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    client.post("/api/score", json={"username": username, "score": 200})

    # Récupérer le classement
    rv = client.get("/api/score")
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)

    # Vérifier que notre utilisateur est dans la liste (filtrer uniquement les
    # noms d'utilisateur en string)
    usernames: list[str] = []
    for entry in cast(list[dict[str, Any]], data):
        maybe_u: Any = entry.get("username")
        if isinstance(maybe_u, str):
            usernames.append(maybe_u)
    assert username in usernames


def test_submit_score_missing_fields(client: FlaskClient):
    """Test de soumission de score avec des champs requis manquants."""
    rv = client.post("/api/score", json={"username": "test"})
    assert rv.status_code == 400


def test_submit_score_invalid_score_type(
    client: FlaskClient, cleanup_user: str
):
    """Test de soumission de score avec un type de score invalide."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    rv = client.post(
        "/api/score", json={"username": username, "score": "notanumber"}
    )
    assert rv.status_code == 400


def test_game_session_recorded(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """Vérifie qu'une session de jeu est enregistrée lors de la soumission
    d'un score."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )
    rv = client.post(
        "/api/score",
        json={"username": username, "score": 123, "stage": 1, "timer": 10},
    )
    assert rv.status_code == 200

    cur = db_conn.cursor()
    cur.execute(
        "SELECT COUNT(*) FROM game_sessions WHERE username = %s", (username,)
    )
    row = cur.fetchone()
    assert row is not None and int(row[0]) == 1
    cur.close()


def test_stage_timer_persistence_on_update(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """Vérifie que stage/timer sont conservés si non fournis lors d'une
    mise à jour,"""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    # soumettre avec stage/timer
    client.post(
        "/api/score",
        json={"username": username, "score": 100, "stage": 2, "timer": 30},
    )

    # mettre à jour le score sans stage/timer
    client.post("/api/score", json={"username": username, "score": 200})

    rv = client.get(f"/api/score/{username}")
    assert rv.status_code == 200
    data = cast(dict[str, Any], rv.get_json())
    assert data.get("highScore") == 200
    assert data.get("stage") == 2
    assert data.get("timer") == 30

    # maintenant l'inverse : d'abord sans stage/timer puis mettre à jour AVEC
    user2 = f"{username}_u2"
    client.post(
        "/api/register", json={"username": user2, "password": TEST_PASSWORD}
    )
    client.post("/api/score", json={"username": user2, "score": 50})
    client.post(
        "/api/score",
        json={"username": user2, "score": 150, "stage": 5, "timer": 60},
    )
    rv2 = client.get(f"/api/score/{user2}")
    assert rv2.status_code == 200
    d2 = cast(dict[str, Any], rv2.get_json())
    assert d2.get("highScore") == 150
    assert d2.get("stage") == 5
    assert d2.get("timer") == 60

    # cleanup user2
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (user2,))
    db_conn.commit()
    cur.close()


def test_list_ordering_by_highscore(client: FlaskClient, db_conn: Any):
    """Vérifie que la liste des meilleurs scores est triée par highScore
    DESC."""
    u1 = f"lst_{uuid.uuid4().hex[:6]}"
    u2 = f"lst_{uuid.uuid4().hex[:6]}"
    client.post("/api/register", json={"username": u1, "password": "p1"})
    client.post("/api/register", json={"username": u2, "password": "p2"})
    client.post("/api/score", json={"username": u1, "score": 150})
    client.post("/api/score", json={"username": u2, "score": 250})

    rv = client.get("/api/score")
    assert rv.status_code == 200
    arr = cast(list[dict[str, Any]], rv.get_json())
    assert len(arr) >= 2
    # premier élément doit être u2 (250)
    assert arr[0].get("username") == u2

    # cleanup
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username IN (%s, %s)", (u1, u2))
    db_conn.commit()
    cur.close()
