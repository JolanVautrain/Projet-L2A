import os
import uuid

import psycopg2
from flask.testing import FlaskClient

from backend.app import app as flask_app

# Force using the project's Postgres on localhost:5432 (unless overridden)
os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5432")


def get_conn():
    return psycopg2.connect(
        database=os.environ.get("POSTGRES_DB", "ma_db"),
        user=os.environ.get("POSTGRES_USER", "mon_user"),
        password=os.environ.get("POSTGRES_PASSWORD", "mon_pass"),
        host=os.environ.get("POSTGRES_HOST", "127.0.0.1"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
    )


def test_db_connection():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT 1")
    row = cur.fetchone()
    assert row is not None and row[0] == 1
    cur.close()
    conn.close()


def test_users_table_exists():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    assert cur.fetchone() is not None
    cur.close()
    conn.close()


def test_register_and_login():
    client: FlaskClient = flask_app.test_client()
    username = f"ci_test_user_{uuid.uuid4().hex[:8]}"

    # ensure no pre-existing user with same name
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    conn.commit()
    cur.close()
    conn.close()

    try:
        # register
        rv = client.post(
            "/api/register", json={"username": username, "password": "secret"}
        )
        assert rv.status_code == 200
        assert rv.get_json().get("success") is True

        # login
        rv = client.post(
            "/api/login", json={"username": username, "password": "secret"}
        )
        assert rv.status_code == 200
        assert rv.get_json().get("passwordIsCorrect") is True
    finally:
        # cleanup created user to avoid touching existing data long-term
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE username = %s", (username,))
        conn.commit()
        cur.close()
        conn.close()
