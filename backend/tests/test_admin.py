"""Tests for admin-only endpoints."""

from flask.testing import FlaskClient


def test_reset_test_account(client: FlaskClient):
    """Test resetting the admin test account scores."""
    # First submit a score for admin
    client.post("/api/score", json={"username": "admin", "score": 500})

    # Reset it
    rv = client.post("/api/admin/reset-test")
    assert rv.status_code == 200
    assert rv.get_json().get("ok") is True

    # Verify score is reset
    rv = client.get("/api/score/admin")
    assert rv.status_code == 200
    assert rv.get_json().get("highScore") == 0


def test_admin_list_users(client: FlaskClient, cleanup_user: str):
    """Test listing all users (admin endpoint)."""
    username = cleanup_user

    # Register a test user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # List users with admin header
    rv = client.get(
        "/api/admin/users",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert isinstance(data, list)

    usernames = [u.get("username") for u in data]
    assert username in usernames


def test_admin_list_users_unauthorized(client: FlaskClient):
    """Test that non-admin cannot list users."""
    rv = client.get(
        "/api/admin/users",
        headers={"X-Admin-User": "nonadmin"},
    )
    assert rv.status_code == 401


def test_admin_reset_user_scores(client: FlaskClient, cleanup_user: str):
    """Test resetting a specific user's high scores."""
    username = cleanup_user

    # Register and submit score
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/score", json={"username": username, "score": 300})

    # Reset scores
    rv = client.post(
        f"/api/admin/reset-user/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200
    assert rv.get_json().get("ok") is True

    # Verify score is reset
    rv = client.get(f"/api/score/{username}")
    assert rv.status_code == 200
    assert rv.get_json().get("highScore") == 0


def test_admin_reset_user_sessions(client: FlaskClient, cleanup_user: str):
    """Test deleting all sessions for a specific user."""
    username = cleanup_user

    # Register and submit scores (creates sessions)
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/score", json={"username": username, "score": 100})
    client.post("/api/score", json={"username": username, "score": 200})

    # Reset sessions
    rv = client.post(
        f"/api/admin/reset-sessions/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Verify sessions are cleared
    rv = client.get(f"/api/user/sessions/{username}")
    assert rv.get_json() == []


def test_admin_delete_user(client: FlaskClient, cleanup_user: str):
    """Test deleting a user entirely."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Delete user
    rv = client.delete(
        f"/api/admin/delete-user/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Verify user is deleted (login should fail)
    rv = client.post(
        "/api/login", json={"username": username, "password": "secret"}
    )
    assert rv.get_json().get("userExist") is False


def test_admin_delete_xp_history(client: FlaskClient, cleanup_user: str):
    """Test deleting XP history for a user."""
    username = cleanup_user

    # Register and add XP
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    client.post("/api/user/xp", json={"username": username, "xp": 50})
    client.post("/api/user/xp", json={"username": username, "xp": 30})

    # Delete XP history
    rv = client.post(
        f"/api/admin/delete-xp-history/{username}",
        headers={"X-Admin-User": "admin"},
    )
    assert rv.status_code == 200

    # Verify history is cleared
    rv = client.get(f"/api/user/xp/history/{username}")
    assert rv.get_json() == []


def test_admin_unauthorized_operations(client: FlaskClient, cleanup_user: str):
    """Test that unauthorized users cannot access admin endpoints."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
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
        ), f"{method} {endpoint} should require admin"
