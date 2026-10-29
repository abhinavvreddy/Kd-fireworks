import pytest
import io
import json
import requests
from unittest.mock import patch, MagicMock
from bson import ObjectId
from app import create_app
from database import get_db
from seed import seed_database
from config import Config
from middleware.auth import generate_jwt_token

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    seed_database()
    with app.test_client() as client:
        yield client

def create_test_customer(name="Ramesh Varma", phone="+919876543210"):
    users = get_db().get_collection("users")
    user_doc = {
        "displayName": name,
        "verifiedPhone": phone,
        "role": "customer",
        "authProviders": ["phone_otp"],
        "isActive": True
    }
    res = users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    token = generate_jwt_token(user_id, "customer", phone=phone)
    return user_id, token

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "Attapur, Hyderabad" in data["location"]
    assert "KanakaDurga FireWorks" in data["service"]

def test_google_oauth_unconfigured_rejects_properly(client):
    # When GOOGLE_CLIENT_ID is not configured, login must reject with 401 rather than simulating fake success
    orig = Config.GOOGLE_CLIENT_ID
    Config.GOOGLE_CLIENT_ID = ""
    res = client.post("/api/v1/auth/google", json={"idToken": "fake-google-token"})
    assert res.status_code == 401
    assert "Google Sign-In is not configured" in res.get_json()["error"]
    Config.GOOGLE_CLIENT_ID = orig

def test_deprecated_otp_endpoint_returns_410(client):
    res = client.post("/api/v1/auth/otp/verify", json={"idToken": "fake-otp-token"})
    assert res.status_code == 410
    assert "deprecated" in res.get_json()["error"]

def test_mobile_password_registration_and_security(client):
    # Missing required fields
    r_empty = client.post("/api/v1/auth/register", json={})
    assert r_empty.status_code == 400

    # Short name
    r_short_name = client.post("/api/v1/auth/register", json={
        "displayName": "A",
        "phone": "9876543210",
        "password": "Password123",
        "confirmPassword": "Password123"
    })
    assert r_short_name.status_code == 400

    # Invalid phone
    r_bad_phone = client.post("/api/v1/auth/register", json={
        "displayName": "Ramesh Varma",
        "phone": "12345",
        "password": "Password123",
        "confirmPassword": "Password123"
    })
    assert r_bad_phone.status_code == 400

    # Weak password (under 8 chars)
    r_weak = client.post("/api/v1/auth/register", json={
        "displayName": "Ramesh Varma",
        "phone": "9876543210",
        "password": "pass",
        "confirmPassword": "pass"
    })
    assert r_weak.status_code == 400

    # Password mismatch
    r_mismatch = client.post("/api/v1/auth/register", json={
        "displayName": "Ramesh Varma",
        "phone": "9876543210",
        "password": "Password123",
        "confirmPassword": "DifferentPassword123"
    })
    assert r_mismatch.status_code == 400

    # Successful registration
    r_success = client.post("/api/v1/auth/register", json={
        "displayName": "Ramesh Varma",
        "phone": "9876543210",
        "password": "SecurePassword123",
        "confirmPassword": "SecurePassword123",
        "role": "admin"  # Must NOT allow privilege escalation!
    })
    assert r_success.status_code == 201
    data = r_success.get_json()
    assert "token" in data
    assert data["user"]["displayName"] == "Ramesh Varma"
    assert data["user"]["role"] == "customer"  # Privilege escalation prevented!
    assert data["user"]["phone"] == "+919876543210"
    assert "password" not in data["user"]
    assert "passwordHash" not in data["user"]

    # Verify database document
    db = get_db()
    user_in_db = db.get_collection("users").find_one({"phone": "+919876543210"})
    assert user_in_db is not None
    assert user_in_db["passwordHash"].startswith("$2b$")  # bcrypt hash
    assert "SecurePassword123" not in str(user_in_db)

    # Duplicate registration rejected with 409
    r_dup = client.post("/api/v1/auth/register", json={
        "displayName": "Another Ramesh",
        "phone": "9876543210",
        "password": "AnotherPassword123",
        "confirmPassword": "AnotherPassword123"
    })
    assert r_dup.status_code == 409
    assert "already exists" in r_dup.get_json()["error"]

