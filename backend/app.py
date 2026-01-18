"""
Ce fichier contient une application Flask qui fournit une API pour
l'authentification des utilisateurs.

L'application inclut les endpoints suivants :
- /api/login (GET) : Un endpoint de test qui retourne une chaîne de caractères
de salutation simple.
- /api/login (POST) : Valide les identifiants de connexion par rapport à la
table users et retourne des réponses JSON avec des codes d'état HTTP
appropriés.

Dépendances :
- Flask
- psycopg2

Configuration :
- La connexion à la base de données est établie en utilisant des variables
d'environnement. Assurez-vous que la variable d'environnement
POSTGRES_PASSWORD est définie sur le mot de passe souhaité.
"""

import json
import logging
import os
from contextlib import contextmanager
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Iterator, List, TypedDict

import psycopg2  # type: ignore
from flask import Flask, Response, jsonify, request
from flask_cors import CORS  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
# Configure CORS to allow cross-origin requests from frontend
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
            ],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Admin-User"],
            "supports_credentials": True,
        }
    },
)
logging.basicConfig(level=logging.INFO)

BAD_REQUEST = "Bad Request"
DATABASE_ERROR = "Database error"
INTERNAL_SERVER_ERROR = "Internal Server Error"


class Highscore(TypedDict):
    """Représente une entrée dans le high scores, c'est-à-dire
    un high score d'utilisateur."""

    username: str
    highScore: int
    stage: int
    timer: int


class UserSession(TypedDict):
    """Représente une session de jeu d'un utilisateur. Soit une partie
    jouée."""

    id: int
    score: int
    stage: int
    timer: int
    playedAt: str


def make_response(data: Any, status: int = 200) -> Response:
    """Créer une réponse JSON avec le code de statut donné."""
    resp = jsonify(data)
    resp.status_code = status
    return resp


@contextmanager
def get_db_connection() -> Iterator[Any]:
    """Context manager pour gérer automatiquement les connexions DB."""
    conn = None
    try:
        conn = connect_to_database()
        yield conn
    finally:
        if conn:
            conn.close()


@contextmanager
def get_db_cursor(conn: Any) -> Iterator[Any]:
    """Context manager pour gérer automatiquement les curseurs DB."""
    cur = conn.cursor()
    try:
        yield cur
    finally:
        cur.close()


def handle_db_errors(f: Callable[..., Response]) -> Callable[..., Response]:
    """Décorateur pour gérer automatiquement les erreurs de base de données."""

    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        try:
            return f(*args, **kwargs)
        except OperationalError:
            return make_response({"error": DATABASE_ERROR}, 500)
        except (psycopg2.Error, ValueError, TypeError) as err:
            app.logger.exception("Unexpected error in %s: %s", f.__name__, err)
            return make_response({"error": INTERNAL_SERVER_ERROR}, 500)

    return wrapper


def require_admin(f: Callable[..., Response]) -> Callable[..., Response]:
    """Décorateur pour vérifier l'authentification admin."""

    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        user = request.headers.get("X-Admin-User")
        if user != "admin":
            return make_response({"error": "unauthorized"}, 401)
        return f(*args, **kwargs)

    return wrapper


