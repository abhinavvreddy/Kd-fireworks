import datetime
from flask import Blueprint, jsonify
from config import Config
from database import get_db

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    db = get_db()
    warnings = Config.validate()
    return jsonify({
        "status": "healthy",
        "service": "KanakaDurga FireWorks REST API",
        "location": "Attapur, Hyderabad, Telangana",
        "environment": Config.ENVIRONMENT,
        "databaseConnected": db.is_connected,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "warnings": warnings
    }), 200
