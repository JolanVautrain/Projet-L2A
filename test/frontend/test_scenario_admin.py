"""Scénario frontend : Administration et modération.

Simule les actions d'un administrateur : gestion des utilisateurs,
bannissement, promotion admin, visualisation du tableau de bord.
"""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioAdminGestionUtilisateurs:
    """Tests des fonctionnalités d'administration."""

    def test_lister_les_utilisateurs(self, client: FlaskClient):
        """Scénario : l'admin consulte la liste de tous les utilisateurs."""
        rv = client.get(
            "/api/admin/users",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        # L'admin devrait être dans la liste
        usernames = [u["username"] for u in data]
        assert "admin" in usernames

    def test_lister_utilisateurs_non_autorise(self, client: FlaskClient):
        """Scénario : un non-admin tente d'accéder à la liste."""
        rv = client.get(
            "/api/admin/users",
            headers={"X-Admin-User": f"noadmin_{uuid.uuid4().hex[:6]}"},
        )
        assert rv.status_code == 401

    def test_lister_utilisateurs_sans_header(self, client: FlaskClient):
        """Scénario : requête sans header d'admin."""
        rv = client.get("/api/admin/users")
        assert rv.status_code == 401

    def test_structure_utilisateur(self, client: FlaskClient):
        """Scénario : vérifier la structure de données d'un utilisateur."""
        rv = client.get(
            "/api/admin/users",
            headers={"X-Admin-User": "admin"},
        )
        data = rv.get_json()
        user = data[0]
        assert "username" in user
        assert "is_admin" in user
        assert "banned_until" in user
        assert "ban_reason" in user


class TestScenarioAdminBannissement:
    """Tests du système de bannissement."""

    def test_bannir_temporairement(self, client: FlaskClient, registered_user):
        """Scénario : l'admin bannit un joueur pour 24h."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": 24, "reason": "Triche détectée"},
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_bannir_permanent(self, client: FlaskClient, registered_user):
        """Scénario : l'admin bannit un joueur de façon permanente."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/ban-user/{username}",
            json={"reason": "Comportement abusif répété"},
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_debannir_joueur(self, client: FlaskClient, registered_user):
        """Scénario : l'admin débannit un joueur."""
        username, _ = registered_user
        # Bannir
        client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": 1, "reason": "Test"},
            headers={"X-Admin-User": "admin"},
        )
        # Débannir
        rv = client.post(
            f"/api/admin/unban-user/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_bannir_admin_interdit(self, client: FlaskClient):
        """Scénario : il est interdit de bannir le compte admin."""
        rv = client.post(
            "/api/admin/ban-user/admin",
            json={"duration_hours": 1, "reason": "Test"},
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 403

    def test_bannir_duree_invalide(self, client: FlaskClient, registered_user):
        """Scénario : bannir avec une durée invalide."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": -5, "reason": "Test"},
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 400

    def test_bannir_duree_non_entier(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : bannir avec une durée non entière."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": "abc", "reason": "Test"},
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 400

    def test_login_utilisateur_banni(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : un utilisateur banni ne peut pas se connecter."""
        username, password = registered_user
        # Bannir pour 24h
        client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": 24, "reason": "Triche"},
            headers={"X-Admin-User": "admin"},
        )
        # Tenter de se connecter
        rv = client.post(
            "/api/login",
            json={"username": username, "password": password},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data.get("banned") is True
        assert "ban_reason" in data

    def test_bannir_non_auth(self, client: FlaskClient, registered_user):
        """Scénario : un non-admin tente de bannir."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/ban-user/{username}",
            json={"duration_hours": 1, "reason": "Test"},
        )
        assert rv.status_code == 401


class TestScenarioAdminPromotion:
    """Tests de la promotion/rétrogradation admin."""

    def test_promouvoir_admin(self, client: FlaskClient, registered_user):
        """Scénario : l'admin promeut un utilisateur comme admin."""
        username, _ = registered_user
        rv = client.post(
            f"/api/admin/set-admin/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
        # Vérifier le statut
        rv = client.get(f"/api/admin/check/{username}")
        assert rv.get_json()["isAdmin"] is True

    def test_retirer_admin(self, client: FlaskClient, registered_user):
        """Scénario : l'admin retire le statut d'un autre admin."""
        username, _ = registered_user
        # Promouvoir
        client.post(
            f"/api/admin/set-admin/{username}",
            headers={"X-Admin-User": "admin"},
        )
        # Rétrograder
        rv = client.post(
            f"/api/admin/remove-admin/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
        # Vérifier
        rv = client.get(f"/api/admin/check/{username}")
        assert rv.get_json()["isAdmin"] is False

    def test_promouvoir_admin_lui_meme(self, client: FlaskClient):
        """Scénario : tenter de promouvoir 'admin' (déjà admin)."""
        rv = client.post(
            "/api/admin/set-admin/admin",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 400

    def test_retirer_admin_original_interdit(self, client: FlaskClient):
        """Scénario : il est interdit de rétrograder le compte admin original."""
        rv = client.post(
            "/api/admin/remove-admin/admin",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 403

    def test_promouvoir_non_auth(self, client: FlaskClient, registered_user):
        """Scénario : un non-admin tente de promouvoir."""
        username, _ = registered_user
        rv = client.post(f"/api/admin/set-admin/{username}")
        assert rv.status_code == 401


class TestScenarioAdminResetEtSuppression:
    """Tests du reset de scores et suppression via admin."""

    def test_admin_reset_scores(self, client: FlaskClient, registered_user):
        """Scénario : l'admin remet le highscore d'un joueur à zéro."""
        username, _ = registered_user
        # Soumettre un score
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 500,
                "stage": 5,
                "timer": 60,
                "state": "game_over",
            },
        )
        # Reset
        rv = client.post(
            f"/api/admin/reset-user/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        # Vérifier le score est à 0
        rv = client.get(f"/api/score/{username}")
        assert rv.status_code == 200
        assert rv.get_json()["highScore"] == 0

    def test_admin_reset_sessions(self, client: FlaskClient, registered_user):
        """Scénario : l'admin reset les sessions de jeu d'un joueur."""
        username, _ = registered_user
        # Jouer des parties
        for _ in range(3):
            client.post(
                "/api/score",
                json={
                    "username": username,
                    "score": 100,
                    "stage": 1,
                    "timer": 10,
                    "state": "game_over",
                },
            )
        # Reset
        rv = client.post(
            f"/api/admin/reset-sessions/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        # Vérifier
        rv = client.get(f"/api/user/sessions/{username}")
        assert len(rv.get_json()) == 0

    def test_admin_supprimer_utilisateur(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : l'admin supprime un compte utilisateur."""
        username, _ = registered_user
        rv = client.delete(
            f"/api/admin/delete-user/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_admin_supprimer_admin_interdit(self, client: FlaskClient):
        """Scénario : suppression du compte admin via admin est interdite."""
        rv = client.delete(
            "/api/admin/delete-user/admin",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 403

    def test_admin_supprimer_historique_xp(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : l'admin supprime l'historique XP d'un joueur."""
        username, _ = registered_user
        # Ajouter de l'XP
        client.post("/api/user/xp", json={"username": username, "xp": 50})
        # Supprimer l'historique
        rv = client.post(
            f"/api/admin/delete-xp-history/{username}",
            headers={"X-Admin-User": "admin"},
        )
        assert rv.status_code == 200
        # Vérifier historique vide
        rv = client.get(f"/api/user/xp/history/{username}")
        assert len(rv.get_json()) == 0

    def test_admin_reset_test_account(self, client: FlaskClient):
        """Scénario : l'admin reset le compte test."""
        rv = client.post("/api/admin/reset-test")
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
