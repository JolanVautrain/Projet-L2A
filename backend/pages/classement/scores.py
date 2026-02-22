"""High score related endpoints."""

import datetime
from typing import Any
from typing import List

from core import db
from core import utils
from flask import Blueprint
from flask import Response
from flask import request

bp = Blueprint("scores", __name__)


def _insert_game_session(
    conn: Any,
    cur: Any,
    username: str,
    score: int,
    stage: int | None,
    timer: int | None,
    state: str | None,
) -> None:
    cur.execute(
        "INSERT INTO game_sessions "
        "(username, score, stage, timer, state, playedAt) "
        "VALUES (%s, %s, %s, %s, %s,%s)",
        (
            username,
            score,
            stage if stage is not None else 0,
            timer if timer is not None else 0,
            state,
            str(datetime.datetime.now()),
        ),
    )
    conn.commit()


def _handle_new_highscore(
    cur: Any,
    conn: Any,
    username: str,
    score: int,
    stage: int | None,
    timer: int | None,
    state: str | None,
) -> tuple[int, bool]:
    cur.execute(
        "INSERT INTO highscores (username, high_score, stage, timer,state) "
        "VALUES (%s, %s, %s, %s,%s)",
        (
            username,
            score,
            stage if stage is not None else 0,
            timer if timer is not None else 0,
            state,
        ),
    )
    conn.commit()
    return score, True


def _update_highscore_if_better(
    cur: Any,
    conn: Any,
    username: str,
    score: int,
    stage: int | None,
    timer: int | None,
    state: str | None,
    current_high: int,
) -> tuple[int, bool]:
    if score <= current_high:
        return current_high, False

    if stage is not None or timer is not None or state is not None:
        cur.execute(
            "UPDATE highscores "
            "SET high_score = %s, stage = %s, timer = %s, state = %s "
            "WHERE username = %s",
            (
                score,
                stage if stage is not None else 0,
                timer if timer is not None else 0,
                state,
                username,
            ),
        )
    else:
        cur.execute(
            "UPDATE highscores SET high_score = %s WHERE username = %s",
            (score, username),
        )
    conn.commit()
    return score, True


@bp.route("/api/score", methods=["POST"])
@utils.handle_db_errors
def submit_score() -> Response:
    data = request.get_json()
    if not data or "username" not in data or "score" not in data:
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "username and score required",
            },
            400,
        )

    username = data["username"].strip()
    try:
        score = int(data["score"])
    except (ValueError, TypeError):
        return utils.make_response(
            {
                "error": utils.BAD_REQUEST,
                "message": "score must be an integer",
            },
            400,
        )

    stage = utils.parse_optional_int(data, "stage")
    timer = utils.parse_optional_int(data, "timer")
    raw_state = data.get("state")
    state = str(raw_state) if raw_state is not None else None

    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        _insert_game_session(conn, cur, username, score, stage, timer, state)

        cur.execute(
            "SELECT high_score FROM highscores WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()

        if not row:
            high, updated = _handle_new_highscore(
                cur, conn, username, score, stage, timer, state
            )
        else:
            current_high = int(row[0])
            high, updated = _update_highscore_if_better(
                cur, conn, username, score, stage, timer, state, current_high
            )

        return utils.make_response({"updated": updated, "highScore": high})


@bp.route("/api/score/<username>")
@utils.handle_db_errors
def get_high_score(username: str) -> Response:
    username = username.strip()
    with db.get_db_connection() as conn, db.get_db_cursor(conn) as cur:
        cur.execute(
            "SELECT high_score, stage, timer, state FROM highscores "
            "WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()

        if not row:
            return utils.make_response(
                {"error": "Not Found", "message": "No high score for user"},
                404,
            )

        return utils.make_response(
            {
                "username": username,
                "highScore": int(row[0]),
                "stage": int(row[1] or 0),
                "timer": int(row[2] or 0),
                "state": row[3],
            }
        )


@bp.route("/api/score", methods=["GET"])
@utils.handle_db_errors
def list_high_scores() -> Response:
    rows = db.query_fetchall(
        "SELECT username, high_score, stage, timer, state "
        "FROM highscores ORDER BY "
        "high_score DESC"
    )

    result: List[dict[str, int | str]] = [
        {
            "username": r[0],
            "highScore": int(r[1]),
            "stage": int(r[2] or 0),
            "timer": int(r[3] or 0),
            "state": r[4],
        }
        for r in rows
    ]
    return utils.make_response(result)