def test_mobile_password_login_and_rate_limiting(client):
    # Register a user
    reg = client.post("/api/v1/auth/register", json={
        "displayName": "Sita Lakshmi",
        "phone": "9876543222",
        "password": "DiwaliFestival2026",
        "confirmPassword": "DiwaliFestival2026"
    })
    assert reg.status_code == 201

    # Login with wrong password -> 401
    r_wrong_pwd = client.post("/api/v1/auth/login", json={
        "phone": "9876543222",
        "password": "WrongPassword123"
    })
    assert r_wrong_pwd.status_code == 401
    assert "Invalid mobile number or password" in r_wrong_pwd.get_json()["error"]

    # Login with non-existent phone -> 401
    r_non_exist = client.post("/api/v1/auth/login", json={
        "phone": "9876543999",
        "password": "DiwaliFestival2026"
    })
    assert r_non_exist.status_code == 401
    assert "Invalid mobile number or password" in r_non_exist.get_json()["error"]

    # Login with correct credentials -> 200
    r_ok = client.post("/api/v1/auth/login", json={
        "phone": "9876543222",
        "password": "DiwaliFestival2026"
    })
    assert r_ok.status_code == 200
    login_data = r_ok.get_json()
    assert "token" in login_data
    assert login_data["user"]["displayName"] == "Sita Lakshmi"
    assert login_data["user"]["role"] == "customer"

    # Profile endpoint with JWT works
    profile_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login_data['token']}"})
    assert profile_res.status_code == 200
    assert profile_res.get_json()["displayName"] == "Sita Lakshmi"

def test_login_brute_force_rate_limiting(client):
    target_phone = "9876543555"
    # Register customer
    client.post("/api/v1/auth/register", json={
        "displayName": "RateLimit Test",
        "phone": target_phone,
        "password": "Password123",
        "confirmPassword": "Password123"
    })

    # Attempt 5 consecutive invalid logins
    for _ in range(5):
        res = client.post("/api/v1/auth/login", json={"phone": target_phone, "password": "WrongPassword"})
        assert res.status_code == 401

    # 6th attempt must be rate-limited with HTTP 429
    r_limited = client.post("/api/v1/auth/login", json={"phone": target_phone, "password": "WrongPassword"})
    assert r_limited.status_code == 429
    assert "Too many failed login attempts" in r_limited.get_json()["error"]

