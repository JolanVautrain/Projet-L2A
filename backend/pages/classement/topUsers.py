"""leaderboard related endpoints."""

from typing import List

from core import db
from core import utils
from flask import Blueprint
from flask import Response

bp = Blueprint("leaderboard",__name__, url_prefix="/api/leaderboard")


@bp.route("/score", methods=["GET"])
@utils.handle_db_errors
def get_high_score() -> Response:
    rows = db.query_fetchall(
        "SELECT username, score, stage, timer, state, playedat FROM game_sessions ORDER BY score DESC"
    )
    index = 1
    result: List[dict[str, int | str]] = []
    for r in rows:
        result.append({
            "rank": index,
            "username": r[0],
            "score": int(r[1] or 0),
            "stage": int(r[2] or 0),
            "timer": int(r[3] or 0),
            "state": r[4],
            "playedAt": r[5],
        })
        index +=1
    return utils.make_response(result[:10])


@bp.route("/users", methods=["GET"])
@utils.handle_db_errors
def list_high_scores() -> Response:
    rows = db.query_fetchall(
        "SELECT username, high_score, stage, timer, state FROM highscores ORDER BY "
        "high_score DESC"
    )
    index = 1
    result: List[dict[str, int | str]] = []
    for r in rows:
        result.append({
            "rank":index,
            "username": r[0],
            "highScore": int(r[1]),
            "stage": int(r[2] or 0),
            "timer": int(r[3] or 0),
            "state": r[4],
        })
        index +=1
    return utils.make_response(result[:10])
