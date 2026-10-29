import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from database import get_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("kanakadurga_backend")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS configuration: supports single origin, comma-separated production domains, and local development
    raw_origins = [o.strip() for o in Config.FRONTEND_ORIGIN.split(",") if o.strip()] if Config.FRONTEND_ORIGIN else []
    allowed_origins = list(set(raw_origins + ["http://localhost:3000", "http://127.0.0.1:3000"]))
    CORS(app, origins=allowed_origins, supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

    # Initialize DB indexes and initial data if empty
    db = get_db()
    try:
        db.init_indexes()
        products_col = db.get_collection("products")
        if products_col.count_documents({}) == 0:
            from seed import seed_database
            seed_database()
    except Exception as e:
        logger.warning(f"Index creation or seeding notice: {e}")

    # Register blueprints under /api/v1
    from routes.health import health_bp
    from routes.auth import auth_bp
    from routes.products import products_bp
    from routes.communities import communities_bp
    from routes.orders import orders_bp
    from routes.admin import admin_bp

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(products_bp, url_prefix="/api/v1/products")
    app.register_blueprint(communities_bp, url_prefix="/api/v1/communities")
    app.register_blueprint(orders_bp, url_prefix="/api/v1/orders")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")

    # Global error handlers (Security: never leak stack traces)
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def handle_internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"error": "An internal server error occurred. Please try again later."}), 500

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"error": "Bad request"}), 400

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", Config.PORT))
    try:
        logger.info(f"Starting KanakaDurga FireWorks Flask API on port {port} ({Config.ENVIRONMENT})")
        app.run(host="0.0.0.0", port=port, debug=(Config.ENVIRONMENT == "development"))
    except OSError as e:
        if "Address already in use" in str(e):
            fallback_port = 5001 if port == 5000 else 5002
            logger.warning(f"Port {port} is occupied (commonly macOS AirPlay on port 5000). Automatically switching to port {fallback_port}...")
            app.run(host="0.0.0.0", port=fallback_port, debug=(Config.ENVIRONMENT == "development"))
        else:
            raise e
