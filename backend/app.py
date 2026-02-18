"""Bootstrap Flask app and register API blueprints."""

import logging
import re
import sys
from pathlib import Path

from flask import Flask
from flask import request
from werkzeug.exceptions import HTTPException

# Add the backend directory to path before imports so relative imports work
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core import admin  # type: ignore
from core import db
from core import utils
from pages.accueil import auth  # type: ignore
from pages.accueil import game
from pages.classement import scores  # type: ignore
from pages.classement import topUsers  # type: ignore
from pages.compte import users  # type: ignore
from pages.report import report  # type: ignore
from pages.shop import shop  # type: ignore

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)


# CORS est géré manuellement dans after_request pour éviter les en-têtes
# dupliqués
@app.after_request
def after_request(response):
    """Add CORS headers to response."""
    origin = request.headers.get("Origin")

    # Vérification de l'origine de la requête
    if origin:
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://localhost:15256",
            "http://127.0.0.1:15256",
            "http://192.168.60.202:15256",
            "http://192.168.60.200:15256",
            "http://192.168.60.302:15256",
            "http://192.168.60.220:15256",
            "http://192.168.60.021:15256",
            "http://192.168.60.201:15256",
        ]

        # Ajout des en-têtes CORS
        if origin in allowed_origins or re.match(
            r"^http://[^:]+:15256$", origin
        ):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Admin-User, X-Session-User, X-Session-Token"
            )
            response.headers["Access-Control-Max-Age"] = "1728000"

    return response


# Registre des blueprints - organisés par page
app.register_blueprint(auth.bp)
app.register_blueprint(game.bp)
app.register_blueprint(scores.bp)
app.register_blueprint(users.bp)
app.register_blueprint(admin.bp)
app.register_blueprint(topUsers.bp)
app.register_blueprint(report.bp)
app.register_blueprint(shop.bp)

# Vérification de la connexion à la base de données et création du schéma si nécessaire
db.check_and_recreate_schema()


@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException):
    err_name = str(getattr(e, "name", "Error"))
    err_desc = str(getattr(e, "description", ""))
    return utils.make_response(
        {"error": err_name, "message": err_desc},
        int(getattr(e, "code", 500) or 500),
    )


@app.errorhandler(Exception)
def handle_exception(e: Exception):
    logging.exception(e)
    return utils.make_response(
        {
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
        },
        500,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
