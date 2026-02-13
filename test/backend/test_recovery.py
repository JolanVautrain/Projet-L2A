"""Tests pour les endpoints de code de récupération et reset password (auth.py)."""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def _register_user(client, username):
    """Helper : inscrit un utilisateur."""
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )


def test_generate_recovery_code(client: FlaskClient, cleanup_user: str):
    """Génération d'un code de récupération."""
    _register_user(client, cleanup_user)
    rv = client.post(
        "/api/user/generate-recovery-code",
        headers={"X-Admin-User": cleanup_user},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert "recovery_code" in data
    assert len(data["recovery_code"]) > 10
    assert "message" in data


def test_generate_recovery_code_unauthorized(client: FlaskClient):
    """Génération sans header X-Admin-User → 401."""
    rv = client.post("/api/user/generate-recovery-code")
    assert rv.status_code == 401


def test_get_recovery_codes_count(client: FlaskClient, cleanup_user: str):
    """Compter les codes de récupération disponibles."""
    _register_user(client, cleanup_user)
    # Générer 2 codes (le 2ème invalide le 1er)
    client.post(
        "/api/user/generate-recovery-code",
        headers={"X-Admin-User": cleanup_user},
    )
    client.post(
        "/api/user/generate-recovery-code",
        headers={"X-Admin-User": cleanup_user},
    )
    rv = client.get(
        "/api/user/get-recovery-codes",
        headers={"X-Admin-User": cleanup_user},
    )
    assert rv.status_code == 200
    data = rv.get_json()
    assert data["total"] >= 2
    assert data["available"] == 1  # Les anciens sont marqués used


def test_get_recovery_codes_unauthorized(client: FlaskClient):
    """Consulter les codes sans auth → 401."""
    rv = client.get("/api/user/get-recovery-codes")
    assert rv.status_code == 401


def test_reset_password_with_valid_code(
    client: FlaskClient, cleanup_user: str
):
    """Reset de mot de passe avec un code valide."""
    _register_user(client, cleanup_user)
    # Générer un code
    rv = client.post(
        "/api/user/generate-recovery-code",
        headers={"X-Admin-User": cleanup_user},
    )
    code = rv.get_json()["recovery_code"]
    # Reset le mot de passe
    new_pw = f"new_{uuid.uuid4().hex[:8]}"
    rv = client.post(
        "/api/auth/reset-password-with-code",
        json={
            "username": cleanup_user,
            "recovery_code": code,
            "new_password": new_pw,
        },
    )
    assert rv.status_code == 200
    assert rv.get_json()["ok"] is True
    # Vérifier qu'on peut se connecter avec le nouveau mot de passe
    rv = client.post(
        "/api/login",
        json={"username": cleanup_user, "password": new_pw},
    )
    assert rv.get_json()["passwordIsCorrect"] is True


def test_reset_password_with_invalid_code(
    client: FlaskClient, cleanup_user: str
):
    """Reset avec un mauvais code → 400."""
    _register_user(client, cleanup_user)
    rv = client.post(
        "/api/auth/reset-password-with-code",
        json={
            "username": cleanup_user,
            "recovery_code": "faux_code_xyz",
            "new_password": "new_password_123",
        },
    )
    assert rv.status_code == 400
    assert rv.get_json()["error"] == "invalid_code"


def test_reset_password_code_used_twice(
    client: FlaskClient, cleanup_user: str
):
    """Un code utilisé une fois ne peut pas être réutilisé."""
    _register_user(client, cleanup_user)
    rv = client.post(
        "/api/user/generate-recovery-code",
        headers={"X-Admin-User": cleanup_user},
    )
    code = rv.get_json()["recovery_code"]
    # Première utilisation
    client.post(
        "/api/auth/reset-password-with-code",
        json={
            "username": cleanup_user,
            "recovery_code": code,
            "new_password": "premier_mdp_1234",
        },
    )
    # Deuxième utilisation
    rv = client.post(
        "/api/auth/reset-password-with-code",
        json={
            "username": cleanup_user,
            "recovery_code": code,
            "new_password": "second_mdp_5678",
        },
    )
    assert rv.status_code == 400
    assert rv.get_json()["error"] == "invalid_code"


def test_reset_password_missing_fields(client: FlaskClient):
    """Reset mot de passe avec champs manquants → 400."""
    rv = client.post(
        "/api/auth/reset-password-with-code",
        json={"username": "test"},
    )
    assert rv.status_code == 400


def test_reset_password_weak_password(client: FlaskClient, cleanup_user: str):
    """Reset avec un mot de passe trop court → 400."""
    _register_user(client, cleanup_user)
    rv = client.post(
        "/api/auth/reset-password-with-code",
        json={
            "username": cleanup_user,
            "recovery_code": "some_code",
            "new_password": "ab",
        },
    )
    assert rv.status_code == 400
    assert rv.get_json()["error"] == "weak_password"


def test_reset_password_no_body(client: FlaskClient):
    """Reset mot de passe sans corps JSON → 400."""
    rv = client.post(
        "/api/auth/reset-password-with-code",
        content_type="application/json",
        data="",
    )
    assert rv.status_code == 400
