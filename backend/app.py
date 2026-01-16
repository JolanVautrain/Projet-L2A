from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import psycopg2
from psycopg2 import OperationalError
from werkzeug.exceptions import HTTPException
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)


def connectToDatabase():
    # Garder la fonction simple mais remonter une erreur claire si la connexion échoue
    try:
        return psycopg2.connect(
            database="ma_db",
            user="mon_user",
            password="mon_pass",
            host="db",
            port="5432",
        )
    except OperationalError as e:
        app.logger.exception("Database connection failed")
        raise


try:
    conn = connectToDatabase()
    cur = conn.cursor()

    cur.execute("DROP TABLE IF EXISTS users;")

    cur.execute(
        """CREATE TABLE IF NOT EXISTS users (
        username varchar(100) PRIMARY KEY, password varchar(100) NOT NULL);"""
    )

    cur.execute(
        """INSERT INTO users (username, password) VALUES
        ('test', '1234'),
        ('username', 'password'),
        ('azerty', 'qsdfgh');"""
    )

    conn.commit()

    cur.close()
    conn.close()
except Exception:
    app.logger.exception("Failed to initialize database; continuing without seeding")


@app.route("/api/login")
def checkLogin2():
    return "hello world"


@app.route("/api/login", methods=["POST"])
def checkLogin():
    try:
        data = request.get_json()
        if not data or "username" not in data or "password" not in data:
            return (
                jsonify(
                    {
                        "error": "Bad Request",
                        "message": "username and password required",
                    }
                ),
                400,
            )

        username = data["username"]
        password = data["password"]

        conn = connectToDatabase()
        cur = conn.cursor()

        cur.execute(
            "SELECT username, password FROM users WHERE username = %s", (username,)
        )
        row = cur.fetchone()

        cur.close()
        conn.close()

        if not row:
            return jsonify({"error": "User not found"}), 404

        stored_username, stored_password = row
        if stored_password != password:
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({"message": "Authenticated", "username": stored_username}), 200

    except OperationalError:
        # DB connection-level error
        return jsonify({"error": "Database error"}), 500
    except Exception:
        app.logger.exception("Unexpected error in /api/login")
        return jsonify({"error": "Internal Server Error"}), 500


# Centralized error handlers
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    response = e.get_response()
    # replace the body with JSON
    return jsonify({"error": e.name, "message": e.description}), e.code


@app.errorhandler(Exception)
def handle_exception(e):
    # non-HTTP exceptions -> 500
    app.logger.exception(e)
    return (
        jsonify(
            {
                "error": "Internal Server Error",
                "message": "An unexpected error occurred.",
            }
        ),
        500,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
