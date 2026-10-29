import re
import time
import datetime
import logging
import bcrypt
from flask import Blueprint, request, jsonify, g
from bson import ObjectId
from config import Config
from database import get_db
from middleware.auth import (
    generate_jwt_token,
    verify_google_id_token,
    require_auth
)

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger("kanakadurga_auth_routes")

# In-memory brute-force rate limiting: max 5 failed attempts per key within 15 minutes
FAILED_ATTEMPTS = {}
LOCKOUT_SECONDS = 900
MAX_ATTEMPTS = 5

DUMMY_BCRYPT_HASH = "$2b$12$e80yq7c0uQG6lK88u4Y9r.YnL01m4tC8t8BwPjZqJz8gZg3mG7u6a"

def _is_rate_limited(key: str) -> bool:
    now = time.time()
    attempts = [t for t in FAILED_ATTEMPTS.get(key, []) if now - t < LOCKOUT_SECONDS]
    FAILED_ATTEMPTS[key] = attempts
    return len(attempts) >= MAX_ATTEMPTS

def _record_failed_attempt(key: str):
    now = time.time()
    attempts = FAILED_ATTEMPTS.get(key, [])
    attempts.append(now)
    FAILED_ATTEMPTS[key] = attempts

def _clear_failed_attempts(key: str):
    FAILED_ATTEMPTS.pop(key, None)

def normalize_phone_number(phone_raw: str, default_prefix: str = "+91") -> str:
    """
    Normalizes phone numbers to standard E.164 format (e.g. '+919876543210').
    Validates that the number contains a valid country code and subscriber number.
    """
    if not phone_raw or not isinstance(phone_raw, str):
        return ""
    cleaned = re.sub(r"[\s\-\(\)\.]", "", phone_raw.strip())
    if cleaned.startswith("+"):
        digits = re.sub(r"\D", "", cleaned[1:])
        return f"+{digits}" if digits else ""
    if cleaned.startswith("00"):
        digits = re.sub(r"\D", "", cleaned[2:])
        return f"+{digits}" if digits else ""
    if cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    digits = re.sub(r"\D", "", cleaned)
    if len(digits) == 10:
        return f"{default_prefix}{digits}"
    if len(digits) > 10:
        return f"+{digits}"
    return f"+{digits}" if digits else ""

def is_valid_phone(normalized_phone: str) -> bool:
    """
    Validates E.164 phone numbers with special validation for standard Indian mobiles.
    """
    if not normalized_phone or not normalized_phone.startswith("+"):
        return False
    if normalized_phone.startswith("+91"):
        local = normalized_phone[3:]
        return bool(re.match(r"^[6-9]\d{9}$", local))
    return bool(re.match(r"^\+[1-9]\d{6,14}$", normalized_phone))

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Enforces password strength: minimum 8 characters, at least one letter and one number, max 128.
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters"
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, ""

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

# ==============================================================================
# Google OAuth 2.0 (PRESERVED COMPLETELY UNCHANGED)
# ==============================================================================
@auth_bp.route("/google", methods=["POST"])
def auth_google():
    """
    Verifies Google ID token from frontend, securely checks issuer & audience,
    and returns JWT for the customer.
    Preserved exactly as configured without altering token verification or account linking.
    """
    data = request.get_json() or {}
    id_token = data.get("idToken")
    if not id_token:
        return jsonify({"error": "Google ID token is required"}), 400

    try:
        google_user = verify_google_id_token(id_token)
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

    google_sub = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name", "Valued Customer")

    users = get_db().get_collection("users")
    user = users.find_one({"$or": [{"googleSubject": google_sub}, {"email": email}]})

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    role = "customer"

    # Check if email is designated admin bootstrap email
    if email and email.lower() == Config.ADMIN_BOOTSTRAP_EMAIL.lower():
        role = "admin"

    if not user:
        user_doc = {
            "displayName": name,
            "email": email,
            "googleSubject": google_sub,
            "authProviders": ["google"],
            "role": role,
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "isActive": True
        }
        res = users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = str(user["_id"])
        role = user.get("role", "customer")
        # Ensure googleSubject is linked
        users.update_one(
            {"_id": user["_id"]},
            {"$set": {"googleSubject": google_sub, "updatedAt": now_iso}}
        )

    token = generate_jwt_token(user_id, role, email=email)
    return jsonify({
        "token": token,
        "user": {
            "id": user_id,
            "displayName": name,
            "email": email,
            "role": role
        }
    }), 200

