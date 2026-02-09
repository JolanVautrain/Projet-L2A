"""Authentication endpoints."""

import hashlib
import secrets
from datetime import datetime

import psycopg2  # type: ignore
from core import db, utils
from flask import Blueprint, request
from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint("auth", __name__)


@bp.route("/api/login", methods=["POST"])
@utils.handle_db_errors
def check_login():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return utils.make_response(
            {
                "error": utils.INTERNAL_SERVER_ERROR,
                "message": "An unexpected error occurred.",
            },
            400,
        )

    username = data["username"].strip()
    password = data["password"].strip()
    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT username, password, banned_until, ban_reason FROM users WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        if not row:
            return utils.make_response(
                {"userExist": False, "passwordIsCorrect": False}
            )
        stored_username, stored_password, banned_until, ban_reason = row

        # Check if user is banned
        if banned_until is not None:
            # Check if ban is still active
            if isinstance(banned_until, str):
                banned_until = datetime.fromisoformat(banned_until)

            if datetime.now(banned_until.tzinfo) < banned_until or (
                isinstance(banned_until, datetime)
                and banned_until.tzinfo is None
                and datetime.now() < banned_until
            ):
                # User is still banned
                return utils.make_response(
                    {
                        "userExist": True,
                        "passwordIsCorrect": False,
                        "banned": True,
                        "ban_reason": ban_reason or "No reason provided",
                        "banned_until": (
                            banned_until.isoformat()
                            if hasattr(banned_until, "isoformat")
                            else str(banned_until)
                        ),
                    }
                )
            else:
                # Ban has expired, remove it
                cur.execute(
                    "UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE username = %s",
                    (username,),
                )
                conn.commit()

        if not check_password_hash(stored_password, password):
            return utils.make_response(
                {"userExist": True, "passwordIsCorrect": False}
            )

        cur.execute(
            "SELECT session_token, last_seen FROM user_sessions WHERE username = %s",
            (username,),
        )
        session_row = cur.fetchone()
        if session_row and utils.is_session_active(session_row[1]):
            return utils.make_response(
                {
                    "userExist": True,
                    "passwordIsCorrect": True,
                    "alreadyLoggedIn": True,
                }
            )

        session_token = secrets.token_urlsafe(32)
        if session_row:
            cur.execute(
                "UPDATE user_sessions SET session_token = %s, last_seen = CURRENT_TIMESTAMP WHERE username = %s",
                (session_token, username),
            )
        else:
            cur.execute(
                "INSERT INTO user_sessions (username, session_token) VALUES (%s, %s)",
                (username, session_token),
            )
        conn.commit()
        return utils.make_response(
            {
                "userExist": True,
                "passwordIsCorrect": True,
                "username": stored_username,
                "session_token": session_token,
            }
        )


@bp.route("/api/register", methods=["POST"])
@utils.handle_db_errors
def register_user():
    data = request.get_json()
    if not data or "username" not in data or "password" not in data:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and password required",
            },
            400,
        )
    username = str(data["username"]).strip()
    password = generate_password_hash(str(data["password"]))
    language = str(data.get("language", "fr")).strip() or "fr"

    if len(username) > 100:
        return utils.make_response(
            {"success": False, "message": "username too long"}, 400
        )
    if len(language) > 10:
        return utils.make_response(
            {"success": False, "message": "language too long"}, 400
        )
    if not username or not password:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and password required",
            },
            400,
        )
    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT username FROM users WHERE username = %s", (username,)
        )
        if cur.fetchone():
            return utils.make_response(
                {"success": False, "message": "user already exists"}, 409
            )
        try:
            cur.execute(
                "INSERT INTO users (username, password, language) VALUES (%s, %s, %s)",
                (username, password, language),
            )
            conn.commit()
            return utils.make_response({"success": True})
        except psycopg2.IntegrityError:
            # Concurrent insertion or constraint violation -> user exists
            conn.rollback()
            return utils.make_response(
                {"success": False, "message": "user already exists"}, 409
            )


