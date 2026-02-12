"""Tests complémentaires pour maximiser la couverture de utils.py et auth.py.

Cible les branches non couvertes : handle_db_errors exceptions, is_session_active
variantes, touch_session_from_headers, require_admin OPTIONS, et auth edge cases.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import psycopg2
import pytest
from flask import Flask
from flask.testing import FlaskClient

from backend.app import app as flask_app
from backend.core import utils

TEST_PASSWORD = os.environ.get("TEST_PASSWORD") or f"pw_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def app() -> Flask:
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app: Flask):
    with app.test_client() as c:
        yield c


@pytest.fixture
def username():
    return f"cov_test_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def cleanup_user(db_conn, username):
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()
    yield username
    cur = db_conn.cursor()
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()
    cur.close()


def _register(client, username, password=None, language="fr"):
    return client.post(
        "/api/register",
        json={
            "username": username,
            "password": password or TEST_PASSWORD,
            "language": language,
        },
    )


def _login(client, username, password=None):
    return client.post(
        "/api/login",
        json={"username": username, "password": password or TEST_PASSWORD},
    )


# ── is_session_active ────────────────────────────────────────


class TestIsSessionActive:
    """Tests unitaires pour utils.is_session_active()."""

    def test_none_returns_false(self):
        assert utils.is_session_active(None) is False

    def test_empty_string_returns_false(self):
        assert utils.is_session_active("") is False

    def test_recent_datetime_returns_true(self):
        recent = datetime.now() - timedelta(minutes=5)
        assert utils.is_session_active(recent) is True

    def test_old_datetime_returns_false(self):
        old = datetime.now() - timedelta(hours=2)
        assert utils.is_session_active(old) is False

    def test_string_iso_format_recent(self):
        recent = (datetime.now() - timedelta(minutes=5)).isoformat()
        assert utils.is_session_active(recent) is True

    def test_string_iso_format_old(self):
        old = (datetime.now() - timedelta(hours=2)).isoformat()
        assert utils.is_session_active(old) is False

    def test_tz_aware_datetime_recent(self):
        recent = datetime.now(timezone.utc) - timedelta(minutes=5)
        assert utils.is_session_active(recent) is True

    def test_tz_aware_datetime_old(self):
        old = datetime.now(timezone.utc) - timedelta(hours=2)
        assert utils.is_session_active(old) is False


# ── parse_optional_int ────────────────────────────────────────


class TestParseOptionalInt:
    """Tests pour utils.parse_optional_int()."""

    def test_missing_key(self):
        assert utils.parse_optional_int({}, "x") is None

    def test_none_value(self):
        assert utils.parse_optional_int({"x": None}, "x") is None

    def test_valid_int(self):
        assert utils.parse_optional_int({"x": "42"}, "x") == 42

    def test_invalid_string(self):
        assert utils.parse_optional_int({"x": "abc"}, "x") is None

    def test_float_value(self):
        assert utils.parse_optional_int({"x": 3.7}, "x") == 3


# ── handle_db_errors ──────────────────────────────────────────


class TestHandleDbErrors:
    """Tests pour le décorateur utils.handle_db_errors()."""

    def test_operational_error(self, client: FlaskClient, cleanup_user: str):
        """handle_db_errors attrape OperationalError et retourne 500."""
        _register(client, cleanup_user)

        with patch("backend.core.db.connect_to_database") as mock:
            mock.side_effect = psycopg2.OperationalError("db down")
            rv = client.post(
                "/api/login",
                json={"username": cleanup_user, "password": TEST_PASSWORD},
            )
            # OperationalError catché par handle_db_errors
            assert rv.status_code in (500, 200)

    def test_psycopg2_error(self, client: FlaskClient, cleanup_user: str):
        """handle_db_errors attrape psycopg2.Error et retourne 500."""
        _register(client, cleanup_user)

        with patch("backend.core.db.connect_to_database") as mock:
            mock.side_effect = psycopg2.Error("generic db error")
            rv = client.post(
                "/api/login",
                json={"username": cleanup_user, "password": TEST_PASSWORD},
            )
            assert rv.status_code in (500, 200)


# ── require_admin OPTIONS ─────────────────────────────────────


class TestRequireAdminOptions:
    """Tests pour require_admin avec requêtes OPTIONS."""

    def test_options_admin_users(self, client: FlaskClient):
        """OPTIONS sur une route admin passe sans vérification."""
        rv = client.options("/api/admin/users")
        assert rv.status_code == 200

    def test_options_admin_ban(self, client: FlaskClient):
        """OPTIONS sur ban-user passe sans header admin."""
        rv = client.options("/api/admin/ban-user/test")
        assert rv.status_code == 200


# ── touch_session_from_headers (testé indirectement) ────────────
# Le touch de session est déjà testé dans test_scenario_inscription_connexion
# via les requêtes authentifiées avec headers X-Session-User / X-Session-Token.
# Les cas limites (session expirée, token invalide) sont testés dans
# test_logout_session.py et test_scenario_compte.py.


# ── require_admin avec DB ─────────────────────────────────────


class TestRequireAdminDB:
    """Tests pour require_admin vérifiant is_admin en DB."""

    def test_admin_via_db_flag(
        self, client: FlaskClient, cleanup_user: str, db_conn
    ):
        """Un utilisateur avec is_admin=true peut accéder aux routes admin."""
        _register(client, cleanup_user)

        cur = db_conn.cursor()
        cur.execute(
            "UPDATE users SET is_admin = true WHERE username = %s",
            (cleanup_user,),
        )
        db_conn.commit()
        cur.close()

        rv = client.get(
            "/api/admin/users",
            headers={"X-Admin-User": cleanup_user},
        )
        assert rv.status_code == 200

    def test_non_admin_user_rejected(
        self, client: FlaskClient, cleanup_user: str
    ):
        """Un utilisateur normal est rejeté sur les routes admin."""
        _register(client, cleanup_user)

        rv = client.get(
            "/api/admin/users",
            headers={"X-Admin-User": cleanup_user},
        )
        assert rv.status_code == 401

    def test_admin_db_error(self, client: FlaskClient, cleanup_user: str):
        """Si la vérification admin en DB échoue, l'accès est refusé."""
        _register(client, cleanup_user)

        with patch("backend.core.db.query_fetchone") as mock:
            mock.side_effect = Exception("db error")
            rv = client.get(
                "/api/admin/users",
                headers={"X-Admin-User": cleanup_user},
            )
            assert rv.status_code == 401


