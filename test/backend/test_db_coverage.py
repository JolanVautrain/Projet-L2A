"""Tests complémentaires pour maximiser la couverture de backend/core/db.py.

Cible les fonctions initialize_database(), check_and_recreate_schema(),
connect_to_database() (branche erreur), et load_default_users() (branches erreur).
"""

import json
import os
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import MagicMock, mock_open, patch

import psycopg2
import pytest
from flask import Flask
from flask.testing import FlaskClient

from backend.app import app as flask_app
from backend.core import db


@pytest.fixture
def app() -> Flask:
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app: Flask):
    with app.test_client() as c:
        yield c


# ── initialize_database ──────────────────────────────────────


def test_initialize_database_idempotent():
    """initialize_database() avec conn/cur existants est idempotente."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        # Appel idempotent – les tables existent déjà dans le conteneur de test
        db.initialize_database(init_conn=conn, init_cur=cur)
    finally:
        try:
            cur.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass


def test_initialize_database_without_args():
    """initialize_database() sans arguments crée sa propre connexion."""
    # Cela utilise connect_to_database() en interne
    db.initialize_database()


def test_initialize_database_with_empty_table():
    """initialize_database() insère les utilisateurs par défaut si la table est vide."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        # Sauvegarder les données existantes
        cur.execute("SELECT username FROM users")
        existing = [r[0] for r in cur.fetchall()]

        # Vider temporairement la table users (CASCADE supprime les dépendances)
        cur.execute("DELETE FROM user_sessions")
        cur.execute("DELETE FROM recovery_codes")
        cur.execute("DELETE FROM issue_reports")
        cur.execute("DELETE FROM user_xp_history")
        cur.execute("DELETE FROM game_sessions")
        cur.execute("DELETE FROM highscores")
        cur.execute("DELETE FROM user_profiles")
        cur.execute("DELETE FROM user_inputs")
        cur.execute("DELETE FROM users")
        conn.commit()

        # Vérifier que la table est vide
        cur.execute("SELECT COUNT(*) FROM users")
        assert cur.fetchone()[0] == 0

        # Appeler initialize_database avec la connexion existante
        # Il devrait insérer les utilisateurs par défaut
        conn2 = db.connect_to_database()
        cur2 = conn2.cursor()
        db.initialize_database(init_conn=conn2, init_cur=cur2)

        # Vérifier que les utilisateurs par défaut ont été insérés
        conn3 = db.connect_to_database()
        cur3 = conn3.cursor()
        cur3.execute("SELECT COUNT(*) FROM users")
        count = cur3.fetchone()[0]
        assert (
            count > 0
        ), "Les utilisateurs par défaut auraient dû être insérés"
        cur3.close()
        conn3.close()
    finally:
        cur.close()
        conn.close()


def test_initialize_database_error_handling():
    """initialize_database() gère les erreurs psycopg2."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_cur.execute.side_effect = psycopg2.Error("test error")

    # Ne doit pas lever d'exception – elle est catchée en interne
    db.initialize_database(init_conn=mock_conn, init_cur=mock_cur)


def test_initialize_database_cursor_close_error():
    """initialize_database() gère les erreurs de fermeture du curseur."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_cur.execute.side_effect = psycopg2.Error("test")
    mock_cur.close.side_effect = psycopg2.Error("close error")
    mock_conn.close.side_effect = psycopg2.Error("close conn error")

    # Ne doit pas lever d'exception
    db.initialize_database(init_conn=mock_conn, init_cur=mock_cur)


# ── check_and_recreate_schema ────────────────────────────────


def test_check_and_recreate_schema_all_present():
    """check_and_recreate_schema() quand toutes les tables existent."""
    db.check_and_recreate_schema()


