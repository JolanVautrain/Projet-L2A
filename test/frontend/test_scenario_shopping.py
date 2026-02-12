"""Scénario frontend : Boutique et achats (dark patterns éducatifs).

Simule le parcours d'un utilisateur dans la boutique, incluant
la soumission de scores qui débloquent des fonctionnalités, la
consultation de l'XP et des niveaux (gamification).
"""

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioGamification:
    """Tests du système de gamification (XP, niveaux, récompenses)."""

    def test_gain_xp_apres_jeu(self, client: FlaskClient, logged_in_user):
        """Scénario : le joueur gagne de l'XP après une partie."""
        username, _, token = logged_in_user
        # Soumettre un score
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 100,
                "stage": 1,
                "timer": 20,
                "state": "game_over",
            },
        )
        # Le frontend attribue 50 XP
        rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["xp"] == 50
        assert data["level"] == 1

    def test_level_up(self, client: FlaskClient, logged_in_user):
        """Scénario : le joueur atteint le niveau 2 avec 100 XP."""
        username, _, _ = logged_in_user
        # Ajout de 100 XP → level 2
        rv = client.post(
            "/api/user/xp", json={"username": username, "xp": 100}
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["xp"] == 100
        assert data["level"] == 2

    def test_multiple_gains_xp(self, client: FlaskClient, logged_in_user):
        """Scénario : le joueur accumule de l'XP sur plusieurs parties."""
        username, _, _ = logged_in_user
        # Partie 1 : 30 XP
        client.post("/api/user/xp", json={"username": username, "xp": 30})
        # Partie 2 : 25 XP
        client.post("/api/user/xp", json={"username": username, "xp": 25})
        # Partie 3 : 50 XP
        rv = client.post("/api/user/xp", json={"username": username, "xp": 50})
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["xp"] == 105
        assert data["level"] == 2

    def test_consulter_historique_xp(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le joueur consulte son historique d'XP."""
        username, _, _ = logged_in_user
        # Faire quelques actions
        client.post("/api/user/xp", json={"username": username, "xp": 50})
        client.post("/api/user/xp", json={"username": username, "xp": 30})
        # Consulter l'historique
        rv = client.get(f"/api/user/xp/history/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)
        assert len(data) == 2
        # Vérifier la structure
        for entry in data:
            assert "xp" in entry
            assert "level" in entry
            assert "createdAt" in entry

    def test_historique_xp_avec_limit(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le joueur limite l'historique XP retourné."""
        username, _, _ = logged_in_user
        for i in range(5):
            client.post("/api/user/xp", json={"username": username, "xp": 10})
        rv = client.get(f"/api/user/xp/history/{username}?limit=3")
        assert rv.status_code == 200
        data = rv.get_json()
        assert len(data) == 3

    def test_historique_xp_limit_invalide(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : limit invalide → fallback à 50."""
        username, _, _ = logged_in_user
        rv = client.get(f"/api/user/xp/history/{username}?limit=abc")
        assert rv.status_code == 200

    def test_perte_xp_plancher_zero(self, client: FlaskClient, logged_in_user):
        """Scénario : l'XP ne descend pas en dessous de 0."""
        username, _, _ = logged_in_user
        client.post("/api/user/xp", json={"username": username, "xp": 10})
        rv = client.post(
            "/api/user/xp", json={"username": username, "xp": -100}
        )
        assert rv.status_code == 200
        assert rv.get_json()["xp"] == 0

    def test_xp_invalide_type(self, client: FlaskClient, logged_in_user):
        """Scénario : envoi d'XP avec un type invalide."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/user/xp", json={"username": username, "xp": "abc"}
        )
        assert rv.status_code == 400

    def test_xp_champs_manquants(self, client: FlaskClient):
        """Scénario : envoi d'XP sans les champs requis."""
        rv = client.post("/api/user/xp", json={"username": "test"})
        assert rv.status_code == 400

        rv = client.post("/api/user/xp", json={"xp": 10})
        assert rv.status_code == 400

    def test_xp_username_vide(self, client: FlaskClient):
        """Scénario : envoi d'XP avec username vide."""
        rv = client.post("/api/user/xp", json={"username": "", "xp": 10})
        assert rv.status_code == 400

    def test_xp_options_preflight(self, client: FlaskClient):
        """Scénario : requête OPTIONS pour le CORS preflight de l'XP."""
        rv = client.options("/api/user/xp")
        assert rv.status_code == 200


class TestScenarioShop:
    """Tests liés aux fonctionnalités boutique (score comme monnaie virtuelle)."""

    def test_parcours_boutique_complet(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le joueur fait une partie puis vérifie son score pour la boutique."""
        username, _, _ = logged_in_user
        # Soumettre un score
        rv = client.post(
            "/api/score",
            json={
                "username": username,
                "score": 200,
                "stage": 3,
                "timer": 45,
                "state": "game_over",
            },
        )
        assert rv.status_code == 200
        # Vérifier le highscore
        rv = client.get(f"/api/score/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["highScore"] == 200

    def test_xp_gagner_apres_achat_virtuel(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le joueur gagne de l'XP comme récompense en boutique."""
        username, _, _ = logged_in_user
        # Attribution de bonus XP (simulé par le frontend après un achat)
        rv = client.post(
            "/api/user/xp", json={"username": username, "xp": 200}
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["xp"] == 200
        assert data["level"] == 3  # 200//100 + 1

    def test_stats_apres_achats(self, client: FlaskClient, logged_in_user):
        """Scénario : vérifier que les stats reflètent les parties jouées."""
        username, _, _ = logged_in_user
        # Jouer 3 parties
        for score in [100, 200, 150]:
            client.post(
                "/api/score",
                json={
                    "username": username,
                    "score": score,
                    "stage": 1,
                    "timer": 20,
                    "state": "game_over",
                },
            )
        # Vérifier les stats
        rv = client.get(f"/api/user/stats/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["totalGames"] == 3
        assert data["bestScore"] == 200
        assert data["totalScore"] == 450
