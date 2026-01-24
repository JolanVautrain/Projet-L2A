"""User-centric endpoints (profiles, sessions, XP)."""

from typing import List

from flask import Blueprint, request

from . import db, utils

bp = Blueprint("users", __name__)


@bp.route("/api/user/sessions/<username>", methods=["GET"])
@utils.handle_db_errors
def get_user_sessions(username: str):
    username = username.strip()
    rows = db.query_fetchall(
        "SELECT id, score, stage, timer, playedAt FROM game_sessions WHERE "
        "username = %s ORDER BY score DESC",
        (username,),
    )

    result: List[dict[str, int | float | str]] = [
        {
            "id": int(r[0]),
            "score": int(r[1]),
            "stage": int(r[2] or 0),
            "timer": int(r[3] or 0),
            "playedAt": str(r[4]),
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