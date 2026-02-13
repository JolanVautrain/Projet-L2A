"""Tests pour les endpoints de report (report.py)."""

import uuid

from flask.testing import FlaskClient

from .conftest import TEST_PASSWORD


def test_report_issue(client: FlaskClient, cleanup_user: str):
    """Soumettre un signalement valide."""
    client.post(
        "/api/register",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    rv = client.post(
        "/api/report",
        json={"username": cleanup_user, "issue": "Bug critique"},
    )
    assert rv.status_code == 200
    assert rv.get_json()["success"] is True


def test_report_missing_username(client: FlaskClient):
    """Signalement sans username → 400."""
    rv = client.post("/api/report", json={"issue": "Bug"})
    assert rv.status_code == 400


def test_report_missing_issue(client: FlaskClient):
    """Signalement sans issue → 400."""
    rv = client.post("/api/report", json={"username": "test"})
    assert rv.status_code == 400


def test_report_empty_body(client: FlaskClient):
    """Signalement avec corps vide → 400."""
    rv = client.post("/api/report", json={})
    assert rv.status_code == 400


def test_get_reports(client: FlaskClient):
    """Consulter la liste des signalements."""
    rv = client.get("/api/report")
    assert rv.status_code == 200
    data = rv.get_json()
    assert "reports" in data
    assert isinstance(data["reports"], list)


def test_report_appears_in_list(client: FlaskClient, cleanup_user: str):
    """Un signalement soumis apparaît dans la liste."""
    client.post(
        "/api/register",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    issue_text = f"Test issue {uuid.uuid4().hex[:6]}"
    client.post(
        "/api/report",
        json={"username": cleanup_user, "issue": issue_text},
    )
    rv = client.get("/api/report")
    data = rv.get_json()
    issues = [r["issue"] for r in data["reports"]]
    assert issue_text in issues


def test_report_structure(client: FlaskClient, cleanup_user: str):
    """Vérifier la structure d'un signalement retourné."""
    client.post(
        "/api/register",
        json={"username": cleanup_user, "password": TEST_PASSWORD},
    )
    client.post(
        "/api/report",
        json={"username": cleanup_user, "issue": "Structure test"},
    )
    rv = client.get("/api/report")
    report = rv.get_json()["reports"][-1]
    assert "username" in report
    assert "issue" in report