def load_default_users() -> List[tuple[str, str, str]]:
    """Load default users from db_init.json if it exists, otherwise use
    hardcoded defaults."""
    db_init_path = Path(__file__).parent / "db_init.json"

    if db_init_path.exists():
        try:
            with open(db_init_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                users = data.get("users", [])
                return [
                    (u["username"], u["password"], u["language"])
                    for u in users
                ]
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            app.logger.warning("Failed to load users from db_init.json: %s", e)

    # Fallback to hardcoded defaults
    return []


def connect_to_database() -> Any:
    """Établir et retourner une nouvelle connexion à la base de données
    PostgreSQL.

    Raises:
        OperationalError : si la connexion à la base de données échoue.
    """
    try:
        # Utiliser une variable d'environnement pour le mot de passe
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
        app.logger.exception("Database connection failed")
        raise


def initialize_database() -> None:
    """Initialise la base de données : crée les tables et charge les users par
    défaut.

    Encapsulé dans une fonction pour éviter les variables au niveau module.
    """
    init_conn = None
    init_cur = None
    try:
        init_conn = connect_to_database()
        init_cur = init_conn.cursor()
        # Ensure users table exists (do NOT drop existing tables to preserve
        # data)
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS users (
            username varchar(100) PRIMARY KEY,
            password varchar(100) NOT NULL,
            language varchar(10) DEFAULT 'fr'
            );"""
        )
        # Insert default users only if the users table is empty
        init_cur.execute("SELECT COUNT(*) FROM users")
        try:
            users_count = int(init_cur.fetchone()[0] or 0)
        except (TypeError, ValueError, IndexError) as e:
            app.logger.warning("Failed to read users count: %s", e)
            users_count = 0
        if users_count == 0:
            default_users = load_default_users()
            for init_username, init_password, init_language in default_users:
                init_cur.execute(
                    "INSERT INTO users (username, password, language) VALUES "
                    "(%s, %s, %s)",
                    (init_username, init_password, init_language),
                )
        # Table pour stocker le meilleur score par utilisateur
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS highscores (
            username varchar(100) PRIMARY KEY,
            high_score integer NOT NULL,
            stage integer DEFAULT 0,
            timer integer DEFAULT 0,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        # Table pour stocker le profil utilisateur (XP, niveau)
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS user_profiles (
            username varchar(100) PRIMARY KEY,
            xp integer DEFAULT 0,
            level integer DEFAULT 1,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        # Table pour stocker l'historique des changements de XP
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
        # Table pour enregistrer toutes les sessions de jeu
        init_cur.execute(
            """CREATE TABLE IF NOT EXISTS game_sessions (
            id SERIAL PRIMARY KEY,
            username varchar(100) NOT NULL,
            score integer NOT NULL,
            stage integer DEFAULT 0,
            timer integer DEFAULT 0,
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
        );"""
        )
        init_conn.commit()
    except psycopg2.Error as err:
        app.logger.exception("Failed to initialize database: %s", err)
    finally:
        if init_cur:
            try:
                init_cur.close()
            except (psycopg2.Error, AttributeError, OSError) as e:
                app.logger.debug("Failed to close init cursor: %s", e)
        if init_conn:
            try:
                init_conn.close()
            except (psycopg2.Error, AttributeError, OSError) as e:
                app.logger.debug("Failed to close init connection: %s", e)


# Appel immédiat pour conserver le comportement précédent (initialisation à
# l'import)
initialize_database()


@app.route("/api/login", methods=["POST"])
@handle_db_errors
def check_login() -> Response:
    """Handle POST /api/login: validate credentials against the users table.

    Expected JSON body: {"username": str, "password": str}.
    Returns JSON responses with appropriate HTTP status codes.
    """
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return make_response(
            {
                "error": INTERNAL_SERVER_ERROR,
                "message": "An unexpected error occurred.",
            },
            400,
        )
    username = data["username"].strip()
    password = data["password"].strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT username, password FROM users WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        if not row:
            app.logger.info("Login attempt: user '%s' not found", username)
            return make_response(
                {"userExist": False, "passwordIsCorrect": False}
            )
        stored_username, stored_password = row
        if stored_password != password:
            app.logger.info(
                "Login attempt: incorrect password for user '%s'", username
            )
            return make_response(
                {"userExist": True, "passwordIsCorrect": False}
            )
        app.logger.info("User '%s' authenticated", stored_username)
        return make_response(
            {
                "userExist": True,
                "passwordIsCorrect": True,
                "username": stored_username,
            }
        )


@app.route("/api/register", methods=["POST"])
@handle_db_errors
def register_user() -> Response:
    """Handle POST /api/register: create a new user in the users table.

    Expected JSON body: {"username": str, "password": str}
    Returns JSON: {"success": True} on success or {"success": False,
    "message": str} on error
    """
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return make_response(
            {
                "error": BAD_REQUEST,
                "message": "username and password required",
            },
            400,
        )
    username = str(data["username"]).strip()
    password = str(data["password"])
    if not username or not password:
        return make_response(
            {
                "error": BAD_REQUEST,
                "message": "username and password required",
            },
            400,
        )
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        # check if user exists
        cur.execute(
            "SELECT username FROM users WHERE username = %s", (username,)
        )
        if cur.fetchone():
            app.logger.info(
                "Register attempt: user '%s' already exists", username
            )
            return make_response(
                {"success": False, "message": "user already exists"}, 409
            )
        # insert new user (password stored as provided - no hashing to match
        # existing simple setup)
        cur.execute(
            "INSERT INTO users (username, password) VALUES (%s, %s)",
            (username, password),
        )
        conn.commit()
        app.logger.info("User '%s' registered", username)
        return make_response({"success": True})


def _parse_optional_int(data: dict[str, Any], key: str) -> int | None:
    """Parse an optional integer field from data."""
    if key not in data:
        return None
    try:
        return int(data[key]) if data[key] is not None else None
    except (ValueError, TypeError):
        return None


def _insert_game_session(
    cur: Any, username: str, score: int, stage: int | None, timer: int | None
) -> None:
    """Insert a game session record."""
    cur.execute(
        "INSERT INTO game_sessions (username, score, stage, timer) VALUES "
        "(%s, %s, %s, %s)",
        (
            username,
            score,
            stage if stage is not None else 0,
            timer if timer is not None else 0,
        ),
    )


def _handle_new_highscore(
    cur: Any,
    conn: Any,
    username: str,
    score: int,
    stage: int | None,
    timer: int | None,
) -> tuple[int, bool]:
    """Insert a new highscore record."""
    cur.execute(
        "INSERT INTO highscores (username, high_score, stage, timer) "
        "VALUES (%s, %s, %s, %s)",
        (
            username,
            score,
            stage if stage is not None else 0,
            timer if timer is not None else 0,
        ),
    )
    conn.commit()
    return score, True


def _update_highscore_if_better(
    cur: Any,
    conn: Any,
    username: str,
    score: int,
    stage: int | None,
    timer: int | None,
    current_high: int,
) -> tuple[int, bool]:
    """Update highscore if the new score is better."""
    if score <= current_high:
        return current_high, False

    if stage is not None or timer is not None:
        cur.execute(
            "UPDATE highscores SET high_score = %s, stage = %s, "
            "timer = %s WHERE username = %s",
            (
                score,
                stage if stage is not None else 0,
                timer if timer is not None else 0,
                username,
            ),
        )
    else:
        cur.execute(
            "UPDATE highscores SET high_score = %s WHERE username = %s",
            (score, username),
        )
    conn.commit()
    return score, True


@app.route("/api/score", methods=["POST"])
@handle_db_errors
def submit_score() -> Response:
    """Soumettre un score pour un utilisateur.

    Corps attendu: {"username": str, "score": int}
    Si le score est supérieur au high score existant, on met à jour.
    Retourne JSON: {"updated": bool, "highScore": int}
    """
    data = request.get_json()
    if not data or "username" not in data or "score" not in data:
        return make_response(
            {"error": BAD_REQUEST, "message": "username and score required"},
            400,
        )

    username = data["username"].strip()
    try:
        score = int(data["score"])
    except (ValueError, TypeError):
        return make_response(
            {"error": BAD_REQUEST, "message": "score must be an integer"}, 400
        )

    stage = _parse_optional_int(data, "stage")
    timer = _parse_optional_int(data, "timer")

    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        _insert_game_session(cur, username, score, stage, timer)

        cur.execute(
            "SELECT high_score FROM highscores WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()

        if not row:
            high, updated = _handle_new_highscore(
                cur, conn, username, score, stage, timer
            )
        else:
            current_high = int(row[0])
            high, updated = _update_highscore_if_better(
                cur, conn, username, score, stage, timer, current_high
            )

        return make_response({"updated": updated, "highScore": high})


@app.route("/api/score/<username>")
@handle_db_errors
def get_high_score(username: str) -> Response:
    """Retourne le meilleur score pour `username`.
    Réponse JSON: {"username": str, "highScore": int} ou 404 si non trouvé.
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT high_score, stage, timer FROM highscores WHERE username "
            "= %s",
            (username,),
        )
        row = cur.fetchone()

        if not row:
            return make_response(
                {"error": "Not Found", "message": "No high score for user"},
                404,
            )

        return make_response(
            {
                "username": username,
                "highScore": int(row[0]),
                "stage": int(row[1] or 0),
                "timer": int(row[2] or 0),
            }
        )


