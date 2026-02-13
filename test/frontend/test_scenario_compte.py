"""Scénario frontend : Gestion du compte utilisateur.

Simule les actions qu'un utilisateur effectue sur sa page de profil :
changement de langue, suppression de compte, reset de sessions,
code de récupération, mot de passe oublié.
"""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


class TestScenarioChangementLangue:
    """Tests du changement de langue."""

    def test_changer_langue_en(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur passe en anglais."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/user/language",
            json={"username": username, "language": "en"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["language"] == "en"
        # Vérifier la persistance
        rv = client.get(f"/api/user/language/{username}")
        assert rv.get_json()["language"] == "en"

    def test_changer_langue_fr(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur repasse en français."""
        username, _, _ = logged_in_user
        # D'abord passer en anglais
        client.post(
            "/api/user/language",
            json={"username": username, "language": "en"},
        )
        # Puis revenir en français
        rv = client.post(
            "/api/user/language",
            json={"username": username, "language": "fr"},
        )
        assert rv.status_code == 200
        assert rv.get_json()["language"] == "fr"

    def test_changer_langue_sans_username(self, client: FlaskClient):
        """Scénario : changement de langue sans username."""
        rv = client.post("/api/user/language", json={"language": "en"})
        assert rv.status_code == 400

    def test_langue_utilisateur_inexistant(self, client: FlaskClient):
        """Scénario : demander la langue d'un utilisateur inexistant → défaut fr."""
        rv = client.get(f"/api/user/language/ghost_{uuid.uuid4().hex[:6]}")
        assert rv.status_code == 200
        assert rv.get_json()["language"] == "fr"


class TestScenarioSuppressionCompte:
    """Tests de la suppression de compte."""

    def test_supprimer_son_compte(self, client: FlaskClient, registered_user):
        """Scénario : un utilisateur supprime son propre compte."""
        username, _ = registered_user
        rv = client.delete(f"/api/user/delete-user/{username}")
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
        # Vérifier que le compte est supprimé (login échoue)
        rv = client.post(
            "/api/login",
            json={"username": username, "password": TEST_PASSWORD},
        )
        assert rv.get_json()["userExist"] is False

    def test_supprimer_compte_via_post(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : suppression via POST (fallback)."""
        username, _ = registered_user
        rv = client.post(f"/api/user/delete-user/{username}")
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True

    def test_supprimer_admin_interdit(self, client: FlaskClient):
        """Scénario : il est interdit de supprimer le compte admin."""
        rv = client.delete("/api/user/delete-user/admin")
        assert rv.status_code == 403

    def test_supprimer_compte_admin_via_post(self, client: FlaskClient):
        """Scénario : suppression admin via POST aussi interdite."""
        rv = client.post("/api/user/delete-user/admin")
        assert rv.status_code == 403


class TestScenarioResetSessions:
    """Tests du reset de sessions de jeu."""

    def test_reset_ses_sessions(self, client: FlaskClient, logged_in_user):
        """Scénario : un utilisateur efface son historique de parties."""
        username, _, _ = logged_in_user
        # Jouer une partie
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
        # Reset les sessions
        rv = client.post(f"/api/user/reset-sessions/{username}")
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
        # Vérifier que les sessions sont vides
        rv = client.get(f"/api/user/sessions/{username}")
        assert rv.status_code == 200
        assert rv.get_json() == []

    def test_reset_sessions_sans_parties(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : reset même sans partie préalable ne plante pas."""
        username, _, _ = logged_in_user
        rv = client.post(f"/api/user/reset-sessions/{username}")
        assert rv.status_code == 200


class TestScenarioRecoveryCode:
    """Tests du flux de code de récupération + mot de passe oublié."""

    def test_generer_code_recovery(self, client: FlaskClient, logged_in_user):
        """Scénario : l'utilisateur génère un code de récupération."""
        username, _, _ = logged_in_user
        rv = client.post(
            "/api/user/generate-recovery-code",
            headers={"X-Admin-User": username},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert "recovery_code" in data
        assert len(data["recovery_code"]) > 10

    def test_consulter_codes_recovery(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario : vérifier le nombre de codes de récupération."""
        username, _, _ = logged_in_user
        # Générer un code
        client.post(
            "/api/user/generate-recovery-code",
            headers={"X-Admin-User": username},
        )
        # Consulter
        rv = client.get(
            "/api/user/get-recovery-codes",
            headers={"X-Admin-User": username},
        )
        assert rv.status_code == 200
        data = rv.get_json()
        assert data["total"] >= 1
        assert data["available"] >= 1

    def test_recovery_code_sans_auth(self, client: FlaskClient):
        """Scénario : tentative de génération sans authentification."""
        rv = client.post("/api/user/generate-recovery-code")
        assert rv.status_code == 401

    def test_get_recovery_codes_sans_auth(self, client: FlaskClient):
        """Scénario : consulter les codes sans authentification."""
        rv = client.get("/api/user/get-recovery-codes")
        assert rv.status_code == 401

    def test_mot_de_passe_oublie_complet(
        self, client: FlaskClient, logged_in_user
    ):
        """Scénario complet : générer code → reset mot de passe → connexion."""
        username, _, _ = logged_in_user
        # 1. Générer un code de récupération
        rv = client.post(
            "/api/user/generate-recovery-code",
            headers={"X-Admin-User": username},
        )
        code = rv.get_json()["recovery_code"]
        # 2. Utiliser le code pour réinitialiser le mot de passe
        new_password = f"new_pw_{uuid.uuid4().hex[:6]}"
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={
                "username": username,
                "recovery_code": code,
                "new_password": new_password,
            },
        )
        assert rv.status_code == 200
        assert rv.get_json()["ok"] is True
        # 3. Se connecter avec le nouveau mot de passe
        rv = client.post(
            "/api/login",
            json={"username": username, "password": new_password},
        )
        assert rv.status_code == 200
        assert rv.get_json()["passwordIsCorrect"] is True

    def test_reset_password_code_invalide(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : reset mot de passe avec un mauvais code."""
        username, _ = registered_user
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={
                "username": username,
                "recovery_code": "faux_code_12345",
                "new_password": "nouveau_mdp",
            },
        )
        assert rv.status_code == 400
        assert rv.get_json()["error"] == "invalid_code"

    def test_reset_password_champs_manquants(self, client: FlaskClient):
        """Scénario : reset mot de passe sans tous les champs."""
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={"username": "test"},
        )
        assert rv.status_code == 400

    def test_reset_password_trop_court(
        self, client: FlaskClient, registered_user
    ):
        """Scénario : le nouveau mot de passe est trop court."""
        username, _ = registered_user
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={
                "username": username,
                "recovery_code": "un_code",
                "new_password": "ab",
            },
        )
        assert rv.status_code == 400
        assert rv.get_json()["error"] == "weak_password"

    def test_reset_password_sans_body(self, client: FlaskClient):
        """Scénario : reset password sans corps JSON."""
        rv = client.post(
            "/api/auth/reset-password-with-code",
            content_type="application/json",
            data="",
        )
        assert rv.status_code == 400

    def test_code_usage_unique(self, client: FlaskClient, logged_in_user):
        """Scénario : un code de récupération ne peut être utilisé qu'une fois."""
        username, _, _ = logged_in_user
        # Générer un code
        rv = client.post(
            "/api/user/generate-recovery-code",
            headers={"X-Admin-User": username},
        )
        code = rv.get_json()["recovery_code"]
        # Première utilisation
        new_pw = f"pw1_{uuid.uuid4().hex[:6]}"
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={
                "username": username,
                "recovery_code": code,
                "new_password": new_pw,
            },
        )
        assert rv.status_code == 200
        # Deuxième utilisation → échoue
        rv = client.post(
            "/api/auth/reset-password-with-code",
            json={
                "username": username,
                "recovery_code": code,
                "new_password": "pw2_abc",
            },
        )
        assert rv.status_code == 400
        assert rv.get_json()["error"] == "invalid_code"
