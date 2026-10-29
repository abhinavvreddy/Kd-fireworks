import re
from flask import Blueprint, request, jsonify
from bson import ObjectId
from database import get_db

products_bp = Blueprint("products", __name__)

@products_bp.route("", methods=["GET"])
def list_products():
    """
    Returns active products for customer catalogue.
    Supports search, category filtering, and sorting.
    """
    category = request.args.get("category", "").strip()
    search_q = request.args.get("search", "").strip()
    sort_by = request.args.get("sort", "featured").strip()

    filter_dict = {"isActive": True}
    if category and category.lower() != "all":
        filter_dict["category"] = category

    db = get_db()
    products_col = db.get_collection("products")
    all_prods = list(products_col.find(filter_dict))

    # In-memory search filter for robustness across mock and real MongoDB
    if search_q:
        reg = re.compile(re.escape(search_q), re.IGNORECASE)
        all_prods = [p for p in all_prods if reg.search(p.get("name", "")) or reg.search(p.get("category", "")) or reg.search(p.get("description", ""))]

    # Sorting
    if sort_by == "price_asc":
        all_prods.sort(key=lambda x: float(x.get("sellingPrice", 0)))
    elif sort_by == "price_desc":
        all_prods.sort(key=lambda x: float(x.get("sellingPrice", 0)), reverse=True)
    elif sort_by == "discount_desc":
        def disc(p):
            m = float(p.get("mrp", 0))
            s = float(p.get("sellingPrice", 0))
            return ((m - s) / m) if m > s > 0 else 0
        all_prods.sort(key=disc, reverse=True)
    else: # featured default
        all_prods.sort(key=lambda x: (x.get("isFeatured", False), x.get("stockQuantity", 0) > 0), reverse=True)

    formatted = []
    for p in all_prods:
        mrp = float(p.get("mrp", 0))
        selling = float(p.get("sellingPrice", 0))
        discount = round(((mrp - selling) / mrp) * 100) if mrp > selling > 0 else 0
        
        formatted.append({
            "id": str(p["_id"]),
            "sku": p.get("sku"),
            "name": p.get("name"),
            "slug": p.get("slug"),
            "category": p.get("category"),
            "description": p.get("description"),
            "images": p.get("images", []),
            "mrp": mrp,
            "sellingPrice": selling,
            "discountPercentage": discount,
            "packQuantity": p.get("packQuantity", 1),
            "packUnit": p.get("packUnit", "pieces"),
            "safetyInformation": p.get("safetyInformation", ""),
            "stockQuantity": p.get("stockQuantity", 0),
            "lowStockThreshold": p.get("lowStockThreshold", 5),
            "isFeatured": p.get("isFeatured", False),
            "isActive": p.get("isActive", True),
            "isDemo": p.get("isDemo", False)
        })

    return jsonify({"products": formatted, "count": len(formatted)}), 200

@products_bp.route("/<product_id>", methods=["GET"])
def get_product_details(product_id):
    products_col = get_db().get_collection("products")
    p = products_col.find_one({
        "_id": ObjectId(product_id) if ObjectId.is_valid(product_id) else product_id,
        "isActive": True
    })
    if not p:
        return jsonify({"error": "Product not found or inactive"}), 404

    mrp = float(p.get("mrp", 0))
    selling = float(p.get("sellingPrice", 0))
    discount = round(((mrp - selling) / mrp) * 100) if mrp > selling > 0 else 0

    return jsonify({
        "id": str(p["_id"]),
        "sku": p.get("sku"),
        "name": p.get("name"),
        "slug": p.get("slug"),
        "category": p.get("category"),
        "description": p.get("description"),
        "images": p.get("images", []),
        "mrp": mrp,
        "sellingPrice": selling,
        "discountPercentage": discount,
        "packQuantity": p.get("packQuantity", 1),
        "packUnit": p.get("packUnit", "pieces"),
        "safetyInformation": p.get("safetyInformation", ""),
        "stockQuantity": p.get("stockQuantity", 0),
        "lowStockThreshold": p.get("lowStockThreshold", 5),
        "isFeatured": p.get("isFeatured", False),
        "isActive": p.get("isActive", True),
        "isDemo": p.get("isDemo", False)
    }), 200
