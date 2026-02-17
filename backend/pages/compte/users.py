"""User-centric endpoints (profiles, sessions, XP)."""

from typing import List

from core import db, utils
from flask import Blueprint, request

from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint("users", __name__)


@bp.route("/api/user/sessions/<username>", methods=["GET"])
@utils.handle_db_errors
def get_user_sessions(username: str):
    username = username.strip()
    rows = db.query_fetchall(
        "SELECT id, score, stage, timer, state, playedAt FROM game_sessions WHERE "
        "username = %s ORDER BY score DESC",
        (username,),
    )

    result: List[dict[str, int | float | str]] = [
        {
            "username": username,
            "id": int(r[0]),
            "score": int(r[1]),
            "stage": int(r[2] or 0),
            "timer": int(r[3] or 0),
            "state": str(r[4]),
            "playedAt": r[5],
        }
        for r in rows
    ]
    return utils.make_response(result)


@bp.route("/api/user/stats/<username>", methods=["GET"])
@utils.handle_db_errors
def get_user_stats(username: str):
    username = username.strip()
    row = db.query_fetchone(
        """
        SELECT
            COUNT(*) as total_games,
            SUM(timer) as total_playtime,
            SUM(score) as total_score,
            AVG(score) as avg_score,
            AVG(stage) as avg_stage,
            MAX(score) as best_score,
            MAX(stage) as highest_stage,
            AVG(timer) as avg_playtime
        FROM game_sessions
        WHERE username = %s
        """,
        (username,),
    )

    if not row or row[0] == 0:
        return utils.make_response(
            {
                "totalGames": 0,
                "totalPlayTime": 0,
                "totalScore": 0,
                "averageScore": 0,
                "averageStage": 0,
                "bestScore": 0,
                "highestStage": 0,
                "averagePlayTime": 0,
            }
        )

    return utils.make_response(
        {
            "totalGames": int(row[0]),
            "totalPlayTime": int(row[1] or 0),
            "totalScore": int(row[2] or 0),
            "averageScore": float(row[3] or 0),
            "averageStage": float(row[4] or 0),
            "bestScore": int(row[5] or 0),
            "highestStage": int(row[6] or 0),
            "averagePlayTime": float(row[7] or 0),
        }
    )


@bp.route("/api/user/language/<username>", methods=["GET"])
@utils.handle_db_errors
def get_user_language(username: str):
    username = username.strip()
    row = db.query_fetchone(
        "SELECT language FROM users WHERE username = %s", (username,)
    )
    return utils.make_response({"language": row[0] if row else "fr"})


@bp.route("/api/user/xp/<username>", methods=["GET"])
@utils.handle_db_errors
def get_user_xp(username: str):
    username = username.strip()
    row = db.query_fetchone(
        "SELECT xp, level FROM user_profiles WHERE username = %s", (username,)
    )
    if not row:
        return utils.make_response({"xp": 0, "level": 1})
    return utils.make_response(
        {"xp": int(row[0] or 0), "level": int(row[1] or 1)}
    )


@bp.route("/api/user/xp/history/<username>")
@utils.handle_db_errors
def get_user_xp_history(username: str):
    username = username.strip()
    limit_str = request.args.get("limit", "50")
    try:
        limit = int(limit_str)
    except (ValueError, TypeError):
        limit = 50

    rows = db.query_fetchall(
        "SELECT xp, level, created_at FROM user_xp_history WHERE username = "
        "%s ORDER BY created_at ASC LIMIT %s",
        (username, limit),
    )
    result: List[dict[str, int | str]] = [
        {
            "xp": int(r[0] or 0),
            "level": int(r[1] or 1),
            "createdAt": str(r[2]),
        }
        for r in rows
    ]
    return utils.make_response(result)


