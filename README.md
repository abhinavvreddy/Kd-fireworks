# KanakaDurga FireWorks — Community-Restricted E-commerce Platform
**Location: Attapur, Hyderabad, Telangana, India**  
**Stack: React (Vite, Tailwind CSS) + Python Flask REST API + MongoDB Atlas (PyMongo) + Cash on Delivery (COD)**

---

## 1. Architecture Overview

KanakaDurga FireWorks is an end-to-end full-stack e-commerce system built specifically for the local festive crackers market in Attapur, Hyderabad. The platform enforces **community-restricted ordering** (only verified residents within society-approved blocks can checkout), strictly uses **Cash on Delivery (COD)**, guarantees **atomic stock deduction** without overselling, and includes a comprehensive **Store Administrator Dashboard**.

```
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend (Port 3000)                  │
│  - Top Bar Contract (Wordmark, Nav, Shopping Bag, Admin)    │
│  - Luxury Midnight Navy & Metallic Gold Festive Visuals     │
│  - Product Catalogue, Search & Dynamic Category Filters     │
│  - Slide-Over Shopping Bag with Minimum Order Checks        │
│  - Doorstep Checkout with Block/Society Validation          │
│  - Customer Order Tracking with 5-Stage Live Timeline       │
│  - Full Admin Portal (Metrics, Inventory, Societies, Orders)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (/api/v1)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Python Flask REST API (Port 5000)               │
│  - Blueprint Architecture (auth, products, communities, etc)│
│  - JWT & RBAC Middleware (@require_auth, @require_admin)    │
│  - Google ID Token Signature & Audience Verification        │
│  - Firebase Phone OTP Verification                          │
│  - Atomic Inventory Protection & Oversell Prevention        │
│  - Order Lifecycle Machine (Placed -> Accepted -> Delivered)│
│  - Inventory Restocking on Cancellation                     │
│  - Cloudinary Image Upload & Size/Format Validation         │
└──────────────────────────────┬──────────────────────────────┘
                               │ PyMongo
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               MongoDB Atlas (Free Tier M0)                  │
│  Collections: users, communities, products, orders,         │
│  orderEvents, inventoryEvents. Indexed for speed & safety.  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Quick Start Guide

### Running Frontend (React + Vite)
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server (Port 3000)
npm run dev
```

### Running Backend (Python Flask + PyMongo)
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Edit .env and enter your MONGODB_URI (or run with built-in memory fallback)

# 5. Seed initial Attapur communities and demo festive products
python seed.py

# 6. Start the Flask REST API (Port 5000)
python app.py
```

---

## 3. Free-Tier Services Setup Guide

### A. MongoDB Atlas (Database)
1. Sign up for a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Sandbox cluster** (512 MB storage, shared RAM, zero cost forever).
3. Under **Database Access**, create a user `kanakadurga_user` with a secure password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow from anywhere) or your cloud host's IP.
5. In your cluster dashboard, click **Connect -> Drivers -> Python (PyMongo)** to copy your connection string:
   ```
   MONGODB_URI="mongodb+srv://kanakadurga_user:<password>@cluster0.abcde.mongodb.net/kanakadurga_fireworks?retryWrites=true&w=majority"
   ```

### B. Google OAuth 2.0 Web Client
1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create a project named `KanakaDurga FireWorks`.
3. Configure the OAuth consent screen and create an **OAuth 2.0 Client ID (Web Application)**.
4. Add authorized JavaScript origins: `http://localhost:3000`.
5. Copy the Client ID into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   ```

### C. Firebase Phone OTP Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/) on the free Spark plan.
2. Under **Authentication -> Sign-in method**, enable **Phone**.
3. Under **Project Settings -> Service accounts**, download your service account JSON file.
4. Set path in `backend/.env`:
   ```
   FIREBASE_PROJECT_ID="kanakadurga-fireworks"
   FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/service-account.json"
   ```

### D. Cloudinary Image Storage
1. Sign up for a free Cloudinary tier account (25 monthly credits).
2. Obtain Cloud Name, API Key, and API Secret from your dashboard and place in `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME="kanakadurga-fireworks"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

---

## 4. Secure Admin Bootstrap Procedure

To prevent hardcoded admin credentials:
1. In `backend/.env`, configure a random string for `ADMIN_BOOTSTRAP_SECRET`:
   ```
   ADMIN_BOOTSTRAP_SECRET="kanakadurga-admin-bootstrap-2026"
   ADMIN_BOOTSTRAP_EMAIL="admin@kanakadurgafireworks.com"
   ```
2. In the React app, open **Sign In -> Admin Bootstrap** tab.
3. Enter the configured bootstrap secret.
4. The backend verifies the secret, promotes the account to the `admin` role in MongoDB, and issues an Admin JWT.

---

## 5. API Reference (`/api/v1`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | System status and database connectivity |
| `GET` | `/products` | Public | List active products with search, category, sort |
| `GET` | `/products/<id>` | Public | Detailed specifications of a product |
| `GET` | `/communities` | Public | List active Attapur communities and allowed blocks |
| `POST` | `/communities/validate` | Public | Validates community and residential block |
| `POST` | `/auth/google` | Public | Google ID token verification and customer JWT |
| `POST` | `/auth/otp/verify` | Public | Phone OTP token verification |
| `POST` | `/auth/admin/bootstrap` | Secret | Secure bootstrap for store admin |
| `GET` | `/auth/me` | Customer | Profile and verified phone details |
| `POST` | `/orders` | Customer | Creates verified COD order with atomic stock deduction |
| `GET` | `/orders/me` | Customer | Lists current customer's order history |
| `GET` | `/orders/<id>` | Customer/Admin | Full order details with event timeline |
| `GET` | `/admin/dashboard` | Admin | Metrics: revenue, pipeline value, order counts |
| `GET/POST`| `/admin/products` | Admin | Product CRUD and auto-calculated discount % |
| `PUT/DELETE`| `/admin/products/<id>`| Admin | Update or safe-deactivate product |
| `POST` | `/admin/stock` | Admin | Atomic inventory adjustment with audit logging |
| `POST` | `/admin/upload` | Admin | Validates and uploads product image to Cloudinary |
| `GET/POST`| `/admin/communities` | Admin | Manage eligible societies and allowed blocks |
| `GET` | `/admin/orders` | Admin | Search and filter orders by status |
| `POST` | `/admin/orders/<id>/status`| Admin | Progress status or cancel with inventory restore |

---

## 6. Manual Testing Checklist

- [x] **Customer Browsing**: Filter by category (Sparklers, Chakkars, Anars), search by keyword, sort by discount.
- [x] **Cart & Minimum Order**: Add items to bag, verify minimum order warning for selected community, observe doorstep delivery charge calculation.
- [x] **Community-Restricted Checkout**: Select "Janapriya Utopia", select "Block 1", enter flat number and phone, submit Cash on Delivery order.
- [x] **Order Number & Timeline**: Receive human-readable order number (`KDF-2026-XXXX`), view 5-stage timeline under "Track Orders".
- [x] **Admin Authentication**: Bootstrap admin account using secret token.
- [x] **Product Inventory**: Add new cracker SKU, adjust stock quantity, verify low-stock indicator.
- [x] **Product Image Upload**: Admin can upload PNG/JPG/WEBP images to Cloudinary with file size & extension validation.
- [x] **Order Processing Pipeline**: Transition order from `Placed` -> `Accepted` -> `Packed` -> `On the Way` -> `Delivered`.
- [x] **Order Cancellation & Stock Restoration**: Cancel an order and verify that units are immediately and atomically restored to available store stock.
