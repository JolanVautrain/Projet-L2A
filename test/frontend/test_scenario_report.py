"""Scénario frontend : Signalement et report.

Simule le parcours d'un utilisateur qui signale un bug ou un
comportement inapproprié via le système de report.
"""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioReport:
    """Tests du système de signalement."""

    def test_signaler_un_bug(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur signale un bug."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/report",
            json={
                "username": username,
                "issue": "Le jeu freeze quand je saute trop vite.",
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["success"] is True

    def test_signaler_comportement(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur signale un autre joueur."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/report",
            json={
                "username": username,
                "issue": "Le joueur 'cheater42' utilise un bot.",
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["success"] is True

    def test_signaler_champs_manquants(self, client: FlaskClient):
        """Scénario : signalement avec des champs manquants."""
        rv = client.post("/api/report", json={"username": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/report", json={"issue": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/report", json={})
        assert rv.status_code == 400

    def test_consulter_signalements(self, client: FlaskClient, logged_in_user):
        """Scénario : l'admin consulte la liste des signalements."""
        username, _, _ = logged_in_user
        # Créer un signalement
        client.post(
            "/api/report",
            json={
                "username": username,
                "issue": "Bug sur la page boutique",
            },
        )
        # Consulter
        rv = client.get("/api/report")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "reports" in data
        assert len(data["reports"]) >= 1

    def test_structure_signalement(self, client: FlaskClient, logged_in_user):
        """Scénario : vérifier la structure d'un signalement retourné."""
        username, _, _ = logged_in_user
        client.post(
            "/api/report",
            json={"username": username, "issue": "Test structure"},
        )
        rv = client.get("/api/report")
        data = rv.get_json()
        if data["reports"]:
            report = data["reports"][-1]
            assert "username" in report
            assert "issue" in report

    def test_signalements_multiples(self, client: FlaskClient, logged_in_user):
        """Scénario : un même utilisateur fait plusieurs signalements."""
        username, _, _ = logged_in_user
        for i in range(3):
            rv = client.post(
                "/api/report",
                json={"username": username, "issue": f"Signalement #{i + 1}"},
            )
            assert rv.status_code == 200
