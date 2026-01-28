"""Tests pour les utilitaires bas-niveau de la DB dans `backend/api/db.py`."""

import uuid

from backend.api import db


def test_load_default_users_contains_admin():
    """`load_default_users` doit lire `backend/db_init.json` et inclure
    l'utilisateur admin."""
    users = db.load_default_users()
    assert any(u[0] == "admin" for u in users)
    # chaque entrée est (username, hashed_password, language)
    assert all(len(u) == 3 for u in users)


def test_exec_and_query_helpers_roundtrip():
    """Test du comportement de `exec_commit`, `query_fetchone` et
    `query_fetchall`."""
    # créer un utilisateur de test unique pour éviter les collisions
    username = f"dbutil_{uuid.uuid4().hex[:8]}"

    # Insérer l'utilisateur directement via l'utilitaire
    db.exec_commit(
        "INSERT INTO users (username, password, language) VALUES (%s, %s, %s)",
        (username, "pwd", "fr"),
    )

    # Interroger pour vérifier
    row = db.query_fetchone(
        "SELECT username, language FROM users WHERE username = %s", (username,)
    )
    assert row is not None
    assert row[0] == username
    assert row[1] == "fr"

    # `query_fetchall` retourne une liste
    rows = db.query_fetchall(
        "SELECT username FROM users WHERE username = %s", (username,)
    )
    assert isinstance(rows, list)
    assert any(r[0] == username for r in rows)

    # Nettoyage
    db.exec_commit("DELETE FROM users WHERE username = %s", (username,))
