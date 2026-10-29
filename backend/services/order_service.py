import datetime
import random
import logging
from bson import ObjectId
from database import get_db
from services.inventory_service import InventoryService

logger = logging.getLogger("kanakadurga_order")

VALID_STATUS_FLOW = {
    "Placed": ["Accepted", "Cancelled", "Rejected"],
    "Accepted": ["Packed", "Cancelled", "Rejected"],
    "Packed": ["On the Way", "Cancelled"],
    "On the Way": ["Delivered", "Cancelled"],
    "Delivered": [],
    "Cancelled": [],
    "Rejected": []
}

class OrderService:
    @staticmethod
    def generate_order_number() -> str:
        """Generates human-readable unique order number: KDF-YYYY-XXXX"""
        now = datetime.datetime.now(datetime.timezone.utc)
        year = now.strftime("%Y")
        rand = random.randint(1000, 9999)
        return f"KDF-{year}-{rand}"

    @staticmethod
    def create_order(user_id: str, payload: dict) -> dict:
        """
        Server-side authoritative order creation with strict validation:
        1. Community is active
        2. Block is allowed
        3. Items exist, are active, and have sufficient stock
        4. Prices & subtotal are calculated from the database
        5. Delivery fee & minimum order amount are verified
        6. Stock is atomically deducted
        7. Order and initial orderEvent are recorded
        """
        db = get_db()
        communities = db.get_collection("communities")
        products = db.get_collection("products")
        orders = db.get_collection("orders")
        order_events = db.get_collection("orderEvents")

        # 1. Validate community
        community_id = payload.get("communityId")
        if not community_id:
            raise ValueError("Community selection is required")

        community = None
        if ObjectId.is_valid(community_id):
            community = communities.find_one({
                "_id": ObjectId(community_id),
                "isActive": True
            })

        if not community:
            community = communities.find_one({
                "_id": community_id,
                "isActive": True
            })

        if not community:
            comm_name = payload.get("deliveryAddress", {}).get("communityName") or payload.get("communityName")
            if comm_name:
                community = communities.find_one({
                    "name": {"$regex": f"^{comm_name.strip()}$", "$options": "i"},
                    "isActive": True
                })

        if not community:
            clean_slug = str(community_id).replace("comm-", "").replace("-", " ")
            community = communities.find_one({
                "name": {"$regex": clean_slug, "$options": "i"},
                "isActive": True
            })

        if not community:
            raise ValueError("Selected residential community is either invalid or currently inactive for delivery.")

        # 2. Validate block
        delivery_addr = payload.get("deliveryAddress", {})
        block = delivery_addr.get("block", "").strip()
        if not block:
            raise ValueError("Block/Tower designation is required for community delivery.")

        allowed_blocks = [b.strip().lower() for b in community.get("allowedBlocks", [])]
        if block.lower() not in allowed_blocks:
            raise ValueError(f"Block '{block}' is not permitted for delivery in {community.get('name')}.")

        # 3. Validate customer details
        cust_name = delivery_addr.get("customerName", "").strip()
        cust_phone = delivery_addr.get("phone", "").strip()
        flat = delivery_addr.get("flat", "").strip()
        floor = delivery_addr.get("floor", "").strip()

        if not cust_name or not cust_phone or not flat:
            raise ValueError("Customer name, phone number, and flat number are required.")

        # 4. Fetch products from DB and recalculate prices
        raw_items = payload.get("items", [])
        if not raw_items:
            raise ValueError("Order must contain at least one product.")

        verified_items = []
        calculated_subtotal = 0

        for item in raw_items:
            p_id = item.get("productId")
            qty = int(item.get("quantity", 0))
            if qty <= 0:
                raise ValueError("Product quantity must be at least 1.")

            prod = None
            if ObjectId.is_valid(p_id):
                prod = products.find_one({"_id": ObjectId(p_id), "isActive": True})
            if not prod:
                prod = products.find_one({"_id": p_id, "isActive": True})
            if not prod and item.get("sku"):
                prod = products.find_one({"sku": item["sku"], "isActive": True})
            if not prod and item.get("name"):
                prod = products.find_one({
                    "name": {"$regex": f"^{item['name'].strip()}$", "$options": "i"},
                    "isActive": True
                })
            if not prod and isinstance(p_id, str) and p_id.startswith("prod-"):
                mock_sku_map = {
                    "prod-01": "KDF-SPK-01",
                    "prod-02": "KDF-SPK-02",
                    "prod-03": "KDF-CHK-01",
                    "prod-04": "KDF-ANR-01",
                    "prod-05": "KDF-AER-01",
                    "prod-06": "KDF-AER-02",
                    "prod-07": "KDF-BOX-01",
                    "prod-08": "KDF-RCK-01",
                }
                mapped_sku = mock_sku_map.get(p_id)
                if mapped_sku:
                    prod = products.find_one({"$or": [{"sku": mapped_sku}, {"sku": mapped_sku.replace("KDF-", "TRC-")}], "isActive": True})

            if not prod:
                raise ValueError(f"Product '{item.get('name') or p_id}' is no longer available.")

            selling_price = float(prod.get("sellingPrice", 0))
            item_total = selling_price * qty
            calculated_subtotal += item_total

            verified_items.append({
                "productId": str(prod["_id"]),
                "name": prod.get("name"),
                "sku": prod.get("sku"),
                "image": (prod.get("images") or [""])[0],
                "unitPrice": selling_price,
                "quantity": qty,
                "totalPrice": item_total
            })

        # Check minimum order
        min_order = float(community.get("minimumOrderAmount", 0))
        if calculated_subtotal < min_order:
            raise ValueError(f"Subtotal of ₹{calculated_subtotal:.0f} is below the minimum required order amount of ₹{min_order:.0f} for {community.get('name')}.")

        delivery_fee = float(community.get("deliveryFee", 0))
        final_total = calculated_subtotal + delivery_fee

        order_number = OrderService.generate_order_number()
        # Ensure order number uniqueness
        while orders.find_one({"orderNumber": order_number}):
            order_number = OrderService.generate_order_number()

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Step 5: Atomically deduct stock
        InventoryService.validate_and_deduct_order_stock(verified_items, order_number)

        # Step 6: Create order document
        order_doc = {
            "orderNumber": order_number,
            "userId": str(user_id),
            "customerName": cust_name,
            "customerPhone": cust_phone,
            "communityId": str(community["_id"]),
            "communityName": community.get("name"),
            "deliveryAddress": {
                "customerName": cust_name,
                "phone": cust_phone,
                "communityId": str(community["_id"]),
                "communityName": community.get("name"),
                "block": block,
                "floor": floor,
                "flat": flat,
                "landmark": delivery_addr.get("landmark", ""),
                "deliveryInstructions": delivery_addr.get("deliveryInstructions", "")
            },
            "items": verified_items,
            "subtotal": calculated_subtotal,
            "deliveryFee": delivery_fee,
            "totalAmount": final_total,
            "paymentMethod": "COD",
            "paymentStatus": "Pending Collection",
            "orderStatus": "Placed",
            "isReadByAdmin": False,
            "readByAdminAt": None,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }

        insert_res = orders.insert_one(order_doc)
        order_doc["_id"] = insert_res.inserted_id

        # Step 7: Record event
        order_events.insert_one({
            "orderId": str(insert_res.inserted_id),
            "orderNumber": order_number,
            "previousStatus": "None",
            "newStatus": "Placed",
            "timestamp": now_iso,
            "changedBy": cust_name,
            "note": "Order placed successfully via Cash on Delivery."
        })

        # Step 8: Trigger automated Resend email notification to admin (safe & non-blocking)
        try:
            from services.email_service import EmailService
            email_result = EmailService.send_order_notification_email(order_doc)
            orders.update_one(
                {"_id": insert_res.inserted_id},
                {"$set": {"emailNotification": email_result}}
            )
            order_doc["emailNotification"] = email_result
        except Exception as e:
            logger.error(f"Error executing email notification for order {order_number}: {e}", exc_info=True)

        return order_doc

    @staticmethod
    def update_order_status(order_id: str, new_status: str, admin_user: dict, note: str = "", cancellation_reason: str = "") -> dict:
        """
        Updates order status following the strict state pipeline.
        If moving to Cancelled or Rejected, releases inventory back.
        """
        db = get_db()
        orders = db.get_collection("orders")
        order_events = db.get_collection("orderEvents")

        filter_q = {"_id": ObjectId(order_id) if ObjectId.is_valid(order_id) else order_id}
        order = orders.find_one(filter_q)
        if not order:
            raise ValueError(f"Order '{order_id}' not found.")

        current_status = order.get("orderStatus")
        allowed_next = VALID_STATUS_FLOW.get(current_status, [])

        if new_status not in allowed_next:
            raise ValueError(f"Cannot transition order from '{current_status}' to '{new_status}'. Allowed transitions: {', '.join(allowed_next) or 'None (Terminal state)'}")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        update_fields = {
            "orderStatus": new_status,
            "updatedAt": now_iso
        }

        # Payment status update on delivery
        if new_status == "Delivered":
            update_fields["paymentStatus"] = "Collected"
        elif new_status in ["Cancelled", "Rejected"]:
            update_fields["paymentStatus"] = "Cancelled"
            if cancellation_reason:
                update_fields["cancellationReason"] = cancellation_reason

        orders.update_one(filter_q, {"$set": update_fields})

        # If cancelled or rejected, restore inventory
        if new_status in ["Cancelled", "Rejected"]:
            admin_id = str(admin_user.get("_id") or admin_user.get("id", "admin"))
            InventoryService.restore_cancelled_order_stock(order, admin_id=admin_id, reason=cancellation_reason or note or new_status)

        # Log event
        admin_name = admin_user.get("displayName") or admin_user.get("email") or "Admin"
        order_events.insert_one({
            "orderId": str(order["_id"]),
            "orderNumber": order.get("orderNumber"),
            "previousStatus": current_status,
            "newStatus": new_status,
            "timestamp": now_iso,
            "changedBy": admin_name,
            "note": note or f"Status changed to {new_status}"
        })

        order["orderStatus"] = new_status
        if "paymentStatus" in update_fields:
            order["paymentStatus"] = update_fields["paymentStatus"]
        order["updatedAt"] = now_iso
        return order