@app.route("/api/score", methods=["GET"])
@handle_db_errors
def list_high_scores() -> Response:
    """Retourne la liste de tous les high scores triée par score décroissant.
    Réponse JSON: [{"username": str, "highScore": int}, ...]
    """
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT username, high_score, stage, timer FROM highscores "
            "ORDER BY high_score DESC"
        )
        rows = cur.fetchall()

        result: List[Highscore] = [
            {
                "username": r[0],
                "highScore": int(r[1]),
                "stage": int(r[2] or 0),
                "timer": int(r[3] or 0),
            }
            for r in rows
        ]
        return make_response(result)


@app.route("/api/admin/reset-test", methods=["POST"])
@handle_db_errors
def reset_test_account() -> Response:
    """Reset the highscores entry for the `admin` account.

    If the environment variable `ADMIN_SECRET` is set, a matching
    `X-Admin-Token` header is required. If not set, the endpoint
    will allow the operation (convenience for local development).
    """
    admin_secret = os.environ.get("ADMIN_SECRET")
    header = request.headers.get("X-Admin-Token")
    if admin_secret and header != admin_secret:
        return make_response({"error": "unauthorized"}, 401)

    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            """
            INSERT INTO highscores (username, high_score, stage, timer)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE
            SET high_score = EXCLUDED.high_score,
                stage = EXCLUDED.stage,
                timer = EXCLUDED.timer
            """,
            ("admin", 0, 0, 0),
        )
        conn.commit()
        return make_response({"ok": True})


