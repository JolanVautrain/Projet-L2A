"""Tests for authentication endpoints (register, login)."""

from typing import Any

from flask.testing import FlaskClient


def test_register_new_user(client: FlaskClient, cleanup_user: str):
    """Test registering a new user."""
    username = cleanup_user
    rv = client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("success") is True


def test_register_duplicate_user(
    client: FlaskClient, db_conn: Any, cleanup_user: str
):
    """Test registering a user that already exists."""
    username = cleanup_user

    # Register once
    rv = client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )
    assert rv.status_code == 200
    assert rv.get_json().get("success") is True

    # Try registering again
    rv = client.post(
        "/api/register", json={"username": username, "password": "othersecret"}
    )
    assert rv.status_code == 409
    assert rv.get_json().get("success") is False


def test_register_missing_fields(client: FlaskClient):
    """Test registering with missing fields."""
    rv = client.post("/api/register", json={"username": "test"})
    assert rv.status_code == 400


def test_login_correct_password(client: FlaskClient, cleanup_user: str):
    """Test login with correct password."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Login with correct password
    rv = client.post(
        "/api/login", json={"username": username, "password": "secret"}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is True


def test_login_incorrect_password(client: FlaskClient, cleanup_user: str):
    """Test login with incorrect password."""
    username = cleanup_user

    # Register user
    client.post(
        "/api/register", json={"username": username, "password": "secret"}
    )

    # Login with wrong password
    rv = client.post(
        "/api/login", json={"username": username, "password": "wrongpassword"}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is True
    assert data.get("passwordIsCorrect") is False


def test_login_nonexistent_user(client: FlaskClient):
    """Test login for a user that doesn't exist."""
    rv = client.post(
        "/api/login", json={"username": "nonexistent", "password": "anypass"}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data.get("userExist") is False
    assert data.get("passwordIsCorrect") is False


def test_login_missing_fields(client: FlaskClient):
    """Test login with missing fields."""
    rv = client.post("/api/login", json={"username": "test"})
    assert rv.status_code == 400
