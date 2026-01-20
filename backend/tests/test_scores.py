"""Tests for score-related endpoints."""

from typing import Any, cast

from flask.testing import FlaskClient


def test_submit_score(client: FlaskClient, cleanup_user: str):
    """Test submitting a score for a user."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Submit score
    rv = client.post(
        "/api/score",
        json={"username": username, "score": 100, "stage": 2, "timer": 30},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("updated") is True
    assert data.get("highScore") == 100


def test_submit_score_update_highscore(client: FlaskClient, cleanup_user: str):
    """Test that a higher score updates the high score."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Submit initial score
    rv = client.post("/api/score", json={"username": username, "score": 50})
    assert rv.get_json().get("highScore") == 50

    # Submit higher score
    rv = client.post("/api/score", json={"username": username, "score": 100})
    data = rv.get_json()
    assert data.get("updated") is True
    assert data.get("highScore") == 100


def test_submit_score_no_update_lower(client: FlaskClient, cleanup_user: str):
    """Test that a lower score doesn't update the high score."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Submit initial score
    client.post("/api/score", json={"username": username, "score": 100})

    # Submit lower score
    rv = client.post("/api/score", json={"username": username, "score": 50})
    data = rv.get_json()
    assert data.get("updated") is False
    assert data.get("highScore") == 100


def test_get_high_score(client: FlaskClient, cleanup_user: str):
    """Test retrieving a user's high score."""
    username = cleanup_user

    # Register and submit score
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 150, "stage": 3, "timer": 45},
    )

    # Get high score
    rv = client.get(f"/api/score/{username}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("username") == username
    assert data.get("highScore") == 150
    assert data.get("stage") == 3
    assert data.get("timer") == 45


def test_get_high_score_not_found(client: FlaskClient):
    """Test retrieving high score for non-existent user."""
    rv = client.get("/api/score/nonexistent_user")
    assert rv.status_code == 404


def test_list_high_scores(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """Test listing all high scores."""
    username = cleanup_user

    # Register and submit score
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/score", json={"username": username, "score": 200})

    # Get leaderboard
    rv = client.get("/api/score")
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)

    # Verify our user is in the list (filter only string usernames)
    usernames: list[str] = []
    for entry in cast(list[dict[str, Any]], data):
        maybe_u: Any = entry.get("username")
        if isinstance(maybe_u, str):
            usernames.append(maybe_u)
    assert username in usernames


def test_submit_score_missing_fields(client: FlaskClient):
    """Test submitting score with missing required fields."""
    rv = client.post("/api/score", json={"username": "test"})
    assert rv.status_code == 400


def test_submit_score_invalid_score_type(
    client: FlaskClient, cleanup_user: str
):
    """Test submitting score with invalid score type."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    rv = client.post(
        "/api/score", json={"username": username, "score": "notanumber"}
    )
    assert rv.status_code == 400
