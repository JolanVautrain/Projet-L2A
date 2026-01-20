"""Tests for database connectivity and schema."""

from psycopg2.extensions import connection as _PGConnection


def test_db_connection(db_conn: _PGConnection):
    """Test that we can connect to PostgreSQL using the `db_conn` fixture."""
    conn = db_conn
    cur = conn.cursor()
    cur.execute("SELECT 1")
    row = cur.fetchone()
    assert row is not None and row[0] == 1
    cur.close()


def test_users_table_exists(db_conn: _PGConnection):
    """Test that the users table exists and is accessible."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    assert cur.fetchone() is not None
    cur.close()


def test_highscores_table_exists(db_conn: _PGConnection):
    """Test that the highscores table exists."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM highscores")
    assert cur.fetchone() is not None
    cur.close()


def test_user_profiles_table_exists(db_conn: _PGConnection):
    """Test that the user_profiles table exists."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM user_profiles")
    assert cur.fetchone() is not None
    cur.close()


def test_game_sessions_table_exists(db_conn: _PGConnection):
    """Test that the game_sessions table exists."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM game_sessions")
    assert cur.fetchone() is not None
    cur.close()


def test_user_xp_history_table_exists(db_conn: _PGConnection):
    """Test that the user_xp_history table exists."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM user_xp_history")
    assert cur.fetchone() is not None
    cur.close()
