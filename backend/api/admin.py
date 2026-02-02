"""Admin-only endpoints."""

import os

from flask import Blueprint, request

from . import db, utils

bp = Blueprint("admin", __name__)


@bp.route("/api/admin/reset-test", methods=["POST"])
@utils.handle_db_errors
def reset_test_account():
    admin_secret = os.environ.get("ADMIN_SECRET")
    header = request.headers.get("X-Admin-Token")
    if admin_secret and header != admin_secret:
        return utils.make_response({"error": "unauthorized"}, 401)

    db.exec_commit(
        """
        INSERT INTO highscores (username, high_score, stage, timer)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (username) DO UPDATE
        SET high_score = EXCLUDED.high_score,
            stage = EXCLUDED.stage,
            timer = EXCLUDED.timer
        """,
        ("admin", 0, 0, 0),
    )
    return utils.make_response({"ok": True})


@bp.route("/api/admin/delete-xp-history/<username>", methods=["OPTIONS"])
def delete_user_xp_history_options(username: str):
    _ = username
    return utils.make_response({}, 200)


@bp.route("/api/admin/delete-xp-history/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def delete_user_xp_history(username: str):
    username = username.strip()
    db.exec_commit(
        "DELETE FROM user_xp_history WHERE username = %s", (username,)
    )
    return utils.make_response({"ok": True})


@bp.route("/api/admin/users", methods=["GET"])
@utils.handle_db_errors
@utils.require_admin
def list_all_users():
    rows = db.query_fetchall(
        "SELECT username, is_admin, banned_until, ban_reason FROM users ORDER BY username"
    )
    return utils.make_response(
        [
            {
                "username": r[0],
                "is_admin": r[1] or False,
                "banned_until": r[2].isoformat() if r[2] else None,
                "ban_reason": r[3],
            }
            for r in rows
        ]
    )


@bp.route("/api/admin/reset-user/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def reset_user_scores(username: str):
    username = username.strip()
    db.exec_commit(
        """
        INSERT INTO highscores (username, high_score, stage, timer)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (username) DO UPDATE
        SET high_score = EXCLUDED.high_score,
            stage = EXCLUDED.stage,
            timer = EXCLUDED.timer
        """,
        (username, 0, 0, 0),
    )
    return utils.make_response({"ok": True})


@bp.route("/api/admin/reset-sessions/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def reset_user_sessions(username: str):
    username = username.strip()
    db.exec_commit(
        "DELETE FROM game_sessions WHERE username = %s", (username,)
    )
    db.exec_commit("DELETE FROM highscores WHERE username = %s", (username,))
    return utils.make_response({"ok": True})


@bp.route("/api/admin/delete-user/<username>", methods=["DELETE", "POST"])
@utils.handle_db_errors
@utils.require_admin
def delete_user(username: str):
    username = username.strip()
    if username.lower() == "admin":
        return utils.make_response(
            {"error": "forbidden", "message": "cannot delete admin user"},
            403,
        )
    db.exec_commit("DELETE FROM users WHERE username = %s", (username,))
    return utils.make_response({"ok": True})


@bp.route("/api/admin/set-admin/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def set_admin(username: str):
    username = username.strip()
    if username.lower() == "admin":
        return utils.make_response(
            {"error": "already_admin", "message": "user is already admin"},
            400,
        )
    db.exec_commit(
        "UPDATE users SET is_admin = true WHERE username = %s", (username,)
    )
    return utils.make_response({"ok": True})


@bp.route("/api/admin/remove-admin/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def remove_admin(username: str):
    username = username.strip()
    if username.lower() == "admin":
        return utils.make_response(
            {
                "error": "forbidden",
                "message": "cannot remove admin status from the original admin user",
            },
            403,
        )
    db.exec_commit(
        "UPDATE users SET is_admin = false WHERE username = %s", (username,)
    )
    return utils.make_response({"ok": True})


@bp.route("/api/admin/ban-user/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def ban_user(username: str):
    username = username.strip()
    if username.lower() == "admin":
        return utils.make_response(
            {"error": "forbidden", "message": "cannot ban the admin user"},
            403,
        )

    data = request.get_json() or {}
    duration_hours = data.get("duration_hours")  # None for permanent
    reason = data.get("reason", "No reason provided").strip()

    if duration_hours is not None:
        # Temporary ban
        try:
            duration_hours = int(duration_hours)
            if duration_hours <= 0:
                return utils.make_response(
                    {
                        "error": "invalid_duration",
                        "message": "duration must be positive",
                    },
                    400,
                )
        except (ValueError, TypeError):
            return utils.make_response(
                {
                    "error": "invalid_duration",
                    "message": "duration must be an integer",
                },
                400,
            )

        db.exec_commit(
            """UPDATE users 
               SET banned_until = CURRENT_TIMESTAMP + INTERVAL '%s hours',
                   ban_reason = %s
               WHERE username = %s""",
            (duration_hours, reason, username),
        )
    else:
        # Permanent ban
        db.exec_commit(
            """UPDATE users 
               SET banned_until = NULL,
                   ban_reason = %s
               WHERE username = %s""",
            (f"[PERMANENT] {reason}", username),
        )

    return utils.make_response({"ok": True})


@bp.route("/api/admin/unban-user/<username>", methods=["POST"])
@utils.handle_db_errors
@utils.require_admin
def unban_user(username: str):
    username = username.strip()
    db.exec_commit(
        """UPDATE users 
           SET banned_until = NULL,
               ban_reason = NULL
           WHERE username = %s""",
        (username,),
    )
    return utils.make_response({"ok": True})
