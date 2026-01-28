"""Database helpers and schema management."""

import json
import logging
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, List

import psycopg2  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)


@contextmanager
def get_db_connection() -> Iterator[Any]:
    conn = None
    try:
        conn = connect_to_database()
        yield conn
    finally:
        if conn:
            conn.close()


@contextmanager
def get_db_cursor(conn: Any) -> Iterator[Any]:
    cur = conn.cursor()
    try:
        yield cur
    finally:
        cur.close()


def query_fetchall(
    sql: str, params: tuple[Any, ...] = ()
) -> List[tuple[Any, ...]]:
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def query_fetchone(
    sql: str, params: tuple[Any, ...] = ()
) -> tuple[Any, ...] | None:
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def exec_commit(sql: str, params: tuple[Any, ...] = ()) -> None:
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(sql, params)
        conn.commit()


def load_default_users() -> List[tuple[str, str, str]]:
    base_dir = Path(__file__).resolve().parent.parent
    db_init_path = base_dir / "db_init.json"

    if db_init_path.exists():
        try:
            with open(db_init_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                users = data.get("users", [])
                return [
                    (
                        u["username"],
                        generate_password_hash(u["password"]),
                        u.get("language", "fr"),
                    )
                    for u in users
                ]
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning("Failed to load users from db_init.json: %s", e)

    return []


def connect_to_database() -> Any:
    try:
        db_password = os.environ.get("POSTGRES_PASSWORD", "password_change")
        db_host = os.environ.get("POSTGRES_HOST", "localhost")
        db_port = os.environ.get("POSTGRES_PORT", "5432")
        db_name = os.environ.get("POSTGRES_DB", "ma_db")
        db_user = os.environ.get("POSTGRES_USER", "mon_user")
        return psycopg2.connect(
            database=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
        )
    except OperationalError:
        logger.exception("Database connection failed")
        raise


def initialize_database(init_conn=None,init_cur=None) -> None:
    try:
        if not init_conn or not init_cur:
            init_conn = connect_to_database()
            init_cur = init_conn.cursor()
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS users (
            username varchar(100) PRIMARY KEY,
            password varchar(1000) NOT NULL,
            language varchar(10) DEFAULT 'fr'
            );"""
        )
        init_cur.execute("SELECT COUNT(*) FROM users")
        try:
            users_count = int(init_cur.fetchone()[0] or 0)
        except (TypeError, ValueError, IndexError) as e:
            logger.warning("Failed to read users count: %s", e)
            users_count = 0
        if users_count == 0:
            default_users = load_default_users()
            for init_username, init_password, init_language in default_users:
                init_cur.execute(
                    "INSERT INTO users (username, password, language) "
                    "VALUES (%s, %s, %s)",
                    (init_username, init_password, init_language),
                )
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS highscores (
            username varchar(100) PRIMARY KEY,
            high_score integer NOT NULL,
            stage integer DEFAULT 0,
            timer integer DEFAULT 0,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS user_profiles (
            username varchar(100) PRIMARY KEY,
            xp integer DEFAULT 0,
            level integer DEFAULT 1,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS user_xp_history (
            id SERIAL PRIMARY KEY,
            username varchar(100) NOT NULL,
            xp integer DEFAULT 0,
            level integer DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS game_sessions (
            id SERIAL PRIMARY KEY,
            username varchar(100) NOT NULL,
            score integer NOT NULL,
            stage integer DEFAULT 0,
            timer integer DEFAULT 0,
            playedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS user_inputs (
            username varchar(100) NOT NULL,
            input varchar(100) NOT NULL,
            time TIMESTAMP DEFAULT CURRENT_TIMESTAMP PRIMARY KEY,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_conn.commit()
    except psycopg2.Error as err:
        logger.exception("Failed to initialize database: %s", err)
    finally:
        if init_cur:
            try:
                init_cur.close()
            except (psycopg2.Error, AttributeError, OSError) as e:
                logger.debug("Failed to close init cursor: %s", e)
        if init_conn:
            try:
                init_conn.close()
            except (psycopg2.Error, AttributeError, OSError) as e:
                logger.debug("Failed to close init connection: %s", e)


def check_and_recreate_schema() -> None:
    required_tables = [
        "users",
        "highscores",
        "user_profiles",
        "user_xp_history",
        "game_sessions",
        "user_inputs"
    ]
    try:
        with get_db_connection() as conn, get_db_cursor(conn) as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables WHERE "
                "table_schema='public' AND table_name = ANY(%s)",
                (required_tables,),
            )
            present = {r[0] for r in cur.fetchall()}

        missing = [t for t in required_tables if t not in present]
        if not missing:
            logger.info(
                "All required tables present: %s", ", ".join(required_tables)
            )
            return

        logger.warning("Missing tables detected: %s", ", ".join(missing))
        mode = os.environ.get("RECREATE_DB_ON_MISSING", "").lower()
        if mode == "drop":
            logger.info(
                "Dropping known tables and recreating schema "
                "(RECREATE_DB_ON_MISSING=drop)"
            )
            with get_db_connection() as conn, get_db_cursor(conn) as cur:
                cur.execute("DROP TABLE IF EXISTS user_xp_history CASCADE")
                cur.execute("DROP TABLE IF EXISTS game_sessions CASCADE")
                cur.execute("DROP TABLE IF EXISTS highscores CASCADE")
                cur.execute("DROP TABLE IF EXISTS user_profiles CASCADE")
                cur.execute("DROP TABLE IF EXISTS users CASCADE")
                cur.execute("DROP TABLE IF EXISTS user_inputs CASCADE")
                conn.commit()
            initialize_database()
            logger.info("Schema recreated (drop -> init)")
        else:
            logger.info("Creating missing tables using safe initialization")
            initialize_database()
            logger.info("Missing tables created")
    except psycopg2.Error as err:
        logger.exception("Failed while checking or recreating schema: %s", err)