@app.route("/api/admin/users", methods=["GET"])
@handle_db_errors
@require_admin
def list_all_users() -> Response:
    """List all users in the system.

    Returns JSON: [{"username": str}, ...]
    Requires being connected as 'admin' (basic check).
    """
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute("SELECT username FROM users ORDER BY username")
        rows = cur.fetchall()
        return make_response([{"username": r[0]} for r in rows])


@app.route("/api/admin/reset-user/<username>", methods=["POST"])
@handle_db_errors
@require_admin
def reset_user_scores(username: str) -> Response:
    """Reset the highscores entry for a specific user.

    Returns JSON: {"ok": true} on success.
    Requires being connected as 'admin' (basic check).
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            """
            INSERT INTO highscores (username, high_score, stage, timer)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) DO UPDATE
            SET high_score = EXCLUDED.high_score,
                stage = EXCLUDED.stage,
                timer = EXCLUDED.timer
            """,
            (username, 0, 0, 0),
        )
        conn.commit()
        return make_response({"ok": True})


@app.route("/api/admin/reset-sessions/<username>", methods=["POST"])
@handle_db_errors
@require_admin
def reset_user_sessions(username: str) -> Response:
    """Reset all game sessions for a specific user.

    Returns JSON: {"ok": true} on success.
    Requires being connected as 'admin' (basic check).
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "DELETE FROM game_sessions WHERE username = %s", (username,)
        )
        cur.execute("DELETE FROM highscores WHERE username = %s", (username,))
        conn.commit()
        return make_response({"ok": True})


