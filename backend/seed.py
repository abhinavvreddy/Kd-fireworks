import datetime
import logging
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kanakadurga_seed")

def seed_database():
    db = get_db()
    communities_col = db.get_collection("communities")
    products_col = db.get_collection("products")
    users_col = db.get_collection("users")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # 1. Seed Attapur, Hyderabad Communities
    communities_data = [
        {
            "name": "Janapriya Utopia",
            "locality": "Attapur, Hyderabad",
            "allowedBlocks": ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"],
            "minimumOrderAmount": 300.0,
            "deliveryFee": 0.0,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "name": "Silpa Green Valley",
            "locality": "Attapur, Hyderabad",
            "allowedBlocks": ["Tower A", "Tower B", "Tower C", "Villas Phase 1"],
            "minimumOrderAmount": 300.0,
            "deliveryFee": 0.0,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "name": "Trendset Winz",
            "locality": "Attapur, Hyderabad",
            "allowedBlocks": ["Block A", "Block B", "Block C", "Block D"],
            "minimumOrderAmount": 300.0,
            "deliveryFee": 0.0,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "name": "Fortune Butterfly City",
            "locality": "Near Attapur, Hyderabad",
            "allowedBlocks": ["Cluster 1", "Cluster 2", "Cluster 3"],
            "minimumOrderAmount": 300.0,
            "deliveryFee": 0.0,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "name": "Maple Town",
            "locality": "Attapur Express Highway",
            "allowedBlocks": ["Row A", "Row B", "Row C", "Row D"],
            "minimumOrderAmount": 300.0,
            "deliveryFee": 0.0,
            "isActive": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    for comm in communities_data:
        existing = communities_col.find_one({"name": comm["name"]})
        if not existing:
            communities_col.insert_one(comm)
            logger.info(f"Seeded community: {comm['name']}")

    # 2. Seed Demonstration Products
    products_data = [
        {
            "sku": "KDF-SPK-01",
            "name": "15cm Electric Gold Sparklers",
            "slug": "15cm-electric-gold-sparklers",
            "category": "Sparklers",
            "description": "Premium slow-burning golden electric sparklers with crackling embers. Ideal for family celebrations and children under supervision.",
            "images": ["/assets/sparklers.png"],
            "mrp": 250.0,
            "sellingPrice": 180.0,
            "packQuantity": 10,
            "packUnit": "pieces / box",
            "safetyInformation": "Maintain arm-length distance. Dip burnt wires immediately into a bucket of water. Keep away from synthetic clothes.",
            "stockQuantity": 85,
            "lowStockThreshold": 15,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-SPK-02",
            "name": "30cm Royal Deluxe Sparklers",
            "slug": "30cm-royal-deluxe-sparklers",
            "category": "Sparklers",
            "description": "Long-duration dazzling metallic gold sparklers lasting over 90 seconds of intense, low-smoke golden sparkle.",
            "images": ["/assets/sparklers-royal.png"],
            "mrp": 450.0,
            "sellingPrice": 320.0,
            "packQuantity": 5,
            "packUnit": "giant pieces / box",
            "safetyInformation": "Hold firmly by the wire end. Do not point towards persons or flammable objects. Adult supervision strictly required.",
            "stockQuantity": 42,
            "lowStockThreshold": 10,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-CHK-01",
            "name": "Special Zamin Chakkars (Big)",
            "slug": "special-zamin-chakkars-big",
            "category": "Ground Chakkars",
            "description": "High-velocity spinning wheels creating a bright concentric circular ring of golden and emerald sparks.",
            "images": ["/assets/chakkars.png"],
            "mrp": 380.0,
            "sellingPrice": 270.0,
            "packQuantity": 10,
            "packUnit": "pieces / box",
            "safetyInformation": "Place on completely flat, hard stone surface. Light fuse and step back at least 5 meters immediately.",
            "stockQuantity": 60,
            "lowStockThreshold": 10,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-ANR-01",
            "name": "Tri-Colour Flower Pots (Anar Giant)",
            "slug": "tri-colour-flower-pots-anar-giant",
            "category": "Flower Pots (Anar)",
            "description": "Grand fountain erupting in three distinct layers: radiant red base, glittering gold mid-fountain, and silver shower reaching up to 15 feet.",
            "images": ["/assets/anar.png"],
            "mrp": 550.0,
            "sellingPrice": 390.0,
            "packQuantity": 5,
            "packUnit": "pots / box",
            "safetyInformation": "Place flat on open ground. Never bend over the flower pot while lighting. Stand at least 10 meters back.",
            "stockQuantity": 35,
            "lowStockThreshold": 8,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-AER-01",
            "name": "12 Shots Sky Aerial Repeater Cake",
            "slug": "12-shots-sky-aerial-repeater-cake",
            "category": "Aerial Shots",
            "description": "Spectacular automated 12-round aerial fireworks barrage bursting high in the Hyderabad night sky with golden chrysanthemums and ruby stars.",
            "images": ["/assets/aerial-12.png"],
            "mrp": 1200.0,
            "sellingPrice": 850.0,
            "packQuantity": 12,
            "packUnit": "shots cake",
            "safetyInformation": "Outdoor open ground use only. Anchor the box with bricks on either side to prevent tipping. Ensure clear overhead sky without wires or trees.",
            "stockQuantity": 24,
            "lowStockThreshold": 5,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-AER-02",
            "name": "30 Shots Mega Fireworks Display",
            "slug": "30-shots-mega-fireworks-display",
            "category": "Aerial Shots",
            "description": "The ultimate Diwali night showstopper: 30 non-stop bursts of brocade crown, palm pistils, and crackling willow effects with thunderous finale.",
            "images": ["/assets/aerial-30.png"],
            "mrp": 2800.0,
            "sellingPrice": 1950.0,
            "packQuantity": 30,
            "packUnit": "shots display",
            "safetyInformation": "Strictly open community ground use. Minimum 25-meter clearance from spectators. Do not re-light if a shot misfires.",
            "stockQuantity": 12,
            "lowStockThreshold": 4,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-RCK-01",
            "name": "Golden Glitter Whistling Rockets",
            "slug": "golden-glitter-whistling-rockets",
            "category": "Rockets",
            "description": "High-altitude whistling rockets ascending with a distinctive siren sound before bursting into sparkling golden glitter.",
            "images": ["/assets/rockets.png"],
            "mrp": 420.0,
            "sellingPrice": 310.0,
            "packQuantity": 10,
            "packUnit": "rockets / box",
            "safetyInformation": "Insert guide stick vertically into a secure launcher pipe or bottle. Never hold in hand. Clear overhead flight path.",
            "stockQuantity": 18,
            "lowStockThreshold": 5,
            "isFeatured": False,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        },
        {
            "sku": "KDF-BOX-01",
            "name": "KanakaDurga Royal Diwali Celebration Gift Hamper",
            "slug": "kanakadurga-royal-diwali-celebration-gift-hamper",
            "category": "Gift Boxes",
            "description": "Curated luxury festive family box containing 28 assorted items: electric sparklers, deluxe chakkars, flower pots, hydro bombs, and aerial shots in royal gold packaging.",
            "images": ["/assets/hamper.png"],
            "mrp": 3500.0,
            "sellingPrice": 2499.0,
            "packQuantity": 28,
            "packUnit": "assorted items",
            "safetyInformation": "Store whole hamper in a cool, dry place away from children and heat sources. Follow individual item instructions.",
            "stockQuantity": 15,
            "lowStockThreshold": 3,
            "isFeatured": True,
            "isActive": True,
            "isDemo": True,
            "createdAt": now_iso,
            "updatedAt": now_iso
        }
    ]

    for prod in products_data:
        existing = products_col.find_one({"sku": prod["sku"]})
        if not existing:
            products_col.insert_one(prod)
            logger.info(f"Seeded product: {prod['name']} ({prod['sku']})")

    logger.info("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
