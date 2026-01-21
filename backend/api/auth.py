"""Authentication endpoints."""

import psycopg2  # type: ignore
from flask import Blueprint, request
from werkzeug.security import check_password_hash, generate_password_hash

from . import db, utils

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
            "SELECT username, password FROM users WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
        if not row:
            return utils.make_response(
                {"userExist": False, "passwordIsCorrect": False}
            )
        stored_username, stored_password = row
        if not check_password_hash(stored_password, password):
            return utils.make_response(
                {"userExist": True, "passwordIsCorrect": False}
            )
        return utils.make_response(
            {
                "userExist": True,
                "passwordIsCorrect": True,
                "username": stored_username,
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

    if len(username) > 100:
        return utils.make_response(
            {"success": False, "message": "username too long"}, 400
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
                "INSERT INTO users (username, password) VALUES (%s, %s)",
                (username, password),
            )
            conn.commit()
            return utils.make_response({"success": True})
        except psycopg2.IntegrityError:
            # Concurrent insertion or constraint violation -> user exists
            conn.rollback()
            return utils.make_response(
                {"success": False, "message": "user already exists"}, 409
            )
