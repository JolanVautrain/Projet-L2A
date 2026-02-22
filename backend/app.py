"""Bootstrap Flask app and register API blueprints."""

import logging
import re
import urllib.parse
import sys
from pathlib import Path
from typing import Optional, Union, List
from flask import Flask
from flask import request
from flask import Response
from werkzeug.exceptions import HTTPException

# ajout du backend au path pour que les imports relatifs fonctionnent
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from core import admin  # noqa: E402
from core import db  # noqa: E402
from core import utils  # noqa: E402
from pages.accueil import auth  # noqa: E402
from pages.accueil import game  # noqa: E402
from pages.classement import scores  # noqa: E402
from pages.classement import topUsers  # noqa: E402
from pages.compte import users  # noqa: E402
from pages.report import report  # noqa: E402
from pages.shop import shop  # noqa: E402

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)


# CORS est géré manuellement dans after_request pour éviter les en-têtes
# dupliqués
def _origin_from_env(path: Union[Path, str]) -> Optional[str]:
    try:
        txt = Path(path).read_text(encoding="utf-8")
    except Exception:
        return None
    for key in ("VITE_BACKEND_URL", "VITE_WS_URL"):
        m = re.search(rf'^{key}=(.+)$', txt, re.M)
        if m:
            url = m.group(1).strip()
            parsed = urllib.parse.urlparse(url)
            scheme = parsed.scheme
            netloc = parsed.netloc
            if scheme in ("ws", "wss"):
                scheme = "http" if scheme == "ws" else "https"
            if netloc:
                return f"{scheme}://{netloc}"
    return None


def _get_base_allowed_origins() -> List[str]:
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:15256",
        "http://127.0.0.1:15256",
    ]


def _augment_allowed_origins(allowed_origins: List[str]) -> None:
    docker_env = BASE_DIR.parent / "docker" / ".env.production"
    frontend_env_prod = BASE_DIR.parent / "frontend" / ".env.production"
    frontend_env_dev = BASE_DIR.parent / "frontend" / ".env.development"
    for p in (docker_env, frontend_env_prod, frontend_env_dev):
        origin_from_file = _origin_from_env(p)
        if origin_from_file and origin_from_file not in allowed_origins:
            allowed_origins.append(origin_from_file)


def _set_cors_headers(response: Response, origin: str) -> None:
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, DELETE, OPTIONS"
    )
    response.headers[
        "Access-Control-Allow-Headers"
    ] = (
        "Content-Type, Authorization, X-Admin-User, X-Session-User, "
        "X-Session-Token"
    )
    response.headers["Access-Control-Max-Age"] = "1728000"


@app.after_request
def after_request(response: Response) -> Response:
    """Add CORS headers to response."""
    origin = request.headers.get("Origin")
    if not origin:
        return response

    allowed_origins = _get_base_allowed_origins()
    _augment_allowed_origins(allowed_origins)

    if origin in allowed_origins or re.match(r"^http://[^:]+:15256$", origin):
        _set_cors_headers(response, origin)

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

# Vérification de la connexion à la base de données et création du schéma si
# nécessaire
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
