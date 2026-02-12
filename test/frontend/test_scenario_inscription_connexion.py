"""Scénario frontend : Inscription et Connexion.

Simule le parcours utilisateur complet d'inscription, connexion,
vérification de session, logout, et reconnexion.
"""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioInscription:
    """Tests du flux d'inscription utilisateur."""

    def test_inscription_complete(
        self, client: FlaskClient, cleanup_user: str
    ):
        """Scénario : un nouvel utilisateur s'inscrit avec succès."""
        rv = client.post(
            "/api/register",
            json={"username": cleanup_user, "password": TEST_PASSWORD},
        )
        assert rv.status_code == 200
        assert rv.get_json()["success"] is True

    def test_inscription_avec_langue(
        self, client: FlaskClient, cleanup_user: str
    ):
        """Scénario : inscription avec choix de langue anglaise."""
        rv = client.post(
            "/api/register",
            json={
                "username": cleanup_user,
                "password": TEST_PASSWORD,
                "language": "en",
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["success"] is True
        # Vérifier que la langue a bien été enregistrée
        rv2 = client.get(f"/api/user/language/{cleanup_user}")
        assert rv2.status_code == 200
        assert rv2.get_json()["language"] == "en"

    def test_inscription_doublon_refuse(
        self, client: FlaskClient, cleanup_user: str
    ):
        """Scénario : tentative d'inscription avec un pseudo déjà pris."""
        client.post(
            "/api/register",
            json={"username": cleanup_user, "password": TEST_PASSWORD},
        )
        rv = client.post(
            "/api/register",
            json={"username": cleanup_user, "password": "autre_mdp"},
        )
        assert rv.status_code == 409
        assert rv.get_json()["success"] is False

    def test_inscription_champs_manquants(self, client: FlaskClient):
        """Scénario : formulaire d'inscription incomplet."""
        rv = client.post("/api/register", json={"username": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/register", json={"password": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/register", json={})
        assert rv.status_code == 400

    def test_inscription_username_trop_long(
        self, client: FlaskClient, cleanup_user: str
    ):
        """Scénario : un username de plus de 100 caractères est refusé."""
        long_name = "a" * 101
        rv = client.post(
            "/api/register",
            json={"username": long_name, "password": TEST_PASSWORD},
        )
        assert rv.status_code == 400


class TestScenarioConnexion:
    """Tests du flux de connexion utilisateur."""

    def test_connexion_reussie(self, client: FlaskClient, registered_user):
        """Scénario : un utilisateur inscrit se connecte avec succès."""
        username, password = registered_user
        rv = client.post(
            "/api/login", json={"username": username, "password": password}
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["userExist"] is True
        assert data["passwordIsCorrect"] is True
        assert "session_token" in data

    def test_connexion_mauvais_mot_de_passe(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : l'utilisateur tape un mauvais mot de passe."""
        username, _ = registered_user
        rv = client.post(
            "/api/login",
            json={"username": username, "password": "mauvais_mdp_123"},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["userExist"] is True
        assert data["passwordIsCorrect"] is False

    def test_connexion_utilisateur_inexistant(self, client: FlaskClient):
        """Scénario : connexion avec un utilisateur qui n'existe pas."""
        rv = client.post(
            "/api/login",
            json={
                "username": f"inexistant_{uuid.uuid4().hex[:6]}",
                "password": "test",
            },
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["userExist"] is False
        assert data["passwordIsCorrect"] is False

    def test_connexion_champs_manquants(self, client: FlaskClient):
        """Scénario : formulaire de connexion incomplet."""
        rv = client.post("/api/login", json={"username": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/login", json={"password": "test"})
        assert rv.status_code == 400


class TestScenarioSessionEtLogout:
    """Tests du flux de session et déconnexion."""

    def test_session_ping(self, client: FlaskClient, logged_in_user):
        """Scénario : le client envoie un ping de session (keep-alive)."""
        username, _, token = logged_in_user
        rv = client.get(
            "/api/session/ping",
            headers={
                "X-Session-User": username,
                "X-Session-Token": token,
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_logout_complet(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur se déconnecte via le body JSON."""
        username, _, token = logged_in_user
        rv = client.post(
            "/api/logout",
            json={"username": username, "session_token": token},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_logout_via_headers(self, client: FlaskClient, logged_in_user):
        """Scénario : déconnexion via les headers (sendBeacon)."""
        username, _, token = logged_in_user
        rv = client.post(
            "/api/logout",
            headers={
                "X-Session-User": username,
                "X-Session-Token": token,
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_logout_sans_credentials(self, client: FlaskClient):
        """Scénario : tentative de logout sans identifiants."""
        rv = client.post("/api/logout", json={})
        assert rv.status_code == 400

    def test_reconnexion_apres_logout(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : l'utilisateur se déconnecte puis se reconnecte."""
        username, password, token = logged_in_user
        # Logout
        client.post(
            "/api/logout",
            json={"username": username, "session_token": token},
        )
        # Reconnexion
        rv = client.post(
            "/api/login", json={"username": username, "password": password}
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["passwordIsCorrect"] is True
        assert data["session_token"] != token  # Nouveau token

    def test_double_connexion_remplace_session(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : le même utilisateur se connecte depuis deux appareils."""
        username, password = registered_user
        rv1 = client.post(
            "/api/login", json={"username": username, "password": password}
        )
        token1 = rv1.get_json()["session_token"]

        rv2 = client.post(
            "/api/login", json={"username": username, "password": password}
        )
        token2 = rv2.get_json()["session_token"]
        assert token1 != token2
