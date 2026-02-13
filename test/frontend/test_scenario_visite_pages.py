"""Scénario frontend : Navigation entre les pages.

Simule la visite des différentes pages du site par un utilisateur
connecté et non connecté.
"""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestVisitePagesPubliques:
    """Tests de navigation sur les pages accessibles sans connexion."""

    def test_page_accueil_api(self, client: FlaskClient):
        """Scénario : vérifier que les API publiques répondent."""
        # Le ping de session est accessible publiquement
        rv = client.get("/api/session/ping")
        assert rv.status_code == 200

    def test_page_404(self, client: FlaskClient):
        """Scénario : accéder à une route inexistante retourne 404."""
        rv = client.get("/api/page-qui-nexiste-pas")
        assert rv.status_code == 404

    def test_leaderboard_scores(self, client: FlaskClient):
        """Scénario : consulter le classement des scores."""
        rv = client.get("/api/leaderboard/score")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        # Max 10 résultats
        assert len(data) <= 10

    def test_leaderboard_users(self, client: FlaskClient):
        """Scénario : consulter le classement des joueurs."""
        rv = client.get("/api/leaderboard/users")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        assert len(data) <= 10

    def test_leaderboard_structure(self, client: FlaskClient, registered_user):
        """Scénario : vérifier la structure des données du leaderboard après soumission."""
        username, _ = registered_user
        # Soumettre un score pour avoir des données
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 150,
                "stage": 2,
                "timer": 30,
                "state": "game_over",
            },
        )
        rv = client.get("/api/leaderboard/score")
        assert rv.status_code == 200
        data = rv.get_json()
        if data:
            entry = data[0]
            assert "rank" in entry
            assert "username" in entry
            assert "score" in entry
            assert "stage" in entry

    def test_consulter_rapports(self, client: FlaskClient):
        """Scénario : consulter les signalements publics."""
        rv = client.get("/api/report")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "reports" in data

    def test_tous_les_scores(self, client: FlaskClient):
        """Scénario : consulter tous les highscores triés."""
        rv = client.get("/api/score")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)


class TestVisitePagesAuthentifiees:
    """Tests de navigation sur les pages nécessitant une connexion."""

    def test_consulter_ses_sessions(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur connecté consulte ses sessions de jeu."""
        username, _, token = logged_in_user
        rv = client.get(
            f"/api/user/sessions/{username}",
            headers={
                "X-Session-User": username,
                "X-Session-Token": token,
            },
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)

    def test_consulter_ses_stats(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur connecté consulte ses statistiques."""
        username, _, token = logged_in_user
        rv = client.get(
            f"/api/user/stats/{username}",
            headers={
                "X-Session-User": username,
                "X-Session-Token": token,
            },
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert "totalGames" in data
        assert "bestScore" in data
        assert "averageScore" in data
        assert data["totalGames"] == 0

    def test_consulter_son_xp(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur connecté vérifie son XP."""
        username, _, _ = logged_in_user
        rv = client.get(f"/api/user/xp/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "xp" in data
        assert "level" in data
        assert data["xp"] == 0
        assert data["level"] == 1

    def test_consulter_sa_langue(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur consulte sa langue configurée."""
        username, _, _ = logged_in_user
        rv = client.get(f"/api/user/language/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["language"] == "fr"

    def test_consulter_historique_xp_vide(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : un nouvel utilisateur consulte son historique XP vide."""
        username, _, _ = logged_in_user
        rv = client.get(f"/api/user/xp/history/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_verifier_statut_admin(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur normal vérifie s'il est admin."""
        username, _, _ = logged_in_user
        rv = client.get(
            "/api/user/is-admin",
            headers={"X-Admin-User": username},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["is_admin"] is False

    def test_verifier_admin_check(self, client: FlaskClient, logged_in_user):
        """Scénario : vérifier le statut admin via l'endpoint public."""
        username, _, _ = logged_in_user
        rv = client.get(f"/api/admin/check/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["isAdmin"] is False

    def test_admin_check_utilisateur_inexistant(self, client: FlaskClient):
        """Scénario : vérifier admin pour un utilisateur inexistant."""
        rv = client.get(f"/api/admin/check/inexistant_{uuid.uuid4().hex[:6]}")
        assert rv.status_code == 200
        assert rv.get_json()["isAdmin"] is False

    def test_is_admin_sans_header(self, client: FlaskClient):
        """Scénario : appel is-admin sans header → 401."""
        rv = client.get("/api/user/is-admin")
        assert rv.status_code == 401

    def test_is_admin_user_inexistant(self, client: FlaskClient):
        """Scénario : appel is-admin avec un user inexistant."""
        rv = client.get(
            "/api/user/is-admin",
            headers={"X-Admin-User": f"ghost_{uuid.uuid4().hex[:6]}"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["is_admin"] is False