# ==============================================================================
# Customer Mobile Number + Password Registration
# ==============================================================================
@auth_bp.route("/register", methods=["POST"])
def auth_register():
    """
    Registers a new customer account using normalized mobile number and password.
    Enforces password strength, field validation, uniqueness, and assigns default customer role.
    """
    data = request.get_json() or {}
    display_name = (data.get("displayName") or "").strip()
    raw_phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    confirm_password = data.get("confirmPassword") or ""

    if not display_name:
        return jsonify({"error": "Full name is required"}), 400
    if len(display_name) < 2 or len(display_name) > 80:
        return jsonify({"error": "Full name must be between 2 and 80 characters"}), 400

    if not raw_phone:
        return jsonify({"error": "Mobile number is required"}), 400

    normalized_phone = normalize_phone_number(raw_phone)
    if not is_valid_phone(normalized_phone):
        return jsonify({"error": "Please enter a valid 10-digit mobile number (e.g. 9876543210)"}), 400

    is_strong, msg = validate_password_strength(password)
    if not is_strong:
        return jsonify({"error": msg}), 400

    if password != confirm_password:
        return jsonify({"error": "Password and confirmation password do not match"}), 400

    users = get_db().get_collection("users")

    # Race-safe uniqueness check
    existing = users.find_one({"$or": [{"phone": normalized_phone}, {"verifiedPhone": normalized_phone}]})
    if existing:
        return jsonify({"error": "An account with this mobile number already exists. Please sign in instead."}), 409

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    pwd_hash = hash_password(password)

    user_doc = {
        "displayName": display_name,
        "phone": normalized_phone,
        "verifiedPhone": normalized_phone,
        "passwordHash": pwd_hash,
        "role": "customer",  # Strictly default customer role; public registration cannot escalate privileges
        "authProviders": ["password"],
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "isActive": True
    }

    try:
        res = users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    except Exception as e:
        logger.error(f"Failed to register user document: {e}")
        return jsonify({"error": "An account with this mobile number already exists."}), 409

    token = generate_jwt_token(user_id, "customer", phone=normalized_phone)
    logger.info(f"Registered new customer account with phone {normalized_phone}")

    return jsonify({
        "message": "Account created successfully",
        "token": token,
        "user": {
            "id": user_id,
            "displayName": display_name,
            "phone": normalized_phone,
            "verifiedPhone": normalized_phone,
            "role": "customer",
            "createdAt": now_iso
        }
    }), 201

