import os
import datetime
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from database import get_db
from middleware.auth import require_admin
from services.inventory_service import InventoryService
from services.order_service import OrderService
from config import Config

admin_bp = Blueprint("admin", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

@admin_bp.route("/upload", methods=["POST"])
@require_admin
def admin_upload_image():
    """
    Validates and uploads product images to Cloudinary.
    Strictly verifies administrator authorization, file extension, file size, and Cloudinary configuration.
    """
    if not (Config.CLOUDINARY_CLOUD_NAME and Config.CLOUDINARY_API_KEY and Config.CLOUDINARY_API_SECRET):
        return jsonify({
            "error": "Cloudinary image hosting is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your backend environment."
        }), 400

    file = request.files.get("file") or request.files.get("image")
    if not file or not file.filename:
        return jsonify({"error": "No image file provided for upload"}), 400

    filename = file.filename.strip().lower()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({
            "error": f"Invalid image format '.{ext}'. Allowed image extensions are: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
        }), 400

    file.seek(0, 2)
    file_length = file.tell()
    file.seek(0)
    if file_length > MAX_IMAGE_SIZE_BYTES:
        return jsonify({"error": f"File size exceeds maximum permitted limit of 5MB (size: {file_length / (1024*1024):.1f}MB)"}), 400

    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config(
            cloud_name=Config.CLOUDINARY_CLOUD_NAME,
            api_key=Config.CLOUDINARY_API_KEY,
            api_secret=Config.CLOUDINARY_API_SECRET,
            secure=True
        )
        upload_result = cloudinary.uploader.upload(
            file,
            folder="kanakadurga_fireworks/products",
            resource_type="image"
        )
        secure_url = upload_result.get("secure_url") or upload_result.get("url")
        return jsonify({
            "message": "Image uploaded successfully",
            "url": secure_url
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to upload image to Cloudinary: {str(e)}"}), 500

@admin_bp.route("/dashboard", methods=["GET"])
@require_admin
def get_dashboard_metrics():
    """
    Returns database-backed metrics for the admin dashboard.
    Distinguishes total order pipeline value from collected delivered revenue.
    """
    db = get_db()
    orders_col = db.get_collection("orders")
    products_col = db.get_collection("products")

    all_orders = list(orders_col.find({}))
    total_orders = len(all_orders)

    placed_count = sum(1 for o in all_orders if o.get("orderStatus") == "Placed")
    accepted_count = sum(1 for o in all_orders if o.get("orderStatus") == "Accepted")
    packed_count = sum(1 for o in all_orders if o.get("orderStatus") == "Packed")
    ontheway_count = sum(1 for o in all_orders if o.get("orderStatus") == "On the Way")
    delivered_count = sum(1 for o in all_orders if o.get("orderStatus") == "Delivered")
    cancelled_count = sum(1 for o in all_orders if o.get("orderStatus") in ["Cancelled", "Rejected"])

    # Order pipeline value (all non-cancelled orders)
    total_order_value = sum(float(o.get("totalAmount", 0)) for o in all_orders if o.get("orderStatus") not in ["Cancelled", "Rejected"])

    # Delivered revenue strictly from completed orders
    delivered_revenue = sum(float(o.get("totalAmount", 0)) for o in all_orders if o.get("orderStatus") == "Delivered")
    unread_orders = sum(1 for o in all_orders if not o.get("isReadByAdmin", False))

    all_prods = list(products_col.find({}))
    active_products = sum(1 for p in all_prods if p.get("isActive", True))
    low_stock_products = sum(1 for p in all_prods if p.get("isActive", True) and int(p.get("stockQuantity", 0)) <= int(p.get("lowStockThreshold", 5)))

    communities_col = db.get_collection("communities")
    active_communities = communities_col.count_documents({"isActive": True}) if hasattr(communities_col, "count_documents") else len(list(communities_col.find({"isActive": True})))

    return jsonify({
        "metrics": {
            "totalOrders": total_orders,
            "placedCount": placed_count,
            "acceptedCount": accepted_count,
            "packedCount": packed_count,
            "onTheWayCount": ontheway_count,
            "deliveredCount": delivered_count,
            "cancelledCount": cancelled_count,
            "totalOrderValue": total_order_value,
            "deliveredRevenue": delivered_revenue,
            "activeProducts": active_products,
            "lowStockProducts": low_stock_products,
            "activeCommunities": active_communities,
            "unreadOrders": unread_orders
        }
    }), 200

# ----------------- Product Management ----------------- #

@admin_bp.route("/products", methods=["GET"])
@require_admin
def admin_list_products():
    products_col = get_db().get_collection("products")
    prods = list(products_col.find({}))
    results = []
    for p in prods:
        mrp = float(p.get("mrp", 0))
        selling = float(p.get("sellingPrice", 0))
        discount = round(((mrp - selling) / mrp) * 100) if mrp > selling > 0 else 0
        results.append({
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
            "isDemo": p.get("isDemo", False),
            "createdAt": p.get("createdAt")
        })
    return jsonify({"products": results, "count": len(results)}), 200

@admin_bp.route("/products", methods=["POST"])
@require_admin
def admin_create_product():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    sku = (data.get("sku") or "").strip().upper()
    category = data.get("category")
    mrp = float(data.get("mrp", 0))
    selling_price = float(data.get("sellingPrice", 0))
    stock = int(data.get("stockQuantity", 0))
    threshold = int(data.get("lowStockThreshold", 5))

    if not name or not sku or not category:
        return jsonify({"error": "Name, SKU, and category are required"}), 400
    if selling_price <= 0:
        return jsonify({"error": "Selling price must be positive for purchasable products"}), 400
    if selling_price > mrp:
        return jsonify({"error": f"Selling price (₹{selling_price}) cannot exceed MRP (₹{mrp})"}), 400
    if stock < 0:
        return jsonify({"error": "Stock quantity cannot be negative"}), 400

    products_col = get_db().get_collection("products")
    if products_col.find_one({"sku": sku}):
        return jsonify({"error": f"Product with SKU '{sku}' already exists"}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    slug = name.lower().replace(" ", "-").replace("'", "")

    prod_doc = {
        "sku": sku,
        "name": name,
        "slug": slug,
        "category": category,
        "description": data.get("description", ""),
        "images": data.get("images", []),
        "mrp": mrp,
        "sellingPrice": selling_price,
        "packQuantity": int(data.get("packQuantity", 1)),
        "packUnit": data.get("packUnit", "pieces"),
        "safetyInformation": data.get("safetyInformation", "Keep out of reach of children. Store in dry place."),
        "stockQuantity": 0,
        "lowStockThreshold": threshold,
        "isFeatured": bool(data.get("isFeatured", False)),
        "isActive": bool(data.get("isActive", True)),
        "createdAt": now_iso,
        "updatedAt": now_iso
    }

    res = products_col.insert_one(prod_doc)
    prod_doc["id"] = str(res.inserted_id)

    # Initial inventory log & atomic stock assignment
    if stock > 0:
        actual_stock = InventoryService.adjust_stock(
            product_id=str(res.inserted_id),
            quantity_change=stock,
            change_type="initial_stock",
            admin_id=g.user_id,
            note="Initial inventory upon creation"
        )
        prod_doc["stockQuantity"] = actual_stock
    else:
        prod_doc["stockQuantity"] = 0

    return jsonify({"message": "Product created successfully", "product": prod_doc}), 201

@admin_bp.route("/products/<product_id>", methods=["PUT"])
@require_admin
def admin_update_product(product_id):
    data = request.get_json() or {}
    products_col = get_db().get_collection("products")

    filter_q = {"_id": ObjectId(product_id) if ObjectId.is_valid(product_id) else product_id}
    existing = products_col.find_one(filter_q)
    if not existing:
        return jsonify({"error": "Product not found"}), 404

    mrp = float(data.get("mrp", existing.get("mrp", 0)))
    selling_price = float(data.get("sellingPrice", existing.get("sellingPrice", 0)))
    if selling_price <= 0:
        return jsonify({"error": "Selling price must be positive"}), 400
    if selling_price > mrp:
        return jsonify({"error": f"Selling price (₹{selling_price}) cannot exceed MRP (₹{mrp})"}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    update_doc = {
        "name": data.get("name", existing.get("name")),
        "category": data.get("category", existing.get("category")),
        "description": data.get("description", existing.get("description")),
        "images": data.get("images", existing.get("images")),
        "mrp": mrp,
        "sellingPrice": selling_price,
        "packQuantity": int(data.get("packQuantity", existing.get("packQuantity", 1))),
        "packUnit": data.get("packUnit", existing.get("packUnit", "pieces")),
        "safetyInformation": data.get("safetyInformation", existing.get("safetyInformation")),
        "lowStockThreshold": int(data.get("lowStockThreshold", existing.get("lowStockThreshold", 5))),
        "isFeatured": bool(data.get("isFeatured", existing.get("isFeatured", False))),
        "isActive": bool(data.get("isActive", existing.get("isActive", True))),
        "updatedAt": now_iso
    }

    products_col.update_one(filter_q, {"$set": update_doc})
    return jsonify({"message": "Product updated successfully"}), 200

@admin_bp.route("/products/<product_id>", methods=["DELETE"])
@require_admin
def admin_delete_product(product_id):
    """
    Safe deletion: Checks if the product has associated orders.
    If referenced in any orders, deactivates it instead of deleting to protect order history integrity.
    """
    db = get_db()
    products_col = db.get_collection("products")
    orders_col = db.get_collection("orders")

    filter_q = {"_id": ObjectId(product_id) if ObjectId.is_valid(product_id) else product_id}
    prod = products_col.find_one(filter_q)
    if not prod:
        return jsonify({"error": "Product not found"}), 404

    # Check if ordered in any past or present order
    orders_with_prod = list(orders_col.find({"items.productId": str(prod["_id"])}))
    if len(orders_with_prod) > 0:
        # Safe archival
        products_col.update_one(filter_q, {"$set": {"isActive": False, "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}})
        return jsonify({
            "message": f"Product '{prod.get('name')}' is referenced by {len(orders_with_prod)} existing order(s). It has been safely deactivated instead of deleted to protect order history.",
            "archived": True
        }), 200

    # If completely unreferenced, we can safely delete
    products_col.delete_one(filter_q) if hasattr(products_col, 'delete_one') else products_col.update_one(filter_q, {"$set": {"isActive": False}})
    return jsonify({"message": "Product removed successfully", "deleted": True}), 200

# ----------------- Stock Management ----------------- #

@admin_bp.route("/stock", methods=["POST"])
@require_admin
def admin_adjust_stock():
    data = request.get_json() or {}
    product_id = data.get("productId")
    quantity_change = int(data.get("quantityChange", 0))
    note = data.get("note", "Manual admin inventory adjustment")

    if not product_id or quantity_change == 0:
        return jsonify({"error": "Product ID and a non-zero quantity change are required"}), 400

    try:
        new_stock = InventoryService.adjust_stock(
            product_id=product_id,
            quantity_change=quantity_change,
            change_type="manual_adjustment",
            admin_id=g.user_id,
            note=note
        )
        return jsonify({
            "message": "Stock updated successfully",
            "productId": product_id,
            "newStockQuantity": new_stock
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

# ----------------- Community Management ----------------- #

@admin_bp.route("/communities", methods=["GET"])
@require_admin
def admin_list_communities():
    communities_col = get_db().get_collection("communities")
    comms = list(communities_col.find({}))
    results = [{
        "id": str(c["_id"]),
        "name": c.get("name"),
        "locality": c.get("locality"),
        "allowedBlocks": c.get("allowedBlocks", []),
        "minimumOrderAmount": float(c.get("minimumOrderAmount", 0)),
        "deliveryFee": float(c.get("deliveryFee", 0)),
        "isActive": c.get("isActive", True),
        "createdAt": c.get("createdAt")
    } for c in comms]
    return jsonify({"communities": results, "count": len(results)}), 200

@admin_bp.route("/communities", methods=["POST"])
@require_admin
def admin_create_community():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    locality = (data.get("locality") or "Attapur, Hyderabad").strip()
    allowed_blocks = data.get("allowedBlocks", [])

    if not name:
        return jsonify({"error": "Community name is required"}), 400
    if not allowed_blocks or len(allowed_blocks) == 0:
        return jsonify({"error": "At least one allowed block/tower must be specified"}), 400

    communities_col = get_db().get_collection("communities")
    if communities_col.find_one({"name": name}):
        return jsonify({"error": f"Community '{name}' already exists"}), 400

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    comm_doc = {
        "name": name,
        "locality": locality,
        "allowedBlocks": allowed_blocks,
        "minimumOrderAmount": float(data.get("minimumOrderAmount", 0)),
        "deliveryFee": float(data.get("deliveryFee", 0)),
        "isActive": bool(data.get("isActive", True)),
        "createdAt": now_iso,
        "updatedAt": now_iso
    }
    res = communities_col.insert_one(comm_doc)
    comm_doc["id"] = str(res.inserted_id)
    return jsonify({"message": "Community added successfully", "community": comm_doc}), 201

@admin_bp.route("/communities/<comm_id>", methods=["PUT"])
@require_admin
def admin_update_community(comm_id):
    data = request.get_json() or {}
    communities_col = get_db().get_collection("communities")

    filter_q = {"_id": ObjectId(comm_id) if ObjectId.is_valid(comm_id) else comm_id}
    existing = communities_col.find_one(filter_q)
    if not existing:
        return jsonify({"error": "Community not found"}), 404

    update_fields = {
        "name": data.get("name", existing.get("name")),
        "locality": data.get("locality", existing.get("locality")),
        "allowedBlocks": data.get("allowedBlocks", existing.get("allowedBlocks")),
        "minimumOrderAmount": float(data.get("minimumOrderAmount", existing.get("minimumOrderAmount", 0))),
        "deliveryFee": float(data.get("deliveryFee", existing.get("deliveryFee", 0))),
        "isActive": bool(data.get("isActive", existing.get("isActive", True))),
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    communities_col.update_one(filter_q, {"$set": update_fields})
    return jsonify({"message": "Community updated successfully"}), 200

@admin_bp.route("/communities/<comm_id>", methods=["DELETE"])
@require_admin
def admin_delete_community(comm_id):
    """
    Deletes or deactivates a community with data integrity protection:
    If any historical orders reference this community, marks isActive=False to preserve order history.
    If no orders reference it, permanently deletes the document.
    """
    db = get_db()
    communities_col = db.get_collection("communities")
    orders_col = db.get_collection("orders")

    filter_q = {"_id": ObjectId(comm_id) if ObjectId.is_valid(comm_id) else comm_id}
    existing = communities_col.find_one(filter_q)
    if not existing:
        return jsonify({"error": "Community not found"}), 404

    comm_id_str = str(existing["_id"])
    comm_name = existing.get("name", "")

    # Check if any past orders reference this community
    orders_count = orders_col.count_documents({
        "$or": [
            {"communityId": comm_id_str},
            {"deliveryAddress.communityId": comm_id_str},
            {"communityName": comm_name},
            {"deliveryAddress.communityName": comm_name}
        ]
    })

    if orders_count > 0:
        # Safe archival: deactivate so it disappears from customer lists while preserving historical orders
        communities_col.update_one(filter_q, {
            "$set": {
                "isActive": False,
                "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
        })
        return jsonify({
            "message": f"Community '{comm_name}' has {orders_count} associated order(s). It has been safely deactivated and removed from customer selection to preserve order history.",
            "archived": True,
            "deleted": False
        }), 200

    # If completely unreferenced, permanently delete
    if hasattr(communities_col, 'delete_one'):
        communities_col.delete_one(filter_q)
    else:
        communities_col.update_one(filter_q, {"$set": {"isActive": False}})

    return jsonify({
        "message": f"Community '{comm_name}' removed successfully",
        "deleted": True
    }), 200

# ----------------- Order Management ----------------- #

@admin_bp.route("/orders", methods=["GET"])
@require_admin
def admin_list_orders():
    orders_col = get_db().get_collection("orders")
    status_filter = request.args.get("status")
    search_q = request.args.get("search", "").strip().lower()

    filter_dict = {}
    if status_filter and status_filter.lower() != "all":
        filter_dict["orderStatus"] = status_filter

    all_orders = list(orders_col.find(filter_dict, sort=[("createdAt", -1)]))

    if search_q:
        all_orders = [
            o for o in all_orders if
            search_q in o.get("orderNumber", "").lower() or
            search_q in o.get("customerName", "").lower() or
            search_q in o.get("customerPhone", "").lower() or
            search_q in o.get("communityName", "").lower()
        ]

    formatted = [{
        "id": str(o["_id"]),
        "orderNumber": o.get("orderNumber"),
        "customerName": o.get("customerName"),
        "customerPhone": o.get("customerPhone"),
        "communityName": o.get("communityName"),
        "deliveryAddress": o.get("deliveryAddress"),
        "items": o.get("items"),
        "subtotal": o.get("subtotal"),
        "deliveryFee": o.get("deliveryFee"),
        "totalAmount": o.get("totalAmount"),
        "paymentMethod": o.get("paymentMethod"),
        "paymentStatus": o.get("paymentStatus"),
        "orderStatus": o.get("orderStatus"),
        "isReadByAdmin": bool(o.get("isReadByAdmin", False)),
        "cancellationReason": o.get("cancellationReason"),
        "createdAt": o.get("createdAt")
    } for o in all_orders]

    return jsonify({"orders": formatted, "count": len(formatted)}), 200

@admin_bp.route("/orders/<order_id>/status", methods=["POST"])
@require_admin
def admin_update_order_status(order_id):
    data = request.get_json() or {}
    new_status = data.get("status")
    note = data.get("note", "")
    reason = data.get("cancellationReason", "")

    if not new_status:
        return jsonify({"error": "Target status is required"}), 400

    try:
        updated = OrderService.update_order_status(
            order_id=order_id,
            new_status=new_status,
            admin_user=g.current_user,
            note=note,
            cancellation_reason=reason
        )
        return jsonify({
            "message": f"Order status updated to {new_status}",
            "order": {
                "id": str(updated.get("_id") or order_id),
                "orderNumber": updated.get("orderNumber"),
                "orderStatus": updated.get("orderStatus"),
                "paymentStatus": updated.get("paymentStatus"),
                "updatedAt": updated.get("updatedAt")
            }
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update status: {str(e)}"}), 500

# ----------------- Order Notifications ----------------- #

@admin_bp.route("/notifications", methods=["GET"])
@require_admin
def admin_get_notifications():
    """
    Returns unread order notification count and the latest order alerts.
    Persists across sessions, browser refreshes, and admin re-logins.
    """
    db = get_db()
    orders_col = db.get_collection("orders")

    all_orders = list(orders_col.find({}, sort=[("createdAt", -1)]))
    unread_count = sum(1 for o in all_orders if not o.get("isReadByAdmin", False))

    recent_alerts = []
    for o in all_orders[:25]:
        recent_alerts.append({
            "orderId": str(o["_id"]),
            "orderNumber": o.get("orderNumber"),
            "customerName": o.get("customerName", "Resident"),
            "customerPhone": o.get("customerPhone", ""),
            "communityName": o.get("communityName", "Attapur Society"),
            "totalAmount": float(o.get("totalAmount", 0)),
            "orderStatus": o.get("orderStatus", "Placed"),
            "isRead": bool(o.get("isReadByAdmin", False)),
            "itemsCount": len(o.get("items", [])),
            "createdAt": o.get("createdAt")
        })

    return jsonify({
        "unreadCount": unread_count,
        "notifications": recent_alerts
    }), 200

@admin_bp.route("/notifications/<order_id>/read", methods=["POST"])
@require_admin
def admin_mark_notification_read(order_id):
    """
    Marks a single order notification as read.
    """
    db = get_db()
    orders_col = db.get_collection("orders")
    filter_q = {"_id": ObjectId(order_id) if ObjectId.is_valid(order_id) else order_id}

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    res = orders_col.update_one(filter_q, {"$set": {"isReadByAdmin": True, "readByAdminAt": now_iso}})

    if res.matched_count == 0:
        orders_col.update_one({"orderNumber": order_id}, {"$set": {"isReadByAdmin": True, "readByAdminAt": now_iso}})

    return jsonify({"message": "Notification marked as read", "orderId": order_id}), 200

@admin_bp.route("/notifications/mark-all-read", methods=["POST"])
@require_admin
def admin_mark_all_notifications_read():
    """
    Marks all unread order notifications as read.
    """
    db = get_db()
    orders_col = db.get_collection("orders")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    orders_col.update_many(
        {"isReadByAdmin": {"$ne": True}},
        {"$set": {"isReadByAdmin": True, "readByAdminAt": now_iso}}
    )

    return jsonify({"message": "All notifications marked as read"}), 200
