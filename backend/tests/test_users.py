"""Tests for user profile endpoints (XP, language, sessions, stats)."""

from typing import Any, cast

from flask.testing import FlaskClient


def test_get_user_xp_new_user(client: FlaskClient, cleanup_user: str):
    """Test getting XP for a new user (should default to 0 XP, level 1)."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Get XP
    rv = client.get(f"/api/user/xp/{username}")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("xp") == 0
    assert data.get("level") == 1


def test_add_user_xp(client: FlaskClient, cleanup_user: str):
    """Test adding XP to a user."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Add XP
    rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("xp") == 50
    assert data.get("level") == 1

    # Verify with GET
    rv = client.get(f"/api/user/xp/{username}")
    assert rv.get_json().get("xp") == 50


def test_add_user_xp_level_up(client: FlaskClient, cleanup_user: str):
    """Test that adding 100+ XP increases level."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Add 100 XP (should level up)
    rv = client.post("/api/user/xp", json={"username": username, "xp": 100})
    data = rv.get_json()
    assert data.get("xp") == 100
    assert data.get("level") == 2

    # Add 50 more (150 total = level 2)
    rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
    data = rv.get_json()
    assert data.get("xp") == 150
    assert data.get("level") == 2


def test_remove_user_xp(client: FlaskClient, cleanup_user: str):
    """Test removing XP (negative delta)."""
    username = cleanup_user

    # Register and add XP
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 100})

    # Remove XP
    rv = client.post("/api/user/xp", json={"username": username, "xp": -30})
    assert rv.status_code == 200
    assert rv.get_json().get("xp") == 70


def test_xp_cannot_go_negative(client: FlaskClient, cleanup_user: str):
    """Test that XP is clamped to 0 (no negative XP)."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Try to remove more XP than available
    rv = client.post("/api/user/xp", json={"username": username, "xp": -100})
    assert rv.get_json().get("xp") == 0


def test_get_user_language(client: FlaskClient, cleanup_user: str):
    """Test getting user language preference."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Default language should be 'fr'
    rv = client.get(f"/api/user/language/{username}")
    assert rv.status_code == 200
    assert rv.get_json().get("language") == "fr"


def test_set_user_language(client: FlaskClient, cleanup_user: str):
    """Test setting user language preference."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Set language to English
    rv = client.post(
        "/api/user/language", json={"username": username, "language": "en"}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("language") == "en"

    # Verify
    rv = client.get(f"/api/user/language/{username}")
    assert rv.get_json().get("language") == "en"


def test_get_user_sessions(client: FlaskClient, cleanup_user: str):
    """Test retrieving all game sessions for a user."""
    username = cleanup_user

    # Register user and submit some scores (which create sessions)
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/score", json={"username": username, "score": 100})
    client.post("/api/score", json={"username": username, "score": 200})

    # Get sessions
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.status_code == 200
    data = cast(list[dict[str, Any]], rv.get_json())
    assert isinstance(data, list)
    assert len(data) == 2

    # Verify sorted by score DESC
    assert data[0].get("score") == 200
    assert data[1].get("score") == 100


def test_get_user_sessions_empty(client: FlaskClient, cleanup_user: str):
    """Test retrieving sessions for user with no sessions."""
    username = cleanup_user

    # Register user (but don't submit any scores)
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Get sessions
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.status_code == 200
    assert rv.get_json() == []


def test_get_user_stats(client: FlaskClient, cleanup_user: str):
    """Test retrieving aggregated user statistics."""
    username = cleanup_user

    # Register and submit scores
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 100, "stage": 2, "timer": 30},
    )
    client.post(
        "/api/score",
        json={"username": username, "score": 200, "stage": 3, "timer": 45},
    )

    # Get stats
    rv = client.get(f"/api/user/stats/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert data.get("totalGames") == 2
    assert data.get("totalScore") == 300
    assert data.get("bestScore") == 200
    assert data.get("highestStage") == 3
    assert data.get("averageScore") == 150


def test_get_user_stats_no_sessions(client: FlaskClient, cleanup_user: str):
    """Test retrieving stats for user with no sessions."""
    username = cleanup_user

    # Register user only
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Get stats
    rv = client.get(f"/api/user/stats/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert data.get("totalGames") == 0
    assert data.get("totalScore") == 0
    assert data.get("bestScore") == 0


def test_get_user_xp_history(client: FlaskClient, cleanup_user: str):
    """Test retrieving XP history for a user."""
    username = cleanup_user

    # Register and add XP multiple times
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 50})
    client.post("/api/user/xp", json={"username": username, "xp": 30})

    # Get history
    rv = client.get(f"/api/user/xp/history/{username}")
    assert rv.status_code == 200
    data = rv.get_json()

    assert len(data) >= 2
    # Check that entries are in chronological order (ASC)
    assert int(data[0].get("xp")) <= int(data[-1].get("xp"))


def test_xp_add_missing_fields(client: FlaskClient):
    """Test adding XP with missing fields."""
    rv = client.post("/api/user/xp", json={"username": "test"})
    assert rv.status_code == 400