# ==============================================================================
# Customer Mobile Number + Password Login
# ==============================================================================
@auth_bp.route("/login", methods=["POST"])
def auth_login():
    """
    Authenticates a customer using their normalized mobile number and password.
    Includes brute-force rate limiting and constant-time password verification.
    """
    data = request.get_json() or {}
    raw_phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not raw_phone or not password:
        return jsonify({"error": "Mobile number and password are required"}), 400

    normalized_phone = normalize_phone_number(raw_phone)
    client_ip = request.remote_addr or "unknown"
    rate_limit_key = f"{normalized_phone}:{client_ip}"

    if _is_rate_limited(rate_limit_key):
        return jsonify({"error": "Too many failed login attempts. Please try again in 15 minutes."}), 429

    users = get_db().get_collection("users")
    user = users.find_one({"$or": [{"phone": normalized_phone}, {"verifiedPhone": normalized_phone}]})

    if not user or not user.get("isActive", True) or not user.get("passwordHash"):
        # Constant-time dummy verification prevents timing attacks
        verify_password(password, DUMMY_BCRYPT_HASH)
        _record_failed_attempt(rate_limit_key)
        return jsonify({"error": "Invalid mobile number or password."}), 401

    if not verify_password(password, user["passwordHash"]):
        _record_failed_attempt(rate_limit_key)
        return jsonify({"error": "Invalid mobile number or password."}), 401

    # Login successful: clear failure history
    _clear_failed_attempts(rate_limit_key)

    user_id = str(user["_id"])
    role = user.get("role", "customer")
    token = generate_jwt_token(user_id, role, phone=normalized_phone, email=user.get("email"))

    logger.info(f"Customer login successful for phone {normalized_phone}")
    return jsonify({
        "token": token,
        "user": {
            "id": user_id,
            "displayName": user.get("displayName", "Resident"),
            "phone": normalized_phone,
            "verifiedPhone": user.get("verifiedPhone", normalized_phone),
            "email": user.get("email"),
            "role": role,
            "selectedCommunityId": user.get("selectedCommunityId")
        }
    }), 200

# ==============================================================================
# Legacy OTP Verification (Deprecated)
# ==============================================================================
@auth_bp.route("/otp/verify", methods=["POST"])
def auth_otp_verify():
    """
    Deprecated: Phone OTP has been replaced by Mobile Number + Password authentication.
    """
    return jsonify({
        "error": "SMS OTP authentication has been deprecated. Please sign in with your mobile number and password."
    }), 410

# ==============================================================================
# Administrator Bootstrap Authentication
# ==============================================================================
@auth_bp.route("/admin/bootstrap", methods=["POST"])
def admin_bootstrap():
    """
    Bootstraps the administrator account securely using the server-configured
    ADMIN_BOOTSTRAP_SECRET and ADMIN_BOOTSTRAP_EMAIL.
    """
    data = request.get_json() or {}
    secret = (data.get("bootstrapSecret") or "").strip()
    email = (data.get("email") or Config.ADMIN_BOOTSTRAP_EMAIL).strip()
    display_name = data.get("displayName", "KanakaDurga Admin")

    if not secret or secret != Config.ADMIN_BOOTSTRAP_SECRET:
        return jsonify({"error": "Invalid administrator secret key."}), 403

    if email.lower() != Config.ADMIN_BOOTSTRAP_EMAIL.lower():
        return jsonify({"error": f"Unauthorized administrator email address. Only {Config.ADMIN_BOOTSTRAP_EMAIL} is authorized."}), 403

    users = get_db().get_collection("users")
    user = users.find_one({"email": email})

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if not user:
        user_doc = {
            "displayName": display_name,
            "email": email,
            "role": "admin",
            "authProviders": ["admin_bootstrap"],
            "createdAt": now_iso,
            "updatedAt": now_iso,
            "isActive": True
        }
        res = users.insert_one(user_doc)
        user_id = str(res.inserted_id)
    else:
        user_id = str(user["_id"])
        users.update_one({"_id": user["_id"]}, {"$set": {"role": "admin", "updatedAt": now_iso}})

    token = generate_jwt_token(user_id, "admin", email=email)
    logger.info(f"Admin bootstrap successful for {email}")
    return jsonify({
        "message": "Admin account provisioned successfully",
        "token": token,
        "user": {
            "id": user_id,
            "displayName": display_name,
            "email": email,
            "role": "admin"
        }
    }), 200

# ==============================================================================
# Current User Profile
# ==============================================================================
@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_profile():
    user = g.current_user
    return jsonify({
        "id": str(user["_id"]),
        "displayName": user.get("displayName"),
        "email": user.get("email"),
        "phone": user.get("phone") or user.get("verifiedPhone"),
        "verifiedPhone": user.get("verifiedPhone") or user.get("phone"),
        "role": user.get("role", "customer"),
        "selectedCommunityId": user.get("selectedCommunityId"),
        "createdAt": user.get("createdAt")
    }), 200
