"""Bootstrap Flask app and register API blueprints."""

import logging
import sys
from pathlib import Path

from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

# Ensure local imports work whether run as a module or a script
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core import admin, db, utils  # type: ignore
from pages.accueil import auth, game  # type: ignore
from pages.classement import scores  # type: ignore
from pages.compte import users  # type: ignore

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# CORS configuration for API routes
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5000",
                "http://127.0.0.1:5000",
                "http://localhost:15256",
                "http://127.0.0.1:15256",
                "http://192.168.60.220:15256",
                "*:15256",  # Accept any IP on port 15256
            ],
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Admin-User"],
            "supports_credentials": True,
        }
    },
)

# Register blueprints - organized by page
app.register_blueprint(auth.bp)
app.register_blueprint(game.bp)
app.register_blueprint(scores.bp)
app.register_blueprint(users.bp)
app.register_blueprint(admin.bp)

# Ensure database schema exists
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
