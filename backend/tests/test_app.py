"""Tests pour l'application Flask (app.py) et ses gestionnaires d'erreurs."""

from flask.testing import FlaskClient
from werkzeug.exceptions import NotFound, BadRequest


def test_404_error_handler(client: FlaskClient):
    """Test du gestionnaire d'erreur 404."""
    rv = client.get("/api/route/inexistante")
    assert rv.status_code == 404
    data = rv.get_json()
    assert "error" in data
    assert data["error"] == "Not Found"


def test_cors_headers(client: FlaskClient):
    """Test que les en-têtes CORS sont présents."""
    rv = client.get("/api/scores", headers={"Origin": "http://localhost:5173"})
    assert "Access-Control-Allow-Origin" in rv.headers
    assert "Access-Control-Allow-Credentials" in rv.headers


def test_options_request(client: FlaskClient):
    """Test des requêtes OPTIONS pour CORS."""
    rv = client.options(
        "/api/login", headers={"Origin": "http://localhost:5173"}
    )
    assert rv.status_code == 200
    assert "Access-Control-Allow-Methods" in rv.headers


def test_app_routes_registered(client: FlaskClient):
    """Test que toutes les routes principales sont enregistrées."""
    # Test auth routes
    rv = client.post("/api/register", json={})
    assert rv.status_code in [200, 400]  # Route existe

    # Test game routes
    rv = client.get("/api/game/lobby/players")
    assert rv.status_code == 200

    # Test scores routes
    rv = client.get("/api/score")
    assert rv.status_code == 200

    # Test user routes
    rv = client.get("/api/user/xp/testuser")
    assert rv.status_code in [200, 404]  # Route existe
