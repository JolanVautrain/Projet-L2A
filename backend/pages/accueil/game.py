"""Game-centric api call"""

from flask import Blueprint, jsonify, request

from core import db, utils

bp = Blueprint("game", __name__)

players = []


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
        "INSERT INTO user_inputs (username, input) " "VALUES (%s, %s)",
        (username, user_input),
    )
    conn.commit()

    return utils.make_response({"Success": "input written"})


@bp.route("/api/game/lobby", methods=["POST"])
def waitForGame():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"Error": "Invalid JSON"}), 400

    username = data.get("username")
    if username in players:
        return utils.make_response(
            {"Error": username + " already waiting in lobby"}, status=400
        )
    players.append(username)
    return utils.make_response({"Success": username + " waiting in lobby"})


@bp.route("/api/game/lobby/players", methods=["GET"])
def getPlayers():
    nbPlayers = len(players)
    return utils.make_response({"count": nbPlayers})