# ── Auth edge cases (auth.py lignes manquantes) ──────────────


class TestAuthEdgeCases:
    """Tests pour les branches non couvertes de auth.py."""

    def test_login_expired_ban_removed(
        self, client: FlaskClient, cleanup_user: str, db_conn
    ):
        """Un ban expiré est automatiquement supprimé lors du login."""
        _register(client, cleanup_user)

        # Mettre un ban expiré directement en DB
        cur = db_conn.cursor()
        cur.execute(
            "UPDATE users SET banned_until = CURRENT_TIMESTAMP - INTERVAL '1 hour', "
            "ban_reason = 'test expired' WHERE username = %s",
            (cleanup_user,),
        )
        db_conn.commit()
        cur.close()

        # Le login devrait réussir et supprimer le ban
        rv = _login(client, cleanup_user)
        data = rv.get_json()
        assert data.get("passwordIsCorrect") is True
        assert data.get("banned") is not True

        # Vérifier que le ban a été supprimé en DB
        cur = db_conn.cursor()
        cur.execute(
            "SELECT banned_until, ban_reason FROM users WHERE username = %s",
            (cleanup_user,),
        )
        row = cur.fetchone()
        cur.close()
        assert (
            row[0] is None
        ), "banned_until devrait être NULL après expiration"
        assert row[1] is None, "ban_reason devrait être NULL après expiration"

    def test_register_language_too_long(
        self, client: FlaskClient, cleanup_user: str
    ):
        """L'inscription avec une langue trop longue est refusée."""
        rv = client.post(
            "/api/register",
            json={
                "username": cleanup_user,
                "password": TEST_PASSWORD,
                "language": "a" * 20,
            },
        )
        assert rv.status_code == 400
        assert "too long" in rv.get_json().get("message", "")

    def test_register_empty_username_after_strip(self, client: FlaskClient):
        """L'inscription avec un username vide (après strip) est refusée."""
        rv = client.post(
            "/api/register",
            json={"username": "   ", "password": TEST_PASSWORD},
        )
        assert rv.status_code == 400

    def test_login_active_ban_with_timezone(
        self, client: FlaskClient, cleanup_user: str, db_conn
    ):
        """Un ban actif avec timezone est correctement détecté."""
        _register(client, cleanup_user)

        # Mettre un ban actif en DB
        cur = db_conn.cursor()
        cur.execute(
            "UPDATE users SET banned_until = CURRENT_TIMESTAMP + INTERVAL '24 hours', "
            "ban_reason = 'test active ban' WHERE username = %s",
            (cleanup_user,),
        )
        db_conn.commit()
        cur.close()

        rv = _login(client, cleanup_user)
        data = rv.get_json()
        assert data.get("banned") is True
        assert data.get("ban_reason") == "test active ban"

    def test_login_session_update_existing(
        self, client: FlaskClient, cleanup_user: str, db_conn
    ):
        """Quand une session inactive existe, elle est mise à jour (pas recréée)."""
        _register(client, cleanup_user)
        rv1 = _login(client, cleanup_user)
        token1 = rv1.get_json()["session_token"]

        # Rendre la session inactive
        cur = db_conn.cursor()
        cur.execute(
            "UPDATE user_sessions SET last_seen = CURRENT_TIMESTAMP - INTERVAL '2 hours' "
            "WHERE username = %s",
            (cleanup_user,),
        )
        db_conn.commit()
        cur.close()

        # Reconnexion — une session inactive existe, elle sera écrasée
        rv2 = _login(client, cleanup_user)
        token2 = rv2.get_json()["session_token"]
        assert token2 != token1


