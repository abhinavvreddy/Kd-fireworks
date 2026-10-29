import os
from dotenv import load_dotenv

# Load .env if present in backend/ or root
backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
load_dotenv()

class Config:
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    PORT = int(os.getenv("PORT", "5000"))
    SECRET_KEY = os.getenv("SECRET_KEY", "kanakadurga-fireworks-dev-secret-key-attapur-2026")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "72"))
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

    # MongoDB Atlas
    MONGODB_URI = os.getenv("MONGODB_URI", "")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "kanakadurga_fireworks")

    # Admin bootstrap
    ADMIN_BOOTSTRAP_EMAIL = os.getenv("ADMIN_BOOTSTRAP_EMAIL", "abh1navreddy9095@gmail.com")
    ADMIN_BOOTSTRAP_PHONE = os.getenv("ADMIN_BOOTSTRAP_PHONE", "+919177416913")
    ADMIN_BOOTSTRAP_SECRET = os.getenv("ADMIN_BOOTSTRAP_SECRET", "KanakaDurgaFireWorks2026")

    # Google Auth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

    # Firebase Auth
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")

    # Cloudinary
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

    # Resend Email Notifications
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "abh1navreddy9095@gmail.com")
    RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    @classmethod
    def is_production(cls):
        return cls.ENVIRONMENT.lower() == "production"

    @classmethod
    def get_frontend_url(cls):
        """
        Returns the canonical, fully-qualified frontend origin URL (e.g. https://kd-fireworks.vercel.app).
        Safely resolves wildcard '*', empty values, or Vercel production system variables.
        """
        origin = (cls.FRONTEND_ORIGIN or "").strip().rstrip("/")
        if origin and origin != "*":
            if not origin.startswith("http://") and not origin.startswith("https://"):
                return f"https://{origin}"
            return origin

        vercel_prod = os.getenv("VERCEL_PROJECT_PRODUCTION_URL") or os.getenv("VERCEL_URL")
        if vercel_prod:
            return f"https://{vercel_prod.rstrip('/')}"

        return "https://kd-fireworks.vercel.app"

    @classmethod
    def validate(cls):
        warnings = []
        if not cls.MONGODB_URI:
            warnings.append("MONGODB_URI is not set. Standalone in-memory fallback database will be used for testing.")
        if not cls.GOOGLE_CLIENT_ID:
            warnings.append("GOOGLE_CLIENT_ID is not configured. Google Sign-In requests will be rejected until configured.")
        if not cls.FIREBASE_PROJECT_ID:
            warnings.append("FIREBASE_PROJECT_ID is not configured. Phone OTP requests will be rejected until configured.")
        if not cls.CLOUDINARY_CLOUD_NAME:
            warnings.append("CLOUDINARY_CLOUD_NAME is not configured. Product image uploads will be rejected until configured.")
        if not cls.RESEND_API_KEY:
            warnings.append("RESEND_API_KEY is not configured. Email notifications will be skipped.")
        return warnings