@bp.route("/api/logout", methods=["POST"])
@utils.handle_db_errors
def logout_user():
    data = request.get_json(silent=True) or {}
    username = data.get("username") or request.headers.get("X-Session-User")
    token = data.get("session_token") or request.headers.get("X-Session-Token")

    if not username or not token:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and session_token required",
            },
            400,
        )

    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "DELETE FROM user_sessions WHERE username = %s AND session_token = %s",
            (username, token),
        )
        conn.commit()

    return utils.make_response({"ok": True})


@bp.route("/api/session/ping", methods=["POST", "GET"])
@utils.handle_db_errors
def ping_session():
    return utils.make_response({"ok": True})


@bp.route("/api/user/generate-recovery-code", methods=["POST"])
@utils.handle_db_errors
def generate_recovery_code():
    """Generate a new recovery code for logged-in user (requires X-Admin-User header with username)"""
    user = request.headers.get("X-Admin-User")
    if not user:
        return utils.make_response({"error": "unauthorized"}, 401)

    # Mark all previous codes as used to keep only one active
    db.exec_commit(
        "UPDATE recovery_codes SET used = true WHERE username = %s AND used = false",
        (user,),
    )

    # Generate random code
    code = secrets.token_urlsafe(24)  # 32 bytes -> ~32 chars
    code_hash = hashlib.sha256(code.encode()).hexdigest()

    # Store in database
    db.exec_commit(
        """INSERT INTO recovery_codes (username, code_hash)
           VALUES (%s, %s)""",
        (user, code_hash),
    )

    return utils.make_response(
        {
            "recovery_code": code,
            "message": "Save this code in a safe place. It can only be used once.",
        }
    )


@bp.route("/api/user/get-recovery-codes", methods=["GET"])
@utils.handle_db_errors
def get_recovery_codes():
    """Get count and status of recovery codes for logged-in user"""
    user = request.headers.get("X-Admin-User")
    if not user:
        return utils.make_response({"error": "unauthorized"}, 401)

    rows = db.query_fetchall(
        "SELECT COUNT(*) as total, SUM(CASE WHEN used=false THEN 1 ELSE 0 END) as available FROM recovery_codes WHERE username = %s",
        (user,),
    )
    total, available = rows[0] if rows else (0, 0)
    return utils.make_response(
        {"total": int(total or 0), "available": int(available or 0)}
    )


@bp.route("/api/auth/reset-password-with-code", methods=["POST"])
@utils.handle_db_errors
def reset_password_with_code():
    """Reset password using username + recovery code (public endpoint, no auth required)"""
    data = request.get_json()
    if not data:
        return utils.make_response({"error": "invalid_request"}, 400)

    username = data.get("username", "").strip()
    code = data.get("recovery_code", "").strip()
    new_password = data.get("new_password", "").strip()

    if not username or not code or not new_password:
        return utils.make_response(
            {
                "error": "missing_fields",
                "message": "username, recovery_code, and new_password required",
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

    code_hash = hashlib.sha256(code.encode()).hexdigest()

    # Check if user exists and code is valid
    row = db.query_fetchone(
        """SELECT rc.id FROM recovery_codes rc
           JOIN users u ON rc.username = u.username
           WHERE u.username = %s AND rc.code_hash = %s AND rc.used = false
           LIMIT 1""",
        (username, code_hash),
    )

    if not row:
        return utils.make_response(
            {
                "error": "invalid_code",
                "message": "Invalid or already used recovery code",
            },
            400,
        )

    code_id = row[0]

    # Update password
    hashed_pw = generate_password_hash(new_password)
    db.exec_commit(
        "UPDATE users SET password = %s WHERE username = %s",
        (hashed_pw, username),
    )

    # Mark code as used
    db.exec_commit(
        "UPDATE recovery_codes SET used = true WHERE id = %s",
        (code_id,),
    )

    return utils.make_response(
        {"ok": True, "message": "Password reset successfully"}
    )
