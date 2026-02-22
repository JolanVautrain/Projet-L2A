"""Game-centric api call"""

from typing import Any, Dict, List, Optional

from core import db, utils
from flask import Blueprint, jsonify, request

bp = Blueprint("game", __name__)

players: List[str] = []


@bp.route("/api/game/input", methods=["POST"])
@utils.handle_db_errors
def store_input():
    data: Optional[Dict[str, Any]] = request.get_json(silent=True)
    if not data:
        return jsonify({"Error": "Invalid JSON"}), 400

    username: str = str(data.get("username", "")).strip()
    if not username:
        return utils.make_response({"Error": "username required"}, 400)
    user_input: str = str(data.get("input", "")).strip()
    conn = db.connect_to_database()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO user_inputs (username, input) VALUES (%s, %s)",
        (username, user_input),
    )
    conn.commit()

    return utils.make_response({"Success": "input written"})


@bp.route("/api/game/lobby", methods=["POST"])
def wait_for_game():
    data: Optional[Dict[str, Any]] = request.get_json(silent=True)
    if not data:
        return jsonify({"Error": "Invalid JSON"}), 400

    username: str = str(data.get("username", "")).strip()
    if not username:
        return utils.make_response({"Error": "username required"}, 400)
    if username in players:
        return utils.make_response(
            {"Error": username + " already waiting in lobby"}, status=400
        )
    players.append(username)
    return utils.make_response({"Success": username + " waiting in lobby"})


@bp.route("/api/game/lobby/players", methods=["GET"])
def get_players():
    nb_players = len(players)
    return utils.make_response({"count": nb_players})
