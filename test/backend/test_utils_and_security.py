"""Tests pour utilitaires et sécurité (hachage de mot de passe)."""

from typing import Any

from flask.testing import FlaskClient
from werkzeug.security import check_password_hash

from backend.api import utils
from backend.tests.conftest import TEST_PASSWORD


def test_parse_optional_int():
    """Vérifie le parsing d'entiers optionnels depuis un dict."""
    assert utils.parse_optional_int({"a": "10"}, "a") == 10
    assert utils.parse_optional_int({"a": None}, "a") is None
    assert utils.parse_optional_int({}, "a") is None
    assert utils.parse_optional_int({"a": "notint"}, "a") is None


def test_require_admin_allows_options(client: FlaskClient):
    """L'endpoint admin doit accepter OPTIONS sans header admin."""
    rv = client.options("/api/admin/delete-xp-history/testuser")
    assert rv.status_code == 200


def test_register_stores_hashed_password(
    client: FlaskClient, cleanup_user: str, db_conn: Any
):
    """S'assurer que le mot de passe est stocké haché, non en clair."""
    username = cleanup_user
    client.post(
        "/api/register", json={"username": username, "password": TEST_PASSWORD}
    )

    cur = db_conn.cursor()
    cur.execute("SELECT password FROM users WHERE username = %s", (username,))
    row = cur.fetchone()
    assert row is not None
    stored = row[0]
    # pas stocké en clair
    assert stored != TEST_PASSWORD
    # check_password_hash doit valider le mot de passe
    assert check_password_hash(stored, TEST_PASSWORD)
    cur.close()
