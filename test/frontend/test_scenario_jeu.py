"""Scénario frontend : Partie de jeu (solo et multi).

Simule le déroulement complet d'une partie de jeu depuis le lobby
jusqu'au game over, incluant la soumission du score et les
classements.
"""

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioPartieJeu:
    """Tests du flux complet d'une partie de jeu."""

    def test_partie_solo_complete(self, client: FlaskClient, logged_in_user):
        """Scénario : le joueur lance une partie solo et perd."""
        username, _, token = logged_in_user
        # Soumettre un input de jeu
        rv = client.post(
            "/api/game/input",
            json={"username": username, "input": "jump"},
        )
        assert rv.status_code == 200
        # Game over — soumettre le score
        rv = client.post(
            "/api/score",
            json={
                "username": username,
                "score": 350,
                "stage": 4,
                "timer": 60,
                "state": "game_over",
            },
        )
        assert rv.status_code == 200
        # Vérifier le highscore
        rv = client.get(f"/api/score/{username}")
        assert rv.status_code == 200
        assert rv.get_json()["highScore"] == 350

    def test_plusieurs_parties_highscore(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : plusieurs parties, seul le meilleur score est gardé."""
        username, _, _ = logged_in_user
        # Partie 1 — score 100
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 100,
                "stage": 1,
                "timer": 15,
                "state": "game_over",
            },
        )
        # Partie 2 — score 500 (meilleur)
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 500,
                "stage": 5,
                "timer": 90,
                "state": "game_over",
            },
        )
        # Partie 3 — score 200 (moins bon que le highscore)
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 200,
                "stage": 2,
                "timer": 30,
                "state": "game_over",
            },
        )
        # Le highscore reste 500
        rv = client.get(f"/api/score/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["highScore"] == 500
        assert data["stage"] == 5

    def test_partie_solo_avec_recompense_xp(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : après une partie, le frontend attribue de l'XP."""
        username, _, _ = logged_in_user
        # Partie
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 250,
                "stage": 3,
                "timer": 45,
                "state": "game_over",
            },
        )
        # Récompense XP (10 XP par stage)
        rv = client.post("/api/user/xp", json={"username": username, "xp": 30})
        assert rv.status_code == 200
        assert rv.get_json()["xp"] == 30

    def test_sessions_de_jeu_enregistrees(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : vérifier que chaque partie est stockée individuellement."""
        username, _, _ = logged_in_user
        # 3 parties
        for i in range(3):
            client.post(
                "/api/score",
                json={
                    "username": username,
                    "score": (i + 1) * 100,
                    "stage": i + 1,
                    "timer": (i + 1) * 10,
                    "state": "game_over",
                },
            )
        # Vérifier les sessions
        rv = client.get(f"/api/user/sessions/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert len(data) == 3

    def test_stats_joueur_apres_parties(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : les statistiques sont à jour après plusieurs parties."""
        username, _, _ = logged_in_user
        scores = [100, 200, 300]
        for s in scores:
            client.post(
                "/api/score",
                json={
                    "username": username,
                    "score": s,
                    "stage": 1,
                    "timer": 20,
                    "state": "game_over",
                },
            )
        rv = client.get(f"/api/user/stats/{username}")
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["totalGames"] == 3
        assert data["bestScore"] == 300
        assert data["totalScore"] == 600
        assert round(data["averageScore"]) == 200


class TestScenarioLobbyMultijoueur:
    """Tests du lobby multijoueur."""

    def test_rejoindre_lobby(self, client: FlaskClient, logged_in_user):
        """Scénario : le joueur rejoint le lobby."""
        username, _, _ = logged_in_user
        rv = client.post("/api/game/lobby", json={"username": username})
        assert rv.status_code == 200

    def test_compter_joueurs_lobby(self, client: FlaskClient):
        """Scénario : vérifier le nombre de joueurs dans le lobby."""
        rv = client.get("/api/game/lobby/players")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "count" in data

    def test_rejoindre_lobby_invalide(self, client: FlaskClient):
        """Scénario : tentative de rejoindre le lobby sans username."""
        rv = client.post("/api/game/lobby", json={})
        assert rv.status_code == 400

    def test_input_jeu_invalide(self, client: FlaskClient):
        """Scénario : envoi d'un input de jeu invalide."""
        rv = client.post("/api/game/input", json={})
        assert rv.status_code == 400

    def test_input_jeu_stocke(self, client: FlaskClient, logged_in_user):
        """Scénario : un input de jeu est correctement stocké."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/game/input",
            json={"username": username, "input": "jump"},
        )
        assert rv.status_code == 200


class TestScenarioClassementApresJeu:
    """Tests du classement après une partie."""

    def test_apparaitre_dans_le_classement(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : après une partie, le joueur apparaît dans le classement."""
        username, _, _ = logged_in_user
        # Partie avec un bon score
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 9999,
                "stage": 10,
                "timer": 180,
                "state": "game_over",
            },
        )
        # Vérifier le leaderboard
        rv = client.get("/api/leaderboard/score")
        assert rv.status_code == 200
        data = rv.get_json()
        usernames = [e["username"] for e in data]
        assert username in usernames

    def test_classement_users_apres_jeu(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le joueur apparaît dans le classement des highscores."""
        username, _, _ = logged_in_user
        client.post(
            "/api/score",
            json={
                "username": username,
                "score": 8888,
                "stage": 8,
                "timer": 150,
                "state": "game_over",
            },
        )
        rv = client.get("/api/leaderboard/users")
        assert rv.status_code == 200
        data = rv.get_json()
        usernames = [e["username"] for e in data]
        assert username in usernames

    def test_classement_trie_par_score_desc(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : le classement est trié du meilleur au moins bon score."""
        username, _, _ = logged_in_user
        # Plusieurs parties avec scores variés
        for s in [50, 500, 200]:
            client.post(
                "/api/score",
                json={
                    "username": username,
                    "score": s,
                    "stage": 1,
                    "timer": 10,
                    "state": "game_over",
                },
            )
        rv = client.get("/api/leaderboard/score")
        data = rv.get_json()
        scores = [e["score"] for e in data]
        assert scores == sorted(scores, reverse=True)
