"""Shared utilities for API routes."""

import logging
from functools import wraps
from typing import Any, Callable

import psycopg2  # type: ignore
from psycopg2 import OperationalError  # type: ignore
from flask import Response, jsonify, request

BAD_REQUEST = "Bad Request"
DATABASE_ERROR = "Database error"
INTERNAL_SERVER_ERROR = "Internal Server Error"


def make_response(data: Any, status: int = 200) -> Response:
    resp = jsonify(data)
    resp.status_code = status
    return resp


def handle_db_errors(f: Callable[..., Response]) -> Callable[..., Response]:
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        try:
            return f(*args, **kwargs)
        except OperationalError:
            return make_response({"error": DATABASE_ERROR}, 500)
        except (psycopg2.Error, ValueError, TypeError) as err:
            logging.exception("Unexpected error in %s: %s", f.__name__, err)
            return make_response({"error": INTERNAL_SERVER_ERROR}, 500)

    return wrapper


def require_admin(f: Callable[..., Response]) -> Callable[..., Response]:
    @wraps(f)
    def wrapper(*args: Any, **kwargs: Any) -> Response:
        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        user = request.headers.get("X-Admin-User")
        if user != "admin":
            return make_response({"error": "unauthorized"}, 401)
        return f(*args, **kwargs)

    return wrapper


def parse_optional_int(data: dict[str, Any], key: str) -> int | None:
    if key not in data:
        return None
    try:
        return int(data[key]) if data[key] is not None else None
    except (ValueError, TypeError):
        return None