def test_check_and_recreate_schema_missing_table():
    """check_and_recreate_schema() détecte les tables manquantes et recrée."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        # Sauvegarder et supprimer issue_reports pour simuler une table manquante
        cur.execute("DROP TABLE IF EXISTS issue_reports CASCADE")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    # check_and_recreate_schema devrait détecter la table manquante et recréer
    db.check_and_recreate_schema()

    # Vérifier que la table a été recréée
    conn2 = db.connect_to_database()
    cur2 = conn2.cursor()
    try:
        cur2.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name='issue_reports'"
        )
        assert (
            cur2.fetchone() is not None
        ), "issue_reports devrait être recréée"
    finally:
        cur2.close()
        conn2.close()


def test_check_and_recreate_schema_drop_mode():
    """check_and_recreate_schema() en mode drop recrée tout le schéma."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        cur.execute("DROP TABLE IF EXISTS issue_reports CASCADE")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    old_val = os.environ.get("RECREATE_DB_ON_MISSING", "")
    os.environ["RECREATE_DB_ON_MISSING"] = "drop"
    try:
        db.check_and_recreate_schema()
    finally:
        if old_val:
            os.environ["RECREATE_DB_ON_MISSING"] = old_val
        else:
            os.environ.pop("RECREATE_DB_ON_MISSING", None)

    # Vérifier que les tables ont été recréées
    conn3 = db.connect_to_database()
    cur3 = conn3.cursor()
    try:
        cur3.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_name='users'"
        )
        assert cur3.fetchone() is not None, "users devrait être recréée"
    finally:
        cur3.close()
        conn3.close()


def test_check_and_recreate_schema_column_check():
    """check_and_recreate_schema() vérifie les colonnes (is_admin, banned_until, etc.)."""
    # Juste appeler la fonction — les colonnes existent déjà
    # Cela couvre le chemin où cur.fetchone() retourne un résultat (colonne existe)
    db.check_and_recreate_schema()


def test_check_and_recreate_schema_add_missing_column():
    """check_and_recreate_schema() ajoute une colonne manquante."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        # Supprimer la colonne ban_reason pour tester l'ajout
        cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS ban_reason")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    db.check_and_recreate_schema()

    # Vérifier que la colonne a été re-ajoutée
    conn2 = db.connect_to_database()
    cur2 = conn2.cursor()
    try:
        cur2.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='ban_reason'"
        )
        assert cur2.fetchone() is not None, "ban_reason devrait être ajoutée"
    finally:
        cur2.close()
        conn2.close()


def test_check_and_recreate_schema_add_is_admin_column():
    """check_and_recreate_schema() ajoute is_admin si manquant."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_admin")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    db.check_and_recreate_schema()

    conn2 = db.connect_to_database()
    cur2 = conn2.cursor()
    try:
        cur2.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='is_admin'"
        )
        assert cur2.fetchone() is not None
    finally:
        cur2.close()
        conn2.close()