@bp.route("/api/user/xp", methods=["POST", "OPTIONS"])
@utils.handle_db_errors
def add_user_xp():
    if request.method == "OPTIONS":
        return utils.make_response({}, 200)

    data = request.get_json()
    if not data or "username" not in data or "xp" not in data:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and xp required",
            },
            400,
        )

    username = str(data["username"]).strip()
    try:
        delta = int(data["xp"])
    except (ValueError, TypeError):
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "xp must be an integer",
            },
            400,
        )

    if not username:
        return utils.make_response(
            {"error": utils.BAD_REQUEST, "message": "username required"}, 400
        )

    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT xp FROM user_profiles WHERE username = %s", (username,)
        )
        row = cur.fetchone()
        if not row:
            new_xp = max(0, delta)
            level = new_xp // 100 + 1
            cur.execute(
                "INSERT INTO user_profiles (username, xp, level) "
                "VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
            cur.execute(
                "INSERT INTO user_xp_history (username, xp, level) "
                "VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
        else:
            current = int(row[0] or 0)
            new_xp = max(0, current + delta)
            level = new_xp // 100 + 1
            cur.execute(
                "UPDATE user_profiles SET xp = %s, level = %s "
                "WHERE username = %s",
                (new_xp, level, username),
            )
            cur.execute(
                "INSERT INTO user_xp_history (username, xp, level) "
                "VALUES (%s, %s, %s)",
                (username, new_xp, level),
            )
        conn.commit()
        return utils.make_response(
            {"username": username, "xp": new_xp, "level": level}
        )


@bp.route("/api/user/language", methods=["POST"])
@utils.handle_db_errors
def set_user_language():
    data = request.get_json(force=True)
    username = data.get("username", "").strip()
    language = data.get("language", "fr").strip()

    if not username:
        return utils.make_response({"error": "username required"}, 400)

    db.exec_commit(
        "UPDATE users SET language = %s WHERE username = %s",
        (language, username),
    )
    return utils.make_response({"language": language})


@bp.route("/api/user/delete-user/<username>", methods=["DELETE", "POST"])
@utils.handle_db_errors
def delete_user(username: str):
    if username.lower() == "admin":
        return utils.make_response(
            {"error": "forbidden", "message": "cannot delete admin user"},
            403,
        )

    db.exec_commit("DELETE FROM users WHERE username = %s", (username,))
    return utils.make_response({"ok": True})


@bp.route("/api/user/reset-sessions/<username>", methods=["POST"])
@utils.handle_db_errors
def reset_user_sessions(username: str):
    username = username.strip()
    db.exec_commit(
        "DELETE FROM game_sessions WHERE username = %s", (username,)
    )
    db.exec_commit("DELETE FROM highscores WHERE username = %s", (username,))
    return utils.make_response({"ok": True})


@bp.route("/api/user/is-admin", methods=["GET"])
@utils.handle_db_errors
def is_admin_user():
    user = request.headers.get("X-Admin-User")
    if not user:
        return utils.make_response({"error": "unauthorized"}, 401)

    row = db.query_fetchone(
        "SELECT is_admin FROM users WHERE username = %s", (user,)
    )
    if not row:
        return utils.make_response({"is_admin": False})

    return utils.make_response({"is_admin": bool(row[0])})


@bp.route("/api/user/resetPassword", methods=["POST"])
@utils.handle_db_errors
def reset_password():
    """Reset password using username (public endpoint, auth required)"""
    data = request.get_json()
    if not data:
        return utils.make_response({"error": "invalid_request"}, 400)

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    new_password = data.get("new_password", "").strip()

    if not username or not new_password:
        return utils.make_response(
            {
                "error": "missing_fields",
                "message": "username and new_password required",
            },
            400,
        )

    if len(new_password) < 4:
        return utils.make_response(
            {
                "error": "weak_password",
                "message": "password must be at least 4 characters",
            },
            400,
        )

    # Check if user exists and password is valid
    row = db.query_fetchone(
        """SELECT username, password FROM users WHERE username = %s""",
        (username,)
    )

    if not check_password_hash(row[1],password):
        return utils.make_response(
            {
                "error": "invalid_password",
                "message": "Invalid password",
            },
            400,
        )

    # Update password
    hashed_pw = generate_password_hash(new_password)
    db.exec_commit(
        "UPDATE users SET password = %s WHERE username = %s",
        (hashed_pw, username),
    )

    return utils.make_response(
        {"ok": True, "message": "Password reset successfully"}
    )

@bp.route("/api/user/resetUsername", methods=["POST"])
@utils.handle_db_errors
def reset_username():
    """Reset username using password (public endpoint, auth required)"""
    data = request.get_json()
    if not data:
        return utils.make_response({"error": "invalid_request"}, 400)

    username = data.get("username", "").strip()
    new_username = data.get("new_username", "").strip()
    password = data.get("password", "").strip()

    if not username or not new_username or not password:
        return utils.make_response(
            {
                "error": "missing_fields",
                "message": "username, new_username and new_password required",
            },
            400,
        )

    # Check if user exists and password is valid
    row = db.query_fetchone(
        """SELECT username, password FROM users WHERE username = %s""",
        (username,)
    )

    if not check_password_hash(row[1],password):
        return utils.make_response(
            {
                "error": "invalid_password",
                "message": "Invalid password",
            },
            400,
        )

    # Check if user exists and password is valid
    row = db.query_fetchone(
        """SELECT username FROM users WHERE username = %s""",
        (new_username,)
    )

    if row:
        return utils.make_response(
            {
                "error": "user_already_exists",
                "message": "Username already exists",
            },
            400,
        )

    # Update username
    db.exec_commit(
        "UPDATE users SET username = %s WHERE username = %s",
        (new_username, username),
    )

    return utils.make_response(
        {"ok": True, "message": "Username reset successfully"}
    )
