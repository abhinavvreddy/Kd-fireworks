import time
import jwt
import functools
import logging
from flask import request, jsonify, g
from bson import ObjectId
from config import Config
from database import get_db

logger = logging.getLogger("kanakadurga_auth")

def generate_jwt_token(user_id: str, role: str, email: str = None, phone: str = None) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "email": email,
        "phone": phone,
        "iat": int(time.time()),
        "exp": int(time.time()) + (Config.JWT_EXPIRY_HOURS * 3600)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise ValueError("Authentication token has expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid authentication token.")

def verify_google_id_token(id_token_str: str) -> dict:
    """
    Verifies Google ID token using google-auth.
    Validates audience, issuer, signature and expiration.
    Strictly enforces server configuration without simulating fake successful authentication.
    """
    if not Config.GOOGLE_CLIENT_ID:
        raise ValueError("Google Sign-In is not configured on the server. Please set GOOGLE_CLIENT_ID in the backend environment.")
    
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        id_info = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            Config.GOOGLE_CLIENT_ID
        )
        if id_info['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong token issuer.')
        return id_info
    except Exception as e:
        logger.error(f"Google ID token verification failed: {e}")
        raise ValueError(f"Google authentication failed: {str(e)}")

def verify_firebase_otp_token(id_token_str: str) -> dict:
    """
    Verifies Firebase ID token using firebase-admin SDK.
    Extracts verified phone number.
    Strictly enforces server configuration without simulating fake successful authentication.
    """
    if not Config.FIREBASE_PROJECT_ID:
        raise ValueError("Mobile OTP service (Firebase) is not configured on the server. Please set FIREBASE_PROJECT_ID and service credentials in the backend environment.")

    try:
        import firebase_admin
        from firebase_admin import auth, credentials
        import os

        if not firebase_admin._apps:
            if Config.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(Config.FIREBASE_SERVICE_ACCOUNT_PATH):
                cred = credentials.Certificate(Config.FIREBASE_SERVICE_ACCOUNT_PATH)
                firebase_admin.initialize_app(cred, {"projectId": Config.FIREBASE_PROJECT_ID})
            else:
                firebase_admin.initialize_app(options={"projectId": Config.FIREBASE_PROJECT_ID})

        decoded_token = auth.verify_id_token(id_token_str)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        raise ValueError(f"Phone verification failed: {str(e)}")

def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401
        
        token = auth_header.split(" ")[1]
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get("sub")
            users_col = get_db().get_collection("users")
            user = users_col.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
            
            if not user or not user.get("isActive", True):
                return jsonify({"error": "User account inactive or not found"}), 401
            
            g.current_user = user
            g.user_id = str(user["_id"])
            g.user_role = user.get("role", "customer")
        except Exception as e:
            return jsonify({"error": str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Admin authentication required"}), 401
        
        token = auth_header.split(" ")[1]
        try:
            payload = decode_jwt_token(token)
            if payload.get("role") != "admin":
                return jsonify({"error": "Forbidden: Admin privileges required"}), 403
            
            user_id = payload.get("sub")
            users_col = get_db().get_collection("users")
            user = users_col.find_one({"_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id})
            
            if not user or user.get("role") != "admin":
                return jsonify({"error": "Forbidden: Unauthorized admin access"}), 403
            
            g.current_user = user
            g.user_id = str(user["_id"])
            g.user_role = "admin"
        except Exception as e:
            return jsonify({"error": str(e)}), 401
        
        return f(*args, **kwargs)
    return decorated
