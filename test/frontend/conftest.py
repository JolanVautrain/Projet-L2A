"""Configuration pytest et fixtures partagés pour les tests frontend (scénarios end-to-end via API)."""

import os
import uuid
from typing import Any, Generator

import psycopg2
import pytest
from flask import Flask
from flask.testing import FlaskClient

from backend.app import app as flask_app

# Mot de passe de test centralisé
TEST_PASSWORD = os.environ.get("TEST_PASSWORD") or f"pw_{uuid.uuid4().hex[:8]}"

os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5432")


def get_db_connection():
    """Créer et retourner une connexion PostgreSQL."""
    return psycopg2.connect(
        database=os.environ.get("POSTGRES_DB", "ma_db"),
        user=os.environ.get("POSTGRES_USER", "mon_user"),
        password=os.environ.get("POSTGRES_PASSWORD", "mon_pass"),
        host=os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


@pytest.fixture
def app() -> Flask:
    """Fournit l'application Flask pour les tests frontend."""
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app: Flask) -> Generator[FlaskClient, None, None]:
    """Fournit un client de test Flask."""
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture(name="db_conn")
def _db_conn() -> Generator[Any, None, None]:
    """Fournit une connexion à la base de données."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture(name="username")
def _username():
    """Génère un nom d'utilisateur de test unique."""
    return f"fe_test_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def cleanup_user(db_conn: Any, username: str) -> Generator[str, None, None]:
    """Supprime l'utilisateur de test avant et après le test."""
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()
    yield username
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()


@pytest.fixture
def registered_user(client: FlaskClient, cleanup_user: str):
    """Inscrit un utilisateur et retourne (username, password)."""
    rv = client.post(
        "/api/register",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    assert rv.status_code == 200
    return cleanup_user, TEST_PASSWORD


@pytest.fixture
def logged_in_user(client: FlaskClient, registered_user):
    """Inscrit, connecte un utilisateur et retourne (username, password, session_token)."""
    username, password = registered_user
    rv = client.post(
        "/api/login", json={"username": username, "password": password}
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["passwordIsCorrect"] is True
    return username, password, data["session_token"]