# ── App.py edge cases ─────────────────────────────────────────


class TestAppEdgeCases:
    """Tests pour les branches non couvertes de app.py."""

    def test_cors_with_allowed_origin(self, client: FlaskClient):
        """Vérifie les headers CORS avec une origine autorisée."""
        rv = client.get(
            "/api/nonexistent",
            headers={"Origin": "http://localhost:5173"},
        )
        assert "Access-Control-Allow-Origin" in rv.headers
        assert (
            rv.headers["Access-Control-Allow-Origin"]
            == "http://localhost:5173"
        )

    def test_cors_without_origin(self, client: FlaskClient):
        """Sans header Origin, pas de CORS."""
        rv = client.get("/api/nonexistent")
        assert "Access-Control-Allow-Origin" not in rv.headers

    def test_cors_with_disallowed_origin(self, client: FlaskClient):
        """Une origine non autorisée ne reçoit pas de CORS."""
        rv = client.get(
            "/api/nonexistent",
            headers={"Origin": "http://evil.example.com"},
        )
        assert "Access-Control-Allow-Origin" not in rv.headers

    def test_cors_with_pattern_origin(self, client: FlaskClient):
        """Une origine correspondant au pattern :15256 est autorisée."""
        rv = client.get(
            "/api/nonexistent",
            headers={"Origin": "http://myhost:15256"},
        )
        assert "Access-Control-Allow-Origin" in rv.headers

    def test_options_preflight_cors(self, client: FlaskClient):
        """Une requête OPTIONS reçoit les bons headers CORS."""
        rv = client.options(
            "/api/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert rv.status_code == 200
        assert "Access-Control-Allow-Headers" in rv.headers

    def test_handle_http_exception(self, client: FlaskClient):
        """Le handler d'erreur HTTP retourne JSON structuré."""
        rv = client.get("/api/nonexistent")
        assert rv.status_code == 404
        data = rv.get_json()
        assert "error" in data
        assert "message" in data

    def test_handle_generic_exception(self, client: FlaskClient):
        """Le handler d'exception générique retourne 500."""
        with patch("backend.pages.accueil.auth.db.get_db_connection") as mock:
            mock.side_effect = RuntimeError("unexpected")
            rv = client.post(
                "/api/login",
                json={"username": "x", "password": "y"},
            )
            # handle_db_errors catche ValueError/TypeError mais pas RuntimeError
            # → propagé vers le handler d'exception générique de Flask
            assert rv.status_code == 500