def test_admin_bootstrap_and_protected_access(client):
    # Step 1: Trying to access admin dashboard without token must yield 401
    unauth_res = client.get("/api/v1/admin/dashboard")
    assert unauth_res.status_code == 401

    # Step 2: Bootstrap admin with valid secret
    bootstrap_res = client.post("/api/v1/auth/admin/bootstrap", json={
        "bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET,
        "email": Config.ADMIN_BOOTSTRAP_EMAIL,
        "displayName": "KanakaDurga Store Owner"
    })
    assert bootstrap_res.status_code == 200
    admin_data = bootstrap_res.get_json()
    admin_token = admin_data["token"]
    assert admin_data["user"]["role"] == "admin"

    # Step 3: Access admin dashboard with admin token
    auth_res = client.get("/api/v1/admin/dashboard", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert auth_res.status_code == 200
    dashboard = auth_res.get_json()
    assert "metrics" in dashboard
    assert dashboard["metrics"]["activeProducts"] >= 5

def test_customer_cannot_access_admin_api(client):
    cust_id, cust_token = create_test_customer()

    # Customer tries to access admin API -> 403 Forbidden
    forbidden_res = client.get("/api/v1/admin/dashboard", headers={
        "Authorization": f"Bearer {cust_token}"
    })
    assert forbidden_res.status_code == 403

def test_customer_order_isolation(client):
    # Customer A places an order
    cust_a_id, cust_a_token = create_test_customer("Customer A", "+919876543201")
    cust_b_id, cust_b_token = create_test_customer("Customer B", "+919876543202")

    db = get_db()
    comm = db.get_collection("communities").find_one({"name": "Janapriya Utopia"})
    prod = db.get_collection("products").find_one({"$or": [{"sku": "KDF-SPK-01"}, {"sku": "TRC-SPK-01"}]})

    order_payload = {
        "communityId": str(comm["_id"]),
        "deliveryAddress": {
            "customerName": "Customer A",
            "phone": "+919876543201",
            "block": "Block 1",
            "floor": "2",
            "flat": "201"
        },
        "items": [{"productId": str(prod["_id"]), "quantity": 2}]
    }

    place_res = client.post("/api/v1/orders", json=order_payload, headers={
        "Authorization": f"Bearer {cust_a_token}"
    })
    assert place_res.status_code == 201
    order_id = place_res.get_json()["order"]["id"]

    # Customer A can access their own order
    own_res = client.get(f"/api/v1/orders/{order_id}", headers={"Authorization": f"Bearer {cust_a_token}"})
    assert own_res.status_code == 200

    # Customer B MUST be forbidden from accessing Customer A's order
    other_res = client.get(f"/api/v1/orders/{order_id}", headers={"Authorization": f"Bearer {cust_b_token}"})
    assert other_res.status_code == 403
    assert "Forbidden" in other_res.get_json()["error"]

def test_community_block_validation(client):
    db = get_db()
    comm = db.get_collection("communities").find_one({"name": "Janapriya Utopia"})
    assert comm is not None
    comm_id = str(comm["_id"])

    # Valid block test
    valid_res = client.post("/api/v1/communities/validate", json={
        "communityId": comm_id,
        "block": "Block 1"
    })
    assert valid_res.status_code == 200
    assert valid_res.get_json()["valid"] is True

    # Invalid block test -> Must reject
    invalid_res = client.post("/api/v1/communities/validate", json={
        "communityId": comm_id,
        "block": "Block 999"
    })
    assert invalid_res.status_code == 400
    assert invalid_res.get_json()["valid"] is False

def test_order_placement_stock_deduction_and_cancellation_restore(client):
    db = get_db()
    prods_col = db.get_collection("products")
    prod = prods_col.find_one({"$or": [{"sku": "KDF-SPK-01"}, {"sku": "TRC-SPK-01"}]})
    initial_stock = prod["stockQuantity"]

    comm = db.get_collection("communities").find_one({"name": "Janapriya Utopia"})
    comm_id = str(comm["_id"])

    cust_id, cust_token = create_test_customer()

    # Place an order that meets minimum amount
    order_payload = {
        "communityId": comm_id,
        "deliveryAddress": {
            "customerName": "Ramesh Varma",
            "phone": "+919876543210",
            "block": "Block 1",
            "floor": "3",
            "flat": "304",
            "landmark": "Near Main Clubhouse",
            "deliveryInstructions": "Ring the bell, keep COD cash ready"
        },
        "items": [
            {"productId": str(prod["_id"]), "quantity": 6}
        ]
    }

    place_res = client.post("/api/v1/orders", json=order_payload, headers={
        "Authorization": f"Bearer {cust_token}"
    })
    assert place_res.status_code == 201
    order_data = place_res.get_json()["order"]
    order_id = order_data["id"]
    assert order_data["orderNumber"].startswith("KDF-")

    # Verify stock was atomically deducted
    updated_prod = prods_col.find_one({"_id": prod["_id"]})
    assert updated_prod["stockQuantity"] == initial_stock - 6

    # Admin bootstrap & login
    admin_res = client.post("/api/v1/auth/admin/bootstrap", json={
        "bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET
    })
    admin_token = admin_res.get_json()["token"]

    # Admin advances status: Placed -> Accepted
    step1_res = client.post(f"/api/v1/admin/orders/{order_id}/status", json={
        "status": "Accepted",
        "note": "Verified resident community and stock ready"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert step1_res.status_code == 200

    # Admin advances status: Accepted -> Packed
    step2_res = client.post(f"/api/v1/admin/orders/{order_id}/status", json={
        "status": "Packed"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert step2_res.status_code == 200

    # Admin advances status: Packed -> On the Way
    step3_res = client.post(f"/api/v1/admin/orders/{order_id}/status", json={
        "status": "On the Way"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert step3_res.status_code == 200

    # Cancel order -> Inventory must be restored
    cancel_res = client.post(f"/api/v1/admin/orders/{order_id}/status", json={
        "status": "Cancelled",
        "cancellationReason": "Customer requested cancellation before dispatch"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert cancel_res.status_code == 200

    # Verify inventory was restored
    restored_prod = prods_col.find_one({"_id": prod["_id"]})
    assert restored_prod["stockQuantity"] == initial_stock

    # Terminal state check: cannot advance cancelled order
    invalid_adv = client.post(f"/api/v1/admin/orders/{order_id}/status", json={
        "status": "Delivered"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert invalid_adv.status_code == 400

def test_admin_image_upload_security_and_validation(client):
    # Step 1: Unauthenticated upload -> 401
    res_unauth = client.post("/api/v1/admin/upload", data={"file": (io.BytesIO(b"data"), "cracker.png")})
    assert res_unauth.status_code == 401

    # Step 2: Customer role upload -> 403
    cust_id, cust_token = create_test_customer()
    res_cust = client.post("/api/v1/admin/upload", data={"file": (io.BytesIO(b"data"), "cracker.png")}, headers={
        "Authorization": f"Bearer {cust_token}"
    })
    assert res_cust.status_code == 403

    # Step 3: Admin role with missing file -> 400
    admin_res = client.post("/api/v1/auth/admin/bootstrap", json={"bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET})
    admin_token = admin_res.get_json()["token"]

    res_nofile = client.post("/api/v1/admin/upload", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_nofile.status_code == 400

    # Step 4: Admin role with invalid extension -> 400
    Config.CLOUDINARY_CLOUD_NAME = "test-cloud"
    Config.CLOUDINARY_API_KEY = "test-key"
    Config.CLOUDINARY_API_SECRET = "test-secret"
    res_bad_ext = client.post("/api/v1/admin/upload", data={
        "file": (io.BytesIO(b"malicious script"), "script.exe")
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_bad_ext.status_code == 400
    assert "Invalid image format" in res_bad_ext.get_json()["error"]

    # Step 5: Admin role when Cloudinary is not configured -> 400 indicating service unconfigured
    Config.CLOUDINARY_CLOUD_NAME = ""
    res_unconf = client.post("/api/v1/admin/upload", data={
        "file": (io.BytesIO(b"\x89PNG\r\n\x1a\nfakeimage"), "product.png")
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_unconf.status_code == 400
    assert "Cloudinary image hosting is not configured" in res_unconf.get_json()["error"]

def test_community_lifecycle_and_synchronization(client):
    # Step 1: Bootstrap admin
    admin_res = client.post("/api/v1/auth/admin/bootstrap", json={"bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET})
    admin_token = admin_res.get_json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Step 2: Read initial communities from customer perspective
    cust_res_initial = client.get("/api/v1/communities")
    assert cust_res_initial.status_code == 200
    initial_count = cust_res_initial.get_json()["count"]

    # Step 3: Admin adds a new community
    new_comm_payload = {
        "name": "Attapur Heights Luxury Gated",
        "locality": "Attapur Ring Road, Hyderabad",
        "allowedBlocks": ["Tower 1", "Tower 2", "Tower 3"],
        "minimumOrderAmount": 500,
        "deliveryFee": 30,
        "isActive": True
    }
    create_comm_res = client.post("/api/v1/admin/communities", json=new_comm_payload, headers=admin_headers)
    assert create_comm_res.status_code == 201
    created_comm = create_comm_res.get_json()["community"]
    comm_id = created_comm["id"]

    # Step 4: Verify customer immediately sees the new community and count incremented
    cust_res_after_add = client.get("/api/v1/communities")
    assert cust_res_after_add.status_code == 200
    data_after_add = cust_res_after_add.get_json()
    assert data_after_add["count"] == initial_count + 1
    found_comm = next((c for c in data_after_add["communities"] if c["id"] == comm_id), None)
    assert found_comm is not None
    assert found_comm["name"] == "Attapur Heights Luxury Gated"
    assert found_comm["deliveryFee"] == 30

    # Step 5: Admin edits community details
    edit_payload = {
        "name": "Attapur Heights Luxury Villas",
        "minimumOrderAmount": 600,
        "deliveryFee": 0
    }
    edit_res = client.put(f"/api/v1/admin/communities/{comm_id}", json=edit_payload, headers=admin_headers)
    assert edit_res.status_code == 200

    # Step 6: Verify customer sees updated community details
    cust_res_after_edit = client.get("/api/v1/communities")
    data_after_edit = cust_res_after_edit.get_json()
    edited_comm = next(c for c in data_after_edit["communities"] if c["id"] == comm_id)
    assert edited_comm["name"] == "Attapur Heights Luxury Villas"
    assert edited_comm["minimumOrderAmount"] == 600
    assert edited_comm["deliveryFee"] == 0

    # Step 7: Admin deletes the unreferenced community
    delete_res = client.delete(f"/api/v1/admin/communities/{comm_id}", headers=admin_headers)
    assert delete_res.status_code == 200
    assert delete_res.get_json()["deleted"] is True

    # Step 8: Verify customer interface no longer has it and count returned to original
    cust_res_final = client.get("/api/v1/communities")
    data_final = cust_res_final.get_json()
    assert data_final["count"] == initial_count
    assert not any(c["id"] == comm_id for c in data_final["communities"])

def test_product_lifecycle_and_synchronization(client):
    # Step 1: Bootstrap admin
    admin_res = client.post("/api/v1/auth/admin/bootstrap", json={"bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET})
    admin_token = admin_res.get_json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Step 2: Read initial products count from customer perspective
    cust_prods_initial = client.get("/api/v1/products")
    assert cust_prods_initial.status_code == 200
    initial_prod_count = cust_prods_initial.get_json()["count"]

    # Step 3: Admin creates a new product
    prod_payload = {
        "sku": "KDF-TST-99",
        "name": "Super Sky Wonder 120 Shot",
        "category": "Aerial Shots",
        "description": "Multi-color spectacular aerial display fireworks.",
        "mrp": 1200,
        "sellingPrice": 850,
        "packQuantity": 1,
        "packUnit": "box",
        "safetyInformation": "Use outdoors only in open field with adult supervision.",
        "stockQuantity": 25,
        "lowStockThreshold": 5,
        "isFeatured": True,
        "isActive": True
    }
    create_prod_res = client.post("/api/v1/admin/products", json=prod_payload, headers=admin_headers)
    assert create_prod_res.status_code == 201
    created_prod = create_prod_res.get_json()["product"]
    prod_id = created_prod["id"]

    # Step 4: Verify customer immediately sees the new product
    cust_prods_after_add = client.get("/api/v1/products")
    assert cust_prods_after_add.status_code == 200
    prods_data = cust_prods_after_add.get_json()["products"]
    assert len(prods_data) == initial_prod_count + 1
    p_in_cust = next((p for p in prods_data if p["id"] == prod_id), None)
    assert p_in_cust is not None
    assert p_in_cust["name"] == "Super Sky Wonder 120 Shot"
    assert p_in_cust["sellingPrice"] == 850
    assert p_in_cust["stockQuantity"] == 25

    # Step 5: Admin adjusts stock (+15)
    stock_res = client.post("/api/v1/admin/stock", json={
        "productId": prod_id,
        "quantityChange": 15,
        "note": "Diwali fresh supply batch arrived"
    }, headers=admin_headers)
    assert stock_res.status_code == 200
    assert stock_res.get_json()["newStockQuantity"] == 40

    # Step 6: Verify customer details endpoint shows updated stock
    details_res = client.get(f"/api/v1/products/{prod_id}")
    assert details_res.status_code == 200
    assert details_res.get_json()["stockQuantity"] == 40

    # Step 7: Admin edits price and name
    edit_prod_res = client.put(f"/api/v1/admin/products/{prod_id}", json={
        "name": "Super Sky Wonder 120 Shot Gold Edition",
        "sellingPrice": 799,
        "mrp": 1200
    }, headers=admin_headers)
    assert edit_prod_res.status_code == 200

    # Step 8: Verify customer sees updated name and price
    details_res_2 = client.get(f"/api/v1/products/{prod_id}")
    assert details_res_2.get_json()["name"] == "Super Sky Wonder 120 Shot Gold Edition"
    assert details_res_2.get_json()["sellingPrice"] == 799

    # Step 9: Admin deletes unreferenced product
    del_res = client.delete(f"/api/v1/admin/products/{prod_id}", headers=admin_headers)
    assert del_res.status_code == 200

    # Step 10: Verify customer no longer sees the deleted product
    cust_prods_final = client.get("/api/v1/products")
    assert cust_prods_final.get_json()["count"] == initial_prod_count
    assert not any(p["id"] == prod_id for p in cust_prods_final.get_json()["products"])

def test_admin_notifications_and_resend_integration(client):
    # Step 1: Admin bootstrap
    admin_res = client.post("/api/v1/auth/admin/bootstrap", json={"bootstrapSecret": Config.ADMIN_BOOTSTRAP_SECRET})
    admin_token = admin_res.get_json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Step 2: Unauthenticated / Customer access to notifications must be rejected
    res_unauth = client.get("/api/v1/admin/notifications")
    assert res_unauth.status_code == 401

    cust_id, cust_token = create_test_customer("Notification Test Cust", "+919876500001")
    res_cust = client.get("/api/v1/admin/notifications", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_cust.status_code == 403

    # Step 3: Admin gets initial notifications
    init_notif_res = client.get("/api/v1/admin/notifications", headers=admin_headers)
    assert init_notif_res.status_code == 200
    initial_unread = init_notif_res.get_json()["unreadCount"]

    # Step 4: Customer places an order
    db = get_db()
    comm = db.get_collection("communities").find_one({"name": "Janapriya Utopia"})
    prod = db.get_collection("products").find_one({"isActive": True})

    order_payload = {
        "communityId": str(comm["_id"]),
        "deliveryAddress": {
            "customerName": "Suresh Reddy",
            "phone": "+919876500001",
            "block": "Block 1",
            "floor": "4",
            "flat": "402",
            "landmark": "Near Central Park Clubhouse",
            "deliveryInstructions": "Please call 5 mins before reaching society gate"
        },
        "items": [{"productId": str(prod["_id"]), "quantity": 5}]
    }

    with patch("requests.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "re_test_mock_email_001"}
        mock_post.return_value = mock_response

        place_res = client.post("/api/v1/orders", json=order_payload, headers={"Authorization": f"Bearer {cust_token}"})
        assert place_res.status_code == 201
        order_data = place_res.get_json()["order"]
        order_id = order_data["id"]

        # Step 5: Verify order has isReadByAdmin=False and emailNotification recorded
        placed_order = db.get_collection("orders").find_one({"_id": ObjectId(order_id)})
        assert placed_order["isReadByAdmin"] is False
        assert "emailNotification" in placed_order
        assert placed_order["emailNotification"]["success"] is True
        assert placed_order["emailNotification"]["resendId"] == "re_test_mock_email_001"
        assert mock_post.called

    # Step 6: Verify unreadCount incremented by 1
    after_order_notifs = client.get("/api/v1/admin/notifications", headers=admin_headers)
    assert after_order_notifs.status_code == 200
    notif_data = after_order_notifs.get_json()
    assert notif_data["unreadCount"] == initial_unread + 1

    # Order alert is present in notifications
    found_alert = next((n for n in notif_data["notifications"] if n["orderId"] == order_id), None)
    assert found_alert is not None
    assert found_alert["orderNumber"] == order_data["orderNumber"]
    assert found_alert["customerName"] == "Suresh Reddy"
    assert found_alert["isRead"] is False

    # Step 7: Mark single notification read
    mark_read_res = client.post(f"/api/v1/admin/notifications/{order_id}/read", headers=admin_headers)
    assert mark_read_res.status_code == 200

    after_read_notifs = client.get("/api/v1/admin/notifications", headers=admin_headers)
    assert after_read_notifs.get_json()["unreadCount"] == initial_unread

    # Step 8: Mark all read
    mark_all_res = client.post("/api/v1/admin/notifications/mark-all-read", headers=admin_headers)
    assert mark_all_res.status_code == 200
    final_notifs = client.get("/api/v1/admin/notifications", headers=admin_headers)
    assert final_notifs.get_json()["unreadCount"] == 0

def test_email_service_fail_safe_does_not_break_orders(client):
    cust_id, cust_token = create_test_customer("FailSafe Customer", "+919876500002")
    db = get_db()
    comm = db.get_collection("communities").find_one({"name": "Janapriya Utopia"})
    prod = db.get_collection("products").find_one({"isActive": True})

    order_payload = {
        "communityId": str(comm["_id"]),
        "deliveryAddress": {
            "customerName": "Test Customer",
            "phone": "+919876500002",
            "block": "Block 2",
            "floor": "1",
            "flat": "101"
        },
        "items": [{"productId": str(prod["_id"]), "quantity": 3}]
    }

    # Simulate network failure / Resend downtime
    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Simulated Resend API timeout")):
        place_res = client.post("/api/v1/orders", json=order_payload, headers={"Authorization": f"Bearer {cust_token}"})
        # Order must still succeed with 201!
        assert place_res.status_code == 201
        order_id = place_res.get_json()["order"]["id"]

        order_in_db = db.get_collection("orders").find_one({"_id": ObjectId(order_id)})
        assert order_in_db is not None
        # Failed email info is recorded cleanly without crashing the customer order
        assert order_in_db["emailNotification"]["success"] is False
        assert "Simulated Resend API timeout" in order_in_db["emailNotification"]["error"]

if __name__ == "__main__":
    pytest.main(["-v", "test_api.py"])

if __name__ == "__main__":
    pytest.main(["-v", "test_api.py"])
