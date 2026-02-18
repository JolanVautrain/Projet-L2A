from core import db
from core import utils
from flask import Blueprint
from flask import request

bp = Blueprint("report", __name__)


@bp.route("/api/report", methods=["POST"])
@utils.handle_db_errors
def report_issue():

    data = request.get_json()
    if not data or "username" not in data or "issue" not in data:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and issue required",
            },
            400,
        )

    username = data["username"].strip()
    issue = data["issue"].strip()

    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "INSERT INTO issue_reports (username, issue) VALUES (%s, %s)",
            (username, issue),
        )
        conn.commit()

    return utils.make_response({"success": True})


@bp.route("/api/report", methods=["GET"])
@utils.handle_db_errors
def get_reports():
    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute("SELECT username, issue FROM issue_reports")
        rows = cur.fetchall()

    reports = []
    for row in rows:
        reports.append({
            "username": row[0],
            "issue": row[1]
        })

    return utils.make_response({"reports": reports})
