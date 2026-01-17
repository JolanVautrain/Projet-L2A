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

import psycopg2  # type: ignore
from flask import Flask, Response, jsonify, request
from flask_cors import CORS  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)


def connect_to_database():
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

    init_cur.execute("DROP TABLE IF EXISTS users;")

    init_cur.execute(
        """CREATE TABLE IF NOT EXISTS users (
        username varchar(100) PRIMARY KEY, password varchar(100) NOT NULL);"""
    )

    init_cur.execute(
        """INSERT INTO users (username, password) VALUES
        ('test', '1234'),
        ('username', 'password'),
        ('azerty', 'qsdfgh');"""
    )

    # Table pour stocker le meilleur score par utilisateur
    init_cur.execute("DROP TABLE IF EXISTS highscores;")
    init_cur.execute(
        """CREATE TABLE IF NOT EXISTS highscores (
        username varchar(100) PRIMARY KEY,
        high_score integer NOT NULL,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
    );"""
    )

    init_conn.commit()

    init_cur.close()
    init_conn.close()
except psycopg2.Error as err:
    app.logger.exception("Failed to initialize database: %s", err)


@app.route("/api/login")
def check_login_test():
    """Endpoint de test qui retourne une chaîne de caractères de salutation
    simple.

    Utilisé pour vérifier que le serveur est en cours d'exécution et
    accessible.
    """
    return "hello world"


@app.route("/api/login", methods=["POST"])
def check_login():
    """Handle POST /api/login: validate credentials against the users table.

    Expected JSON body: {"username": str, "password": str}.
    Returns JSON responses with appropriate HTTP status codes.
    """
    try:
        data = request.get_json()
        if not data or "username" not in data or "password" not in data:
            resp = jsonify(
                {
                    "error": "Bad Request",
                    "message": "username and password required",
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
        resp = jsonify({"error": "Database error"})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/login: %s", err)
        resp = jsonify({"error": "Internal Server Error"})
        resp.status_code = 500
        return resp


@app.route("/api/score", methods=["POST"])
def submit_score():
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
                    "error": "Bad Request",
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
                {"error": "Bad Request", "message": "score must be an integer"}
            )
            resp.status_code = 400
            return resp

        conn = connect_to_database()
        cur = conn.cursor()

        # Vérifier si un high score existe
        cur.execute(
            "SELECT high_score FROM highscores WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()

        if not row:
            # Insérer un nouveau record
            cur.execute(
                "INSERT INTO highscores (username, high_score) VALUES (%s, %s)",
                (username, score),
            )
            conn.commit()
            high = score
            updated = True
        else:
            current_high = int(row[0])
            if score > current_high:
                cur.execute(
                    "UPDATE highscores SET high_score = %s WHERE username = %s",
                    (score, username),
                )
                conn.commit()
                high = score
                updated = True
            else:
                high = current_high
                updated = False

        cur.close()
        conn.close()

        resp = jsonify({"updated": updated, "highScore": high})
        resp.status_code = 200
        return resp

    except OperationalError:
        resp = jsonify({"error": "Database error"})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in /api/score: %s", err)
        resp = jsonify({"error": "Internal Server Error"})
        resp.status_code = 500
        return resp


@app.route("/api/score/<username>")
def get_high_score(username: str):
    """Retourne le meilleur score pour `username`.

    Réponse JSON: {"username": str, "highScore": int} ou 404 si non trouvé.
    """
    try:
        username = str(username).strip()
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT high_score FROM highscores WHERE username = %s",
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

        resp = jsonify({"username": username, "highScore": int(row[0])})
        resp.status_code = 200
        return resp

    except OperationalError:
        resp = jsonify({"error": "Database error"})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception(
            "Unexpected error in /api/score/<username>: %s", err
        )
        resp = jsonify({"error": "Internal Server Error"})
        resp.status_code = 500
        return resp


@app.route("/api/score", methods=["GET"])
def list_high_scores():
    """Retourne la liste de tous les high scores triée par score décroissant.

    Réponse JSON: [{"username": str, "highScore": int}, ...]
    """
    try:
        conn = connect_to_database()
        cur = conn.cursor()
        cur.execute(
            "SELECT username, high_score FROM highscores ORDER BY high_score DESC"
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        result = [{"username": r[0], "highScore": int(r[1])} for r in rows]
        resp = jsonify(result)
        resp.status_code = 200
        return resp

    except OperationalError:
        resp = jsonify({"error": "Database error"})
        resp.status_code = 500
        return resp
    except (psycopg2.Error, ValueError, TypeError) as err:
        app.logger.exception("Unexpected error in GET /api/score: %s", err)
        resp = jsonify({"error": "Internal Server Error"})
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
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
        }
    )
    resp.status_code = 500
    return resp


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
