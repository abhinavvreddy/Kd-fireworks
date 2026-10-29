import datetime
import logging
from bson import ObjectId
from database import get_db

logger = logging.getLogger("kanakadurga_inventory")

class InventoryService:
    @staticmethod
    def adjust_stock(product_id: str, quantity_change: int, change_type: str, admin_id: str = None, note: str = "", related_order_id: str = None):
        """
        Adjusts product stock atomically and writes to inventory audit log.
        """
        products = get_db().get_collection("products")
        events = get_db().get_collection("inventoryEvents")

        filter_query = {"_id": ObjectId(product_id) if ObjectId.is_valid(product_id) else product_id}
        product = products.find_one(filter_query)
        if not product:
            raise ValueError(f"Product {product_id} not found")

        current_stock = product.get("stockQuantity", 0)
        new_stock = current_stock + quantity_change
        if new_stock < 0:
            raise ValueError(f"Insufficient stock for '{product.get('name')}'. Available: {current_stock}, requested adjustment: {quantity_change}")

        # Update atomically
        products.update_one(
            filter_query,
            {"$set": {"stockQuantity": new_stock, "updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}}
        )

        event_doc = {
            "productId": str(product["_id"]),
            "productName": product.get("name"),
            "changeType": change_type,
            "quantityChange": quantity_change,
            "resultingStock": new_stock,
            "relatedOrderId": related_order_id,
            "adminId": admin_id,
            "note": note,
            "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        events.insert_one(event_doc)
        logger.info(f"Inventory adjusted: {product.get('name')} {quantity_change:+d} -> {new_stock} ({change_type})")
        return new_stock

    @staticmethod
    def validate_and_deduct_order_stock(items: list, order_id: str):
        """
        Atomically validates that each item in the order has sufficient stock,
        then decrements the stock for each product. If any product is out of stock,
        reverts any items already decremented and raises an error.
        """
        products = get_db().get_collection("products")
        events = get_db().get_collection("inventoryEvents")

        # Step 1: Pre-check all items
        deducted_items = []
        try:
            for item in items:
                p_id = item["productId"]
                qty = int(item["quantity"])
                filter_query = {
                    "_id": ObjectId(p_id) if ObjectId.is_valid(p_id) else p_id,
                    "isActive": True
                }
                product = products.find_one(filter_query)
                if not product:
                    raise ValueError(f"Product '{item.get('name')}' is no longer active or available.")
                
                avail = product.get("stockQuantity", 0)
                if avail < qty:
                    raise ValueError(f"Insufficient stock for '{product.get('name')}'. Available: {avail}, Ordered: {qty}.")

                # Atomically decrement
                update_res = products.update_one(
                    {"_id": product["_id"], "stockQuantity": {"$gte": qty}},
                    {"$inc": {"stockQuantity": -qty}, "$set": {"updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}}
                )
                if update_res.modified_count == 0:
                    raise ValueError(f"Stock conflict for '{product.get('name')}'. Another customer may have just placed an order. Please try again.")

                deducted_items.append({"productId": product["_id"], "name": product.get("name"), "qty": qty})

                # Log event
                events.insert_one({
                    "productId": str(product["_id"]),
                    "productName": product.get("name"),
                    "changeType": "order_placed_deduction",
                    "quantityChange": -qty,
                    "resultingStock": avail - qty,
                    "relatedOrderId": order_id,
                    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "note": f"Deducted for order {order_id}"
                })

        except Exception as e:
            # Rollback any already deducted items
            for rolled in deducted_items:
                products.update_one(
                    {"_id": rolled["productId"]},
                    {"$inc": {"stockQuantity": rolled["qty"]}}
                )
                events.insert_one({
                    "productId": str(rolled["productId"]),
                    "productName": rolled["name"],
                    "changeType": "order_failure_rollback",
                    "quantityChange": rolled["qty"],
                    "relatedOrderId": order_id,
                    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "note": f"Rollback due to order failure: {str(e)}"
                })
            raise e

    @staticmethod
    def restore_cancelled_order_stock(order: dict, admin_id: str = None, reason: str = ""):
        """
        Releases reserved/deducted stock back to available inventory exactly once.
        Checks if this order has already had its inventory restored.
        """
        events = get_db().get_collection("inventoryEvents")
        products = get_db().get_collection("products")

        order_id = str(order.get("_id") or order.get("id"))
        # Check if already restored
        existing_restore = events.find_one({
            "relatedOrderId": order_id,
            "changeType": "order_cancelled_restore"
        })
        if existing_restore:
            logger.warning(f"Stock for order {order_id} was already restored. Skipping duplicate restoration.")
            return

        for item in order.get("items", []):
            p_id = item.get("productId")
            qty = int(item.get("quantity", 0))
            if qty <= 0:
                continue

            filter_query = {"_id": ObjectId(p_id) if ObjectId.is_valid(p_id) else p_id}
            product = products.find_one(filter_query)
            if product:
                products.update_one(
                    filter_query,
                    {"$inc": {"stockQuantity": qty}, "$set": {"updatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}}
                )
                events.insert_one({
                    "productId": str(product["_id"]),
                    "productName": product.get("name"),
                    "changeType": "order_cancelled_restore",
                    "quantityChange": qty,
                    "resultingStock": product.get("stockQuantity", 0) + qty,
                    "relatedOrderId": order_id,
                    "adminId": admin_id,
                    "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "note": f"Restored on order cancellation: {reason}"
                })
                logger.info(f"Restored {qty} units of '{product.get('name')}' for cancelled order {order_id}")