@app.route("/api/admin/delete-user/<username>", methods=["DELETE", "POST"])
@handle_db_errors
@require_admin
def delete_user(username: str) -> Response:
    """Delete a user and cascade-remove related records (highscores, sessions).

    Returns JSON: {"ok": True} on success.
    Requires admin header.
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        # Delete user - CASCADE will remove highscores and sessions
        cur.execute("DELETE FROM users WHERE username = %s", (username,))
        conn.commit()
        return make_response({"ok": True})


@app.route("/api/user/sessions/<username>", methods=["GET"])
@handle_db_errors
def get_user_sessions(username: str) -> Response:
    """Retourne toutes les sessions de jeu d'un utilisateur, triées par score
    DESC.

    Réponse JSON: [{"id": int, "score": int, "stage": int, "timer": int,
    "playedAt": str}, ...]
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT id, score, stage, timer, played_at FROM game_sessions "
            "WHERE username = %s ORDER BY score DESC",
            (username,),
        )
        rows = cur.fetchall()

        result: List[UserSession] = [
            {
                "id": int(r[0]),
                "score": int(r[1]),
                "stage": int(r[2] or 0),
                "timer": int(r[3] or 0),
                "playedAt": str(r[4]),
            }
            for r in rows
        ]
        return make_response(result)


@app.route("/api/user/stats/<username>", methods=["GET"])
@handle_db_errors
def get_user_stats(username: str) -> Response:
    """Retourne les statistiques agrégées d'un utilisateur.

    Réponse JSON: {
        "totalGames": int,
        "totalPlayTime": int (en secondes),
        "totalScore": int,
        "averageScore": float,
        "averageStage": float,
        "bestScore": int,
        "highestStage": int,
        "averagePlayTime": float (en secondes)
    }
    """
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) as total_games,
                SUM(timer) as total_playtime,
                SUM(score) as total_score,
                AVG(score) as avg_score,
                AVG(stage) as avg_stage,
                MAX(score) as best_score,
                MAX(stage) as highest_stage,
                AVG(timer) as avg_playtime
            FROM game_sessions
            WHERE username = %s
            """,
            (username,),
        )
        row = cur.fetchone()

        if not row or row[0] == 0:
            return make_response(
                {
                    "totalGames": 0,
                    "totalPlayTime": 0,
                    "totalScore": 0,
                    "averageScore": 0,
                    "averageStage": 0,
                    "bestScore": 0,
                    "highestStage": 0,
                    "averagePlayTime": 0,
                }
            )

        return make_response(
            {
                "totalGames": int(row[0]),
                "totalPlayTime": int(row[1] or 0),
                "totalScore": int(row[2] or 0),
                "averageScore": float(row[3] or 0),
                "averageStage": float(row[4] or 0),
                "bestScore": int(row[5] or 0),
                "highestStage": int(row[6] or 0),
                "averagePlayTime": float(row[7] or 0),
            }
        )


@app.route("/api/user/language/<username>", methods=["GET"])
@handle_db_errors
def get_user_language(username: str) -> Response:
    """Retourne la langue préférée d'un utilisateur."""
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT language FROM users WHERE username = %s", (username,)
        )
        row = cur.fetchone()
        return make_response({"language": row[0] if row else "fr"})


