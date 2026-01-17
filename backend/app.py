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
        return psycopg2.connect(
            database="ma_db",
            user="mon_user",
            password=db_password,
            host="db",
            port="5432",
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
