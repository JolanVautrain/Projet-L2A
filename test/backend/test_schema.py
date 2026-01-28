"""Tests de connectivité à la base de données et du schéma."""

from psycopg2.extensions import connection as _PGConnection


def test_db_connection(db_conn: _PGConnection):
    """Vérifie la connexion à PostgreSQL en utilisant le fixture `db_conn`."""
    conn = db_conn
    cur = conn.cursor()
    cur.execute("SELECT 1")
    row = cur.fetchone()
    assert row is not None and row[0] == 1
    cur.close()


def test_users_table_columns_and_defaults(db_conn: _PGConnection):
    """Vérifie les colonnes et valeurs par défaut de la table `users`."""
    cur = db_conn.cursor()
    # vérifier colonnes username, password, language
    cur.execute(
        "SELECT column_name, column_default, is_nullable FROM "
        "information_schema.columns WHERE table_name='users'"
    )
    cols = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    assert "username" in cols
    assert "password" in cols
    assert "language" in cols
    # language a une valeur par défaut 'fr'
    assert cols["language"][0] is not None
    cur.close()


def test_highscores_fk_and_defaults(db_conn: _PGConnection):
    """Vérifie FK depuis `highscores` vers `users` et valeurs par défaut."""
    cur = db_conn.cursor()
    # vérifier contrainte FK existe
    cur.execute(
        "SELECT tc.constraint_name FROM information_schema.table_constraints "
        "tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name"
        " = kcu.constraint_name WHERE tc.table_name = 'highscores' AND "
        "tc.constraint_type='FOREIGN KEY'"
    )
    fks = [r[0] for r in cur.fetchall()]
    assert len(fks) >= 1

    # vérifier colonnes par défaut (stage, timer)
    cur.execute(
        "SELECT column_name, column_default FROM information_schema.columns "
        "WHERE table_name='highscores'"
    )
    cols = {r[0]: r[1] for r in cur.fetchall()}
    assert cols.get("stage") is not None
    assert cols.get("timer") is not None
    cur.close()


def test_cascade_delete_on_users(db_conn: _PGConnection):
    """Vérifie que la suppression d'un user cascade sur highscores et
    sessions."""
    cur = db_conn.cursor()
    username = "cascade_test_user"
    # créer user
    cur.execute(
        "INSERT INTO users (username, password) VALUES (%s, %s)",
        (username, "pwd"),
    )
    # insérer en highscores et game_sessions
    cur.execute(
        "INSERT INTO highscores (username, high_score) VALUES (%s, %s)",
        (username, 10),
    )
    cur.execute(
        "INSERT INTO game_sessions (username, score) VALUES (%s, %s)",
        (username, 5),
    )
    db_conn.commit()

    # supprimer user
    cur.execute("DELETE FROM users WHERE username = %s", (username,))
    db_conn.commit()

    # vérifier qu'il n'y a plus d'entrées liées
    cur.execute(
        "SELECT COUNT(*) FROM highscores WHERE username = %s", (username,)
    )
    row = cur.fetchone()
    assert row is not None and row[0] == 0
    cur.execute(
        "SELECT COUNT(*) FROM game_sessions WHERE username = %s", (username,)
    )
    row = cur.fetchone()
    assert row is not None and row[0] == 0
    cur.close()


def test_users_table_exists(db_conn: _PGConnection):
    """Vérifie que la table `users` existe et est accessible."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    assert cur.fetchone() is not None
    cur.close()


def test_highscores_table_exists(db_conn: _PGConnection):
    """Vérifie que la table `highscores` existe."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM highscores")
    assert cur.fetchone() is not None
    cur.close()


def test_user_profiles_table_exists(db_conn: _PGConnection):
    """Vérifie que la table `user_profiles` existe."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM user_profiles")
    assert cur.fetchone() is not None
    cur.close()


def test_game_sessions_table_exists(db_conn: _PGConnection):
    """Vérifie que la table `game_sessions` existe."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM game_sessions")
    assert cur.fetchone() is not None
    cur.close()


def test_user_xp_history_table_exists(db_conn: _PGConnection):
    """Vérifie que la table `user_xp_history` existe."""
    cur = db_conn.cursor()
    cur.execute("SELECT COUNT(*) FROM user_xp_history")
    assert cur.fetchone() is not None
    cur.close()
