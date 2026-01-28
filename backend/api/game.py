"""Game-centric api call"""

from flask import Blueprint, jsonify, request

from . import db,utils

bp = Blueprint("game", __name__)

@bp.route("/api/game/input", methods=["POST"])
@utils.handle_db_errors
def storeInput():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"Error": "Invalid JSON"}), 400

    username = data.get("username")
    user_input = data.get("input")
    conn = db.connect_to_database()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO user_inputs (username, input) "
        "VALUES (%s, %s)",
        (
            username,
            user_input
        ),
    )
    conn.commit()

    return utils.make_response({"Success":"input written"})
