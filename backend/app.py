import logging

from flask import Flask, request, jsonify, Response
from flask_cors import CORS  # type: ignore
import psycopg2  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from werkzeug.exceptions import HTTPException

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)


def connect_to_database():
    """Establish and return a new PostgreSQL database connection.

    Raises:
        OperationalError: if the connection to the database fails.
    """
    try:
        return psycopg2.connect(
            database="ma_db",
            user="mon_user",
            password="mon_pass",
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
    """Test endpoint that returns a simple greeting string.

    Used to verify the server is running and reachable.
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

        username = data["username"]
        password = data["password"]

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
            resp = jsonify({"error": "User not found"})
            resp.status_code = 404
            return resp

        stored_username, stored_password = row
        if stored_password != password:
            resp = jsonify({"error": "Invalid credentials"})
            resp.status_code = 401
            return resp

        resp = jsonify(
            {
                "message": "Authenticated",
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
    """Convert Werkzeug HTTPException into a JSON Response.

    Ensures `name`, `description` and `code` are coerced to safe types
    for JSON serialization and static type checkers.
    """
    err_name = str(getattr(e, "name", "Error"))
    err_desc = str(getattr(e, "description", ""))
    resp = jsonify({"error": err_name, "message": err_desc})
    resp.status_code = int(getattr(e, "code", 500) or 500)
    return resp


@app.errorhandler(Exception)
def handle_exception(e: Exception) -> Response:
    """Generic exception handler that returns HTTP 500 as JSON.

    Logs the exception and returns a sanitized error message to clients.
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
