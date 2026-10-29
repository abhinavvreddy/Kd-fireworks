from flask import Blueprint, request, jsonify
from bson import ObjectId
from database import get_db

communities_bp = Blueprint("communities", __name__)

@communities_bp.route("", methods=["GET"])
def list_active_communities():
    """
    Returns only active communities with permitted blocks and fee policies.
    """
    communities_col = get_db().get_collection("communities")
    comms = communities_col.find({"isActive": True})

    results = []
    for c in comms:
        results.append({
            "id": str(c["_id"]),
            "name": c.get("name"),
            "locality": c.get("locality", "Attapur, Hyderabad"),
            "allowedBlocks": c.get("allowedBlocks", []),
            "minimumOrderAmount": float(c.get("minimumOrderAmount", 0)),
            "deliveryFee": float(c.get("deliveryFee", 0)),
            "isActive": c.get("isActive", True)
        })

    return jsonify({"communities": results, "count": len(results)}), 200

@communities_bp.route("/validate", methods=["POST"])
def validate_community_block():
    """
    Validates whether a community is active and the selected block is permitted.
    """
    data = request.get_json() or {}
    community_id = data.get("communityId")
    block = (data.get("block") or "").strip()

    if not community_id:
        return jsonify({"valid": False, "error": "Community ID is required"}), 400
    if not block:
        return jsonify({"valid": False, "error": "Block/Tower selection is required"}), 400

    communities_col = get_db().get_collection("communities")
    comm = None
    if ObjectId.is_valid(community_id):
        comm = communities_col.find_one({"_id": ObjectId(community_id), "isActive": True})
    if not comm:
        comm = communities_col.find_one({"_id": community_id, "isActive": True})
    if not comm:
        clean_slug = str(community_id).replace("comm-", "").replace("-", " ")
        comm = communities_col.find_one({
            "name": {"$regex": clean_slug, "$options": "i"},
            "isActive": True
        })

    if not comm:
        return jsonify({"valid": False, "error": "Community is inactive or does not exist"}), 404

    allowed = [b.strip().lower() for b in comm.get("allowedBlocks", [])]
    if block.lower() not in allowed:
        return jsonify({
            "valid": False,
            "error": f"Block '{block}' is not permitted for delivery in {comm.get('name')}.",
            "allowedBlocks": comm.get("allowedBlocks", [])
        }), 400

    return jsonify({
        "valid": True,
        "communityName": comm.get("name"),
        "deliveryFee": float(comm.get("deliveryFee", 0)),
        "minimumOrderAmount": float(comm.get("minimumOrderAmount", 0))
    }), 200
