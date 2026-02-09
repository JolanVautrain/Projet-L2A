"""Configuration pytest et fixtures partagés pour les tests backend."""

import os
import uuid
from typing import Any, Generator

import psycopg2
import pytest
from flask import Flask
from flask.testing import FlaskClient

from backend.app import app as flask_app

# Mot de passe de test centralisé (généré si non fourni via l'environnement)
TEST_PASSWORD = os.environ.get("TEST_PASSWORD") or f"pw_{uuid.uuid4().hex[:8]}"

# Force using the project's Postgres on localhost:5432 (unless overridden)
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
    """Fournit l'application Flask pour pytest-flask."""
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app: Flask) -> Generator[FlaskClient, None, None]:
    """Fournit un client de test Flask."""
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture(name="db_conn")
def _db_conn() -> Generator[Any, None, None]:  # type: ignore
    """Fournit une connexion à la base de données.

    La fonction utilisable par pytest s'appelle toujours `db_conn` mais la
    fonction définie est `_db_conn` pour éviter l'ombrement de nom au niveau
    du module (Pylint W0621). Utilise try/finally pour garantir la fermeture.
    """
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture(name="username")
def _username():  # type: ignore[reportUnusedFunction]
    """Génère un nom d'utilisateur de test unique."""
    return f"ci_test_user_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def cleanup_user(db_conn: Any, username: str) -> Generator[str, None, None]:
    """Helper de nettoyage : supprime l'utilisateur de test avant et après le
    test."""
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()

    yield username

    # Nettoyage après le test
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()