@app.route("/api/user/xp/<username>", methods=["GET"])
@handle_db_errors
def get_user_xp(username: str) -> Response:
    """Retourne le XP et le niveau pour `username`."""
    username = username.strip()
    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT xp, level FROM user_profiles WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        if not row:
            return make_response({"xp": 0, "level": 1})
        return make_response(
            {"xp": int(row[0] or 0), "level": int(row[1] or 1)}
        )

    @app.route("/api/user/xp/history/<username>")
    @handle_db_errors
    def get_user_xp_history(username: str) -> Response:
        """Retourne l'historique XP pour `username`.

        Query param optional: `limit` (int)
        """
        username = username.strip()
        limit = request.args.get("limit", "50")
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 50

        with get_db_connection() as conn, get_db_cursor(conn) as cur:
            cur.execute(
                "SELECT xp, level, created_at FROM user_xp_history WHERE username = %s ORDER BY created_at ASC LIMIT %s",
                (username, limit),
            )
            rows = cur.fetchall()
            result = [
                {
                    "xp": int(r[0] or 0),
                    "level": int(r[1] or 1),
                    "createdAt": str(r[2]),
                }
                for r in rows
            ]
            return make_response(result)


@app.route("/api/user/xp", methods=["POST"])
@handle_db_errors
def add_user_xp() -> Response:
    """Ajoute du XP à un utilisateur et retourne le nouveau XP/niveau.

    Corps attendu: {"username": str, "xp": int} (xp peut être négatif pour retirer)
    """
    data = request.get_json()
    if not data or "username" not in data or "xp" not in data:
        return make_response(
            {"error": BAD_REQUEST, "message": "username and xp required"}, 400
        )

    username = str(data["username"]).strip()
    try:
        delta = int(data["xp"])
    except (ValueError, TypeError):
        return make_response(
            {"error": BAD_REQUEST, "message": "xp must be an integer"}, 400
        )

    if not username:
        return make_response(
            {"error": BAD_REQUEST, "message": "username required"}, 400
        )

    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT xp FROM user_profiles WHERE username = %s", (username,)
        )
        row = cur.fetchone()
        if not row:
            new_xp = max(0, delta)
            level = new_xp // 100 + 1
            cur.execute(
                "INSERT INTO user_profiles (username, xp, level) VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
            # Enregistrer snapshot dans l'historique
            cur.execute(
                "INSERT INTO user_xp_history (username, xp, level) VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
        else:
            current = int(row[0] or 0)
            new_xp = max(0, current + delta)
            level = new_xp // 100 + 1
            cur.execute(
                "UPDATE user_profiles SET xp = %s, level = %s WHERE username = %s",
                (new_xp, level, username),
            )
            # Enregistrer snapshot dans l'historique
            cur.execute(
                "INSERT INTO user_xp_history (username, xp, level) VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
        conn.commit()
        return make_response(
            {"username": username, "xp": new_xp, "level": level}
        )


@app.route("/api/user/language", methods=["POST"])
@handle_db_errors
def set_user_language() -> Response:
    """Met à jour la langue préférée d'un utilisateur."""
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    language = data.get("language", "fr").strip()

    if not username:
        return make_response({"error": "username required"}, 400)

    with get_db_connection() as conn, get_db_cursor(conn) as cur:
        cur.execute(
            "UPDATE users SET language = %s WHERE username = %s",
            (language, username),
        )
        conn.commit()
        return make_response({"language": language})


@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException) -> Response:
    """Convertir une exception HTTP de Werkzeug en réponse JSON.

    Assure que les attributs `name`, `description` et `code` sont convertis en
    types sécurisés
    pour la sérialisation JSON et les vérificateurs de type statiques.
    """
    err_name = str(getattr(e, "name", "Error"))
    err_desc = str(getattr(e, "description", ""))
    resp = jsonify({"error": err_name, "message": err_desc})
    resp.status_code = int(getattr(e, "code", 500) or 500)
    return resp


@app.errorhandler(Exception)
def handle_exception(e: Exception) -> Response:
    """Gestionnaire d'exception générique qui retourne HTTP 500 en tant que
    JSON.

    Logue l'exception et retourne un message d'erreur sanisé aux clients.
    """
    app.logger.exception(e)
    resp = jsonify(
        {
            "error": INTERNAL_SERVER_ERROR,
            "message": "An unexpected error occurred.",
        }
    )
    resp.status_code = 500
    return resp


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
