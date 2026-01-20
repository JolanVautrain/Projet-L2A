"""Pytest configuration and shared fixtures for backend tests."""

import os
import uuid
from typing import Any, Generator

import psycopg2
import pytest
from flask.testing import FlaskClient

from backend.app import app as flask_app

# Force using the project's Postgres on localhost:5432 (unless overridden)
os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5432")


def get_db_connection():
    """Create and return a PostgreSQL connection."""
    return psycopg2.connect(
        database=os.environ.get("POSTGRES_DB", "ma_db"),
        user=os.environ.get("POSTGRES_USER", "mon_user"),
        password=os.environ.get("POSTGRES_PASSWORD", "mon_pass"),
        host=os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


@pytest.fixture
def client() -> Generator[FlaskClient, None, None]:
    """Provide a Flask test client."""
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as test_client:
        yield test_client


@pytest.fixture
def db_conn() -> Generator[Any, None, None]:
    """Provide a database connection."""
    conn = get_db_connection()
    yield conn
    conn.close()


@pytest.fixture
def test_user_username():
    """Generate a unique test username."""
    return f"ci_test_user_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def cleanup_user(
    db_conn: Any, test_user_username: str
) -> Generator[str, None, None]:
    """Cleanup helper: delete test user before and after test."""
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (test_user_username,))
    db_conn.commit()
    cur.close()

    yield test_user_username

    # Cleanup after test
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (test_user_username,))
    db_conn.commit()
    cur.close()
