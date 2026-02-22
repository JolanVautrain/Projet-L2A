"""Shared utilities for API routes."""

import logging
import os
from datetime import datetime
from datetime import timedelta
from functools import wraps
from typing import Any
from typing import Callable

import psycopg2
from flask import Response
from flask import jsonify
from flask import request
from psycopg2 import OperationalError

BAD_REQUEST = "Bad Request"
DATABASE_ERROR = "Database error"
INTERNAL_SERVER_ERROR = "Internal Server Error"
SESSION_TIMEOUT_MINUTES = int(os.environ.get("SESSION_TIMEOUT_MINUTES", "60"))


def make_response(data: Any, status: int = 200) -> Response:
    resp = jsonify(data)
    resp.status_code = status
    return resp


def handle_db_errors(f: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            if request.method != "OPTIONS":
                touch_session_from_headers()
            return f(*args, **kwargs)
        except OperationalError:
            return make_response({"error": DATABASE_ERROR}, 500)
        except (psycopg2.Error, ValueError, TypeError) as err:
            logging.exception("Unexpected error in %s: %s", f.__name__, err)
            return make_response({"error": INTERNAL_SERVER_ERROR}, 500)

    return wrapper


def require_admin(f: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        user = request.headers.get("X-Admin-User")
        if not user:
            return make_response({"error": "unauthorized"}, 401)

        # Vérifier si l'utilisateur est "admin".
        if user == "admin":
            return f(*args, **kwargs)

        # Vérifier dans la base de données si l'utilisateur a is_admin = true
        try:
            from . import db

            row = db.query_fetchone(
                "SELECT is_admin FROM users WHERE username = %s",
                (user,)
            )
            if row and row[0]:  # User exists and has is_admin = true
                return f(*args, **kwargs)
        except Exception as err:
            logging.exception("Error checking admin status: %s", err)

        return make_response({"error": "unauthorized"}, 401)

    return wrapper


def is_session_active(last_seen: datetime | str | None) -> bool:
    if not last_seen:
        return False
    if isinstance(last_seen, str):
        last_seen = datetime.fromisoformat(last_seen)

    if last_seen.tzinfo:
        now = datetime.now(last_seen.tzinfo)
    else:
        now = datetime.now()

    return now - last_seen <= timedelta(minutes=SESSION_TIMEOUT_MINUTES)


def touch_session_from_headers() -> None:
    user = request.headers.get("X-Session-User")
    token = request.headers.get("X-Session-Token")
    if not user or not token:
        return

    try:
        from . import db

        with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
            cur.execute(
                "SELECT last_seen FROM user_sessions "
                "WHERE username = %s AND session_token = %s",
                (user, token),
            )
            row = cur.fetchone()
            if not row:
                return

            if not is_session_active(row[0]):
                cur.execute(
                    "DELETE FROM user_sessions "
                    "WHERE username = %s AND session_token = %s",
                    (user, token),
                )
            else:
                cur.execute(
                    "UPDATE user_sessions SET last_seen = "
                    "CURRENT_TIMESTAMP WHERE username = %s",
                    (user,),
                )
            conn.commit()
    except Exception as err:
        logging.debug("Failed to touch session: %s", err)


def parse_optional_int(data: dict[str, Any], key: str) -> int | None:
    if key not in data:
        return None
    try:
        return int(data[key]) if data[key] is not None else None
    except (ValueError, TypeError):
        return None