def test_check_and_recreate_schema_add_banned_until_column():
    """check_and_recreate_schema() ajoute banned_until si manquant."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS banned_until")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    db.check_and_recreate_schema()

    conn2 = db.connect_to_database()
    cur2 = conn2.cursor()
    try:
        cur2.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='banned_until'"
        )
        assert cur2.fetchone() is not None
    finally:
        cur2.close()
        conn2.close()


def test_check_and_recreate_schema_add_state_columns():
    """check_and_recreate_schema() ajoute les colonnes state si manquantes."""
    conn = db.connect_to_database()
    cur = conn.cursor()
    try:
        cur.execute("ALTER TABLE highscores DROP COLUMN IF EXISTS state")
        cur.execute("ALTER TABLE game_sessions DROP COLUMN IF EXISTS state")
        conn.commit()
    finally:
        cur.close()
        conn.close()

    db.check_and_recreate_schema()

    conn2 = db.connect_to_database()
    cur2 = conn2.cursor()
    try:
        cur2.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='highscores' AND column_name='state'"
        )
        assert cur2.fetchone() is not None
        cur2.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='game_sessions' AND column_name='state'"
        )
        assert cur2.fetchone() is not None
    finally:
        cur2.close()
        conn2.close()


def test_check_and_recreate_schema_db_error():
    """check_and_recreate_schema() gère les erreurs psycopg2.Error."""
    with patch.object(db, "get_db_connection") as mock_conn:
        mock_conn.side_effect = psycopg2.Error("connection failed")
        # Ne doit pas lever d'exception
        db.check_and_recreate_schema()


def test_check_and_recreate_schema_column_error():
    """check_and_recreate_schema() gère les erreurs lors du check des colonnes."""
    call_count = [0]
    original = db.get_db_connection

    @contextmanager
    def mock_conn():
        call_count[0] += 1
        if call_count[0] == 2:
            raise psycopg2.Error("column check failed")
        with original() as conn:
            yield conn

    with patch.object(db, "get_db_connection", mock_conn):
        # Premier appel réussit (check tables), second échoue (check columns)
        db.check_and_recreate_schema()


# ── connect_to_database ──────────────────────────────────────


def test_connect_to_database_success():
    """connect_to_database() retourne une connexion valide."""
    conn = db.connect_to_database()
    assert conn is not None
    conn.close()


def test_connect_to_database_failure():
    """connect_to_database() raise OperationalError si la connexion échoue."""
    old_host = os.environ.get("POSTGRES_HOST", "127.0.0.1")
    old_port = os.environ.get("POSTGRES_PORT", "5432")
    os.environ["POSTGRES_HOST"] = "nonexistent_host_12345"
    os.environ["POSTGRES_PORT"] = "9999"
    try:
        with pytest.raises(psycopg2.OperationalError):
            db.connect_to_database()
    finally:
        os.environ["POSTGRES_HOST"] = old_host
        os.environ["POSTGRES_PORT"] = old_port


# ── load_default_users ───────────────────────────────────────


def test_load_default_users_success():
    """load_default_users() charge les utilisateurs depuis db_init.json."""
    users = db.load_default_users()
    assert len(users) > 0
    # Chaque élément est (username, hashed_pw, language)
    assert len(users[0]) == 3


def test_load_default_users_file_not_found():
    """load_default_users() retourne [] si le fichier n'existe pas."""
    with patch.object(Path, "exists", return_value=False):
        result = db.load_default_users()
        assert result == []


def test_load_default_users_bad_json():
    """load_default_users() retourne [] si le JSON est invalide."""
    with patch.object(Path, "exists", return_value=True):
        with patch("builtins.open", mock_open(read_data="not json {")):
            result = db.load_default_users()
            assert result == []


def test_load_default_users_missing_keys():
    """load_default_users() retourne [] si les clés sont absentes."""
    bad_data = json.dumps({"users": [{"bad_key": "value"}]})
    with patch.object(Path, "exists", return_value=True):
        with patch("builtins.open", mock_open(read_data=bad_data)):
            result = db.load_default_users()
            assert result == []


# ── get_db_connection / get_db_cursor ─────────────────────────


def test_get_db_connection_context_manager():
    """get_db_connection() ferme la connexion même en cas d'erreur."""
    with pytest.raises(ValueError):
        with db.get_db_connection() as conn:
            assert conn is not None
            raise ValueError("test error")


def test_get_db_cursor_context_manager():
    """get_db_cursor() ferme le curseur même en cas d'erreur."""
    conn = db.connect_to_database()
    try:
        with pytest.raises(ValueError):
            with db.get_db_cursor(conn) as cur:
                assert cur is not None
                raise ValueError("test error")
    finally:
        conn.close()


# ── query helpers ─────────────────────────────────────────────


def test_query_fetchall_empty():
    """query_fetchall retourne une liste vide si aucun résultat."""
    result = db.query_fetchall(
        "SELECT username FROM users WHERE username = %s",
        ("nonexistent_user_xyz",),
    )
    assert result == []


def test_query_fetchone_none():
    """query_fetchone retourne None si aucun résultat."""
    result = db.query_fetchone(
        "SELECT username FROM users WHERE username = %s",
        ("nonexistent_user_xyz",),
    )
    assert result is None


def test_exec_commit_noop():
    """exec_commit() peut exécuter une requête sans résultat."""
    # UPDATE qui n'affecte aucune ligne
    db.exec_commit(
        "UPDATE users SET language = 'fr' WHERE username = %s",
        ("nonexistent_user_xyz",),
    )
