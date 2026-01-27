"""Game-centric api call"""

from flask import Blueprint, jsonify, request

bp = Blueprint("game", __name__)

@bp.route("/api/game/input", methods=["POST"])
def storeInput():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"Error": "Invalid JSON"}), 400

    username = data.get("username")
    user_input = data.get("input")
    date = data.get("date")

    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(BASE_DIR, "..", "inputs.txt")

    try:
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"{username} {user_input} {date}\n")
        return jsonify({"Success": "input written"})
    except Exception as e:
        return jsonify({"Error": str(e)}), 500
