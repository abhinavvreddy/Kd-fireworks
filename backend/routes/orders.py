from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import get_db
from middleware.auth import require_auth
from services.order_service import OrderService

orders_bp = Blueprint("orders", __name__)

@orders_bp.route("", methods=["POST"])
@require_auth
def create_customer_order():
    """
    Places a new Cash on Delivery order.
    Validates community, blocks, server prices, and atomic inventory.
    """
    payload = request.get_json() or {}
    try:
        created_order = OrderService.create_order(g.user_id, payload)
        # Format response
        created_order["id"] = str(created_order["_id"])
        del created_order["_id"]
        return jsonify({
            "message": "Order placed successfully! Keep exact cash ready upon delivery.",
            "order": created_order
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to place order: {str(e)}"}), 500

@orders_bp.route("/me", methods=["GET"])
@require_auth
def list_my_orders():
    """
    Returns list of orders belonging to the authenticated customer.
    """
    db = get_db()
    orders_col = db.get_collection("orders")
    my_orders = orders_col.find({"userId": g.user_id}, sort=[("createdAt", -1)])

    results = []
    for o in my_orders:
        results.append({
            "id": str(o["_id"]),
            "orderNumber": o.get("orderNumber"),
            "customerName": o.get("customerName"),
            "customerPhone": o.get("customerPhone"),
            "communityId": o.get("communityId"),
            "communityName": o.get("communityName"),
            "deliveryAddress": o.get("deliveryAddress", {}),
            "items": o.get("items", []),
            "subtotal": o.get("subtotal"),
            "deliveryFee": o.get("deliveryFee"),
            "totalAmount": o.get("totalAmount"),
            "paymentMethod": o.get("paymentMethod", "COD"),
            "paymentStatus": o.get("paymentStatus"),
            "orderStatus": o.get("orderStatus"),
            "cancellationReason": o.get("cancellationReason"),
            "createdAt": o.get("createdAt"),
            "updatedAt": o.get("updatedAt")
        })

    return jsonify({"orders": results, "count": len(results)}), 200

@orders_bp.route("/<order_id>", methods=["GET"])
@require_auth
def get_order_by_id(order_id):
    """
    Returns full order details including timeline events.
    Verifies that customer owns the order (or is an admin).
    """
    db = get_db()
    orders_col = db.get_collection("orders")
    events_col = db.get_collection("orderEvents")

    filter_q = {"_id": ObjectId(order_id) if ObjectId.is_valid(order_id) else order_id}
    order = orders_col.find_one(filter_q)

    if not order:
        # Also try by human-readable orderNumber
        order = orders_col.find_one({"orderNumber": order_id})

    if not order:
        return jsonify({"error": "Order not found"}), 404

    # Strict authorization check
    if order.get("userId") != g.user_id and g.user_role != "admin":
        return jsonify({"error": "Forbidden: You do not have permission to view this order"}), 403

    events = events_col.find({"orderId": str(order["_id"])}, sort=[("timestamp", 1)])
    formatted_events = [{
        "previousStatus": e.get("previousStatus"),
        "newStatus": e.get("newStatus"),
        "timestamp": e.get("timestamp"),
        "changedBy": e.get("changedBy"),
        "note": e.get("note")
    } for e in events]

    res = {
        "id": str(order["_id"]),
        "orderNumber": order.get("orderNumber"),
        "userId": order.get("userId"),
        "customerName": order.get("customerName"),
        "customerPhone": order.get("customerPhone"),
        "communityId": order.get("communityId"),
        "communityName": order.get("communityName"),
        "deliveryAddress": order.get("deliveryAddress"),
        "items": order.get("items"),
        "subtotal": order.get("subtotal"),
        "deliveryFee": order.get("deliveryFee"),
        "totalAmount": order.get("totalAmount"),
        "paymentMethod": order.get("paymentMethod"),
        "paymentStatus": order.get("paymentStatus"),
        "orderStatus": order.get("orderStatus"),
        "cancellationReason": order.get("cancellationReason"),
        "events": formatted_events,
        "createdAt": order.get("createdAt"),
        "updatedAt": order.get("updatedAt")
    }
    return jsonify(res), 200
