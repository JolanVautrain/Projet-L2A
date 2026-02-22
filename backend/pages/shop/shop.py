"""Shop API pour le management des achats"""

from typing import List, Dict, Any
from core import db
from flask import Blueprint
from flask import jsonify
from flask import request

bp = Blueprint("shop", __name__, url_prefix="/api/shop")


@bp.route("/purchase", methods=["POST"])
def create_purchase():
    """Enregistre les achats"""
    data = request.get_json()
    username = data.get("username")
    product_id = data.get("product_id")
    product_name = data.get("product_name")
    price = data.get("price")

    if not all([username, product_id, product_name, price]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        db.exec_commit(
            "INSERT INTO purchases (username, product_id, product_name, price)"
            " VALUES (%s, %s, %s, %s)",
            (username, product_id, product_name, price),
        )
        return jsonify({"message": "Purchase recorded successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/purchases/<username>", methods=["GET"])
def get_user_purchases(username: str):
    """Renvoi tous les achats effectuer par le client"""
    try:
        purchases = db.query_fetchall(
            "SELECT id, product_id, product_name, price, purchased_at "
            "FROM purchases WHERE username = %s ORDER BY purchased_at DESC",
            (username,),
        )
        result: List[Dict[str, Any]] = [
            {
                "id": p[0],
                "product_id": p[1],
                "product_name": p[2],
                "price": p[3],
                "purchased_at": p[4].isoformat() if p[4] else None,
            }
            for p in purchases
        ]
        return jsonify({"purchases": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/has-product/<username>/<product_id>", methods=["GET"])
def check_user_has_product(username: str, product_id: str):
    """Vérifie si le client est propriétaire du produit"""
    try:
        result = db.query_fetchone(
            "SELECT COUNT(*) FROM purchases WHERE username = %s "
            "AND product_id = %s",
            (username, product_id),
        )
        has_product = result[0] > 0 if result else False
        return jsonify({"has_product": has_product}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/admin/purchases", methods=["GET"])
def get_all_purchases():
    """Renvoie l'historique de tous les achats (uniquement Admin)"""
    admin_user = request.headers.get("X-Admin-User")

    if admin_user != "admin":
        return jsonify({"error": "Unauthorized"}), 401

    try:
        purchases = db.query_fetchall(
            "SELECT id, username, product_id, product_name, price, "
            "purchased_at "
            "FROM purchases ORDER BY purchased_at DESC"
        )
        result: List[Dict[str, Any]] = [
            {
                "id": p[0],
                "username": p[1],
                "product_id": p[2],
                "product_name": p[3],
                "price": p[4],
                "purchased_at": p[5].isoformat() if p[5] else None,
            }
            for p in purchases
        ]
        return jsonify({"purchases": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/admin/purchase/<int:purchase_id>", methods=["DELETE"])
def cancel_purchase(purchase_id: int):
    """Annule achat d'un produit (uniquement Admin)"""
    admin_user = request.headers.get("X-Admin-User")

    if admin_user != "admin":
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # Check if purchase exists
        purchase = db.query_fetchone(
            "SELECT username, product_id FROM purchases WHERE id = %s",
            (purchase_id,),
        )

        if not purchase:
            return jsonify({"error": "Purchase not found"}), 404

        # Delete the purchase
        db.exec_commit("DELETE FROM purchases WHERE id = %s", (purchase_id,))

        return (
            jsonify(
                {
                    "message": "Purchase cancelled successfully",
                    "username": purchase[0],
                    "product_id": purchase[1],
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
