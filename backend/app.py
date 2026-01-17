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

import logging
import os
from typing import Any, List, TypedDict

import psycopg2  # type: ignore
from flask import Flask, Response, jsonify, request
from flask_cors import CORS  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
CORS(app)
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


try:
    init_conn = connect_to_database()
    init_cur = init_conn.cursor()
    # Drop tables with CASCADE to handle foreign key dependencies
    init_cur.execute("DROP TABLE IF EXISTS highscores CASCADE;")
    init_cur.execute("DROP TABLE IF EXISTS users CASCADE;")
    init_cur.execute(
        """CREATE TABLE IF NOT EXISTS users (
        username varchar(100) PRIMARY KEY,
        password varchar(100) NOT NULL,
        language varchar(10) DEFAULT 'fr'
        );"""
    )
    init_cur.execute(
        """INSERT INTO users (username, password, language) VALUES
        ('admin', '1234', 'fr'),
        ('username', 'password', 'fr'),
        ('azerty', 'qsdfgh', 'fr');"""
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
    init_cur.close()
    init_conn.close()
except psycopg2.Error as err:
    app.logger.exception("Failed to initialize database: %s", err)


@app.route("/api/login", methods=["POST"])
def check_login() -> Response:
    """Handle POST /api/login: validate credentials against the users table.

    Expected JSON body: {"username": str, "password": str}.
    Returns JSON responses with appropriate HTTP status codes.
    """
    try:
        data = request.get_json()
        if not data or "username" not in data or "password" not in data:
            resp = jsonify(
                {
                    "error": INTERNAL_SERVER_ERROR,
                    "message": "An unexpected error occurred.",
                }
            )
            resp.status_code = 400
            return resp
        username = str(data["username"]).strip()
        password = str(data["password"]).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT username, password FROM users WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            app.logger.info("Login attempt: user '%s' not found", username)
            # Le frontend s'attend à un JSON avec les clés :
            # 'userExist' et 'passwordIsCorrect'
            resp = jsonify({"userExist": False, "passwordIsCorrect": False})
            resp.status_code = 200
            return resp
        stored_username, stored_password = row
        if stored_password != password:
            app.logger.info(
                "Login attempt: incorrect password for user '%s'",
                username,
            )
            resp = jsonify({"userExist": True, "passwordIsCorrect": False})
            resp.status_code = 200
            return resp
        app.logger.info("User '%s' authenticated", stored_username)
        resp = jsonify(
            {
                "userExist": True,
                "passwordIsCorrect": True,
                "username": stored_username,
            }
        )
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/login: %s", err)
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


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
def submit_score() -> Response:
    """Soumettre un score pour un utilisateur.

    Corps attendu: {"username": str, "score": int}
    Si le score est supérieur au high score existant, on met à jour.
    Retourne JSON: {"updated": bool, "highScore": int}
    """
    try:
        data = request.get_json()
        if not data or "username" not in data or "score" not in data:
            resp = jsonify(
                {
                    "error": BAD_REQUEST,
                    "message": "username and score required",
                }
            )
            resp.status_code = 400
            return resp

        username = str(data["username"]).strip()
        try:
            score = int(data["score"])
        except (ValueError, TypeError):
            resp = jsonify(
                {"error": BAD_REQUEST, "message": "score must be an integer"}
            )
            resp.status_code = 400
            return resp

        stage = _parse_optional_int(data, "stage")
        timer = _parse_optional_int(data, "timer")

        conn = connect_to_database()
        cur = conn.cursor()

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

        cur.close()
        conn.close()
        resp = jsonify({"updated": updated, "highScore": high})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/score: %s", err)
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/score/<username>")
def get_high_score(username: str) -> Response:
    """Retourne le meilleur score pour `username`.
    Réponse JSON: {"username": str, "highScore": int} ou 404 si non trouvé.
    """
    try:
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT high_score, stage, timer FROM highscores WHERE username "
            "= %s",
            (username,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            resp = jsonify(
                {"error": "Not Found", "message": "No high score for user"}
            )
            resp.status_code = 404
            return resp
        resp = jsonify(
            {
                "username": username,
                "highScore": int(row[0]),
                "stage": int(row[1] or 0),
                "timer": int(row[2] or 0),
            }
        )
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/score/<username>: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/score", methods=["GET"])
def list_high_scores() -> Response:
    """Retourne la liste de tous les high scores triée par score décroissant.
    Réponse JSON: [{"username": str, "highScore": int}, ...]
    """
    try:
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT username, high_score, stage, timer FROM highscores ORDER "
            "BY high_score DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result: List[Highscore] = []
        for r in rows:
            hs: Highscore = {
                "username": str(r[0]),
                "highScore": int(r[1]),
                "stage": int(r[2] or 0),
                "timer": int(r[3] or 0),
            }
            result.append(hs)
        resp = jsonify(result)
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in GET /api/score: %s", err)
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/admin/reset-test", methods=["POST"])
def reset_test_account() -> Response:
    """Reset the highscores entry for the `admin` account.

    If the environment variable `ADMIN_SECRET` is set, a matching
    `X-Admin-Token` header is required. If not set, the endpoint
    will allow the operation (convenience for local development).
    """
    try:
        admin_secret = os.environ.get("ADMIN_SECRET")
        header = request.headers.get("X-Admin-Token")
        if admin_secret and header != admin_secret:
            resp = jsonify({"error": "unauthorized"})
            resp.status_code = 401
            return resp
        conn = connect_to_database()
        cur = conn.cursor()
        # inserte ou met à jour les scores du compte admin à zéro
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
        cur.close()
        conn.close()
        resp = jsonify({"ok": True})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/admin/reset-test: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/admin/users", methods=["GET"])
def list_all_users() -> Response:
    """List all users in the system.

    Returns JSON: [{"username": str}, ...]
    Requires being connected as 'admin' (basic check).
    """
    try:
        user = request.headers.get("X-Admin-User")
        if user != "admin":
            resp = jsonify({"error": "unauthorized"})
            resp.status_code = 401
            return resp
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute("SELECT username FROM users ORDER BY username")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result = [{"username": r[0]} for r in rows]
        resp = jsonify(result)
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/admin/users: %s", err)
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/admin/reset-user/<username>", methods=["POST"])
def reset_user_scores(username: str) -> Response:
    """Reset the highscores entry for a specific user.

    Returns JSON: {"ok": true} on success.
    Requires being connected as 'admin' (basic check).
    """
    try:
        user = request.headers.get("X-Admin-User")
        if user != "admin":
            resp = jsonify({"error": "unauthorized"})
            resp.status_code = 401
            return resp
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        # inserte ou met à jour les scores du compte à zéro
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
        cur.close()
        conn.close()
        resp = jsonify({"ok": True})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/admin/reset-user: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/admin/reset-sessions/<username>", methods=["POST"])
def reset_user_sessions(username: str) -> Response:
    """Reset all game sessions for a specific user.

    Returns JSON: {"ok": true} on success.
    Requires being connected as 'admin' (basic check).
    """
    try:
        user = request.headers.get("X-Admin-User")
        if user != "admin":
            resp = jsonify({"error": "unauthorized"})
            resp.status_code = 401
            return resp

        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        # Delete all game_sessions for the user
        cur.execute(
            "DELETE FROM game_sessions WHERE username = %s",
            (username,),
        )
        # Delete highscore entry as well (complete reset)
        cur.execute(
            "DELETE FROM highscores WHERE username = %s",
            (username,),
        )
        conn.commit()
        cur.close()
        conn.close()
        resp = jsonify({"ok": True})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/admin/reset-sessions: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/user/sessions/<username>", methods=["GET"])
def get_user_sessions(username: str) -> Response:
    """Retourne toutes les sessions de jeu d'un utilisateur, triées par score
    DESC.

    Réponse JSON: [{"id": int, "score": int, "stage": int, "timer": int,
    "playedAt": str}, ...]
    """
    try:
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, score, stage, timer, played_at FROM game_sessions "
            "WHERE username = %s ORDER BY score DESC",
            (username,),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        result: List[UserSession] = []
        for r in rows:
            session: UserSession = {
                "id": int(r[0]),
                "score": int(r[1]),
                "stage": int(r[2] or 0),
                "timer": int(r[3] or 0),
                "playedAt": str(r[4]),
            }
            result.append(session)
        resp = jsonify(result)
        resp.status_code = 200
        return resp

    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/user/sessions/<username>: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/user/stats/<username>", methods=["GET"])
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
    try:
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
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
        cur.close()
        conn.close()
        if not row or row[0] == 0:
            resp = jsonify(
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
        else:
            resp = jsonify(
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
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/user/stats/<username>: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/user/language/<username>", methods=["GET"])
def get_user_language(username: str) -> Response:
    """Retourne la langue préférée d'un utilisateur."""
    try:
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT language FROM users WHERE username = %s", (username,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            resp = jsonify({"language": "fr"})
        else:
            resp = jsonify({"language": row[0] or "fr"})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/user/language/<username>: %s", err
        )
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


@app.route("/api/user/language", methods=["POST"])
def set_user_language() -> Response:
    """Met à jour la langue préférée d'un utilisateur."""
    try:
        data = request.get_json(force=True)
        username = str(data.get("username", "")).strip()
        language = str(data.get("language", "fr")).strip()
        if not username:
            resp = jsonify({"error": "username required"})
            resp.status_code = 400
            return resp
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET language = %s WHERE username = %s",
            (language, username),
        )
        conn.commit()
        cur.close()
        conn.close()
        resp = jsonify({"language": language})
        resp.status_code = 200
        return resp
    except OperationalError:
        resp = jsonify({"error": DATABASE_ERROR})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/user/language: %s", err)
        resp = jsonify({"error": INTERNAL_SERVER_ERROR})
        resp.status_code = 500
        return resp


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
