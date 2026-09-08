from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.models import User, Category, Product, ProductImage, ContentPage, StoreSetting
from app.core.security import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users
        admin = db.query(User).filter(User.email == "admin@dizco.com").first()
        if not admin:
            admin = User(
                email="admin@dizco.com",
                hashed_password=hash_password("Admin@123456"),
                full_name="DIZCO Lead Administrator",
                phone="+91 98765 43210",
                role="admin",
                is_active=True
            )
            db.add(admin)

        customer = db.query(User).filter(User.email == "customer@dizco.com").first()
        if not customer:
            customer = User(
                email="customer@dizco.com",
                hashed_password=hash_password("Customer@123456"),
                full_name="Aarav Sharma",
                phone="+91 91234 56789",
                role="customer",
                is_active=True
            )
            db.add(customer)

        db.commit()

        # 2. Seed Categories
        categories_data = [
            {
                "name": "T-Shirts",
                "slug": "t-shirts",
                "description": "Heavyweight premium cotton tees with editorial silhouettes and structural drape.",
                "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
                "display_order": 1
            },
            {
                "name": "Pants & Trousers",
                "slug": "pants-trousers",
                "description": "Tailored wide-leg trousers, relaxed pleats, and architectural everyday pants.",
                "image_url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80",
                "display_order": 2
            },
            {
                "name": "Outerwear",
                "slug": "outerwear",
                "description": "Minimalist chore jackets, structured trench coats, and technical fashion overshirts.",
                "image_url": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
                "display_order": 3
            },
            {
                "name": "Collections",
                "slug": "collections",
                "description": "Curated seasonal capsule drops designed for effortless monochrome styling.",
                "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
                "display_order": 4
            }
        ]

        cat_map = {}
        for cdata in categories_data:
            existing = db.query(Category).filter(Category.slug == cdata["slug"]).first()
            if not existing:
                cat = Category(**cdata)
                db.add(cat)
                db.flush()
                cat_map[cdata["slug"]] = cat.id
            else:
                cat_map[cdata["slug"]] = existing.id

        db.commit()

        # 3. Seed Products with Editorial Fashion Imagery
        products_data = [
            {
                "name": "Monolith Heavyweight Boxy Tee",
                "slug": "monolith-heavyweight-boxy-tee",
                "sku": "DIZ-TSH-001",
                "description": "Engineered from 280 GSM combed organic cotton. Features a relaxed drop-shoulder cut, reinforced collar ribbing, and subtle blind hem stitching. Built to maintain structured silhouette through extensive daily wear.",
                "price": 2490.00,
                "sale_price": 1990.00,
                "stock_quantity": 45,
                "category_slug": "t-shirts",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Architectural Pleated Trousers",
                "slug": "architectural-pleated-trousers",
                "sku": "DIZ-TRS-002",
                "description": "Double forward pleats cut in high-twist matte twill wool blend. High-rise waist with internal grip waistband, slant pockets, and subtle break at ankle. Designed to transition seamlessly from boardroom to night lounge.",
                "price": 4890.00,
                "sale_price": None,
                "stock_quantity": 28,
                "category_slug": "pants-trousers",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Raw Hem Raw-Cut Indigo Overcoat",
                "slug": "raw-hem-indigo-overcoat",
                "sku": "DIZ-OTW-003",
                "description": "Minimalist single-breasted cocoon coat crafted from dense virgin wool melton. Features notched lapel, hidden horn buttons, deep patch pockets, and sharp architectural drape in midnight carbon.",
                "price": 8990.00,
                "sale_price": 7990.00,
                "stock_quantity": 14,
                "category_slug": "outerwear",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Editorial Crimson Accent Knit Sweater",
                "slug": "editorial-crimson-accent-knit",
                "sku": "DIZ-KNT-004",
                "description": "Spun from merino wool with DIZCO signature red intarsia accent along the inner hem. Dense 7-gauge knit with ribbed crewneck, raglan sleeves, and relaxed aesthetic.",
                "price": 5490.00,
                "sale_price": 4690.00,
                "stock_quantity": 20,
                "category_slug": "collections",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Brutalist Relaxed Canvas Pant",
                "slug": "brutalist-relaxed-canvas-pant",
                "sku": "DIZ-PNT-005",
                "description": "Sturdy 12oz duck canvas with clean articulated knee seams, wide silhouette, deep utility pockets, and reinforced bar-tacks throughout. Enzyme washed for an effortless lived-in texture.",
                "price": 3890.00,
                "sale_price": None,
                "stock_quantity": 35,
                "category_slug": "pants-trousers",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Signature DIZCO Graphic Studio Tee",
                "slug": "signature-dizco-graphic-studio-tee",
                "sku": "DIZ-TSH-006",
                "description": "Screen-printed with high-density DIZCO emblem across the nape and subtle chest typography. Made from 100% GOTS certified organic jersey cotton with a tailored modern drape.",
                "price": 2190.00,
                "sale_price": 1850.00,
                "stock_quantity": 50,
                "category_slug": "t-shirts",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Sculptural Tailored Trench",
                "slug": "sculptural-tailored-trench",
                "sku": "DIZ-OTW-007",
                "description": "Water-repellent technical gabardine double-breasted trench. Features dramatic storm flap, exaggerated belt with matte black hardware, and inverted box pleat at rear.",
                "price": 11490.00,
                "sale_price": 9990.00,
                "stock_quantity": 8,
                "category_slug": "outerwear",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            },
            {
                "name": "Modular Utility Cross-Body Overshirt",
                "slug": "modular-utility-cross-body-overshirt",
                "sku": "DIZ-SHT-008",
                "description": "Heavyweight poplin overshirt engineered with dual asymmetric chest gussets, internal shoulder sling strap, and concealed magnetic cuff closures.",
                "price": 4290.00,
                "sale_price": None,
                "stock_quantity": 3, # Low stock alert
                "category_slug": "collections",
                "images": [
                    {"url": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=85", "is_primary": True},
                    {"url": "https://images.unsplash.com/photo-1492447273231-0f8fecec1e3a?auto=format&fit=crop&w=900&q=85", "is_primary": False}
                ]
            }
        ]

        for pdata in products_data:
            existing = db.query(Product).filter(Product.sku == pdata["sku"]).first()
            if not existing:
                cat_id = cat_map.get(pdata["category_slug"])
                prod = Product(
                    name=pdata["name"],
                    slug=pdata["slug"],
                    sku=pdata["sku"],
                    description=pdata["description"],
                    price=pdata["price"],
                    sale_price=pdata["sale_price"],
                    stock_quantity=pdata["stock_quantity"],
                    category_id=cat_id,
                    is_active=True,
                    is_published=True
                )
                db.add(prod)
                db.flush()

                for idx, img in enumerate(pdata["images"]):
                    pimg = ProductImage(
                        product_id=prod.id,
                        image_url=img["url"],
                        is_primary=img["is_primary"],
                        display_order=idx
                    )
                    db.add(pimg)

        db.commit()

        # 4. Seed Content Pages
        pages_data = [
            {
                "slug": "about-us",
                "title": "About DIZCO",
                "content": "DIZCO is a contemporary fashion house founded on the intersection of architectural discipline and streetwear luxury. Every silhouette is cut with uncompromising attention to proportion, material weight, and enduring craftsmanship."
            },
            {
                "slug": "contact",
                "title": "Contact DIZCO Concierge",
                "content": "Our concierge is available Monday through Saturday from 10:00 AM to 7:00 PM IST. Reach us at concierge@dizco.com or phone +91 (80) 4122-3344."
            },
            {
                "slug": "privacy-policy",
                "title": "Privacy Policy",
                "content": "DIZCO respects customer privacy and secures all financial and identity data in accordance with modern digital protection standards. We never sell or share your information."
            },
            {
                "slug": "terms",
                "title": "Terms & Conditions",
                "content": "All orders placed on DIZCO are subject to product availability and server verification. Deliveries across India are dispatched within 48 business hours."
            }
        ]

        for p in pages_data:
            existing = db.query(ContentPage).filter(ContentPage.slug == p["slug"]).first()
            if not existing:
                cp = ContentPage(**p)
                db.add(cp)

        # 5. Seed Store Settings
        settings_data = [
            {"key": "store_name", "value": "DIZCO", "description": "Official Store Name"},
            {"key": "currency", "value": "INR", "description": "Store Base Currency"},
            {"key": "currency_symbol", "value": "₹", "description": "Currency Symbol"},
            {"key": "shipping_fee", "value": "150.00", "description": "Standard delivery fee"},
            {"key": "free_shipping_threshold", "value": "2999.00", "description": "Free shipping order threshold"},
            {"key": "razorpay_key_id", "value": "rzp_test_dizco2026key", "description": "Razorpay Public Key ID"},
            {"key": "contact_email", "value": "concierge@dizco.com", "description": "Support Contact Email"},
            {"key": "support_phone", "value": "+91 80 4122 3344", "description": "Support Contact Phone"}
        ]

        for s in settings_data:
            existing = db.query(StoreSetting).filter(StoreSetting.key == s["key"]).first()
            if not existing:
                st = StoreSetting(**s)
                db.add(st)

        # 6. Seed Product Variants (Tier-2: Color -> Size)
        from app.models.models import ProductVariant, Coupon, Review
        
        tee = db.query(Product).filter(Product.slug == "monolith-heavyweight-boxy-tee").first()
        if tee:
            variants_to_seed = [
                {"sku": "DIZ-TSH-001-BLK-S", "color": "Obsidian Black", "size": "S", "stock": 10},
                {"sku": "DIZ-TSH-001-BLK-M", "color": "Obsidian Black", "size": "M", "stock": 15},
                {"sku": "DIZ-TSH-001-BLK-L", "color": "Obsidian Black", "size": "L", "stock": 12},
                {"sku": "DIZ-TSH-001-BLK-XL", "color": "Obsidian Black", "size": "XL", "stock": 8},
                {"sku": "DIZ-TSH-001-WHT-S", "color": "Bone White", "size": "S", "stock": 8},
                {"sku": "DIZ-TSH-001-WHT-M", "color": "Bone White", "size": "M", "stock": 14},
                {"sku": "DIZ-TSH-001-WHT-L", "color": "Bone White", "size": "L", "stock": 10},
                {"sku": "DIZ-TSH-001-WHT-XL", "color": "Bone White", "size": "XL", "stock": 6},
            ]
            for v in variants_to_seed:
                exist_v = db.query(ProductVariant).filter(ProductVariant.sku == v["sku"]).first()
                if not exist_v:
                    var = ProductVariant(
                        product_id=tee.id,
                        sku=v["sku"],
                        color=v["color"],
                        size=v["size"],
                        stock_quantity=v["stock"],
                        is_active=True
                    )
                    db.add(var)

        trousers = db.query(Product).filter(Product.slug == "architectural-pleated-trousers").first()
        if trousers:
            trouser_variants = [
                {"sku": "DIZ-TRS-002-GRY-S", "color": "Slate Gray", "size": "S", "stock": 6},
                {"sku": "DIZ-TRS-002-GRY-M", "color": "Slate Gray", "size": "M", "stock": 10},
                {"sku": "DIZ-TRS-002-GRY-L", "color": "Slate Gray", "size": "L", "stock": 8},
                {"sku": "DIZ-TRS-002-GRY-XL", "color": "Slate Gray", "size": "XL", "stock": 4},
                {"sku": "DIZ-TRS-002-CHR-S", "color": "Deep Charcoal", "size": "S", "stock": 5},
                {"sku": "DIZ-TRS-002-CHR-M", "color": "Deep Charcoal", "size": "M", "stock": 8},
                {"sku": "DIZ-TRS-002-CHR-L", "color": "Deep Charcoal", "size": "L", "stock": 6},
                {"sku": "DIZ-TRS-002-CHR-XL", "color": "Deep Charcoal", "size": "XL", "stock": 3},
            ]
            for v in trouser_variants:
                exist_v = db.query(ProductVariant).filter(ProductVariant.sku == v["sku"]).first()
                if not exist_v:
                    var = ProductVariant(
                        product_id=trousers.id,
                        sku=v["sku"],
                        color=v["color"],
                        size=v["size"],
                        stock_quantity=v["stock"],
                        is_active=True
                    )
                    db.add(var)

        # 7. Seed Coupons
        coupons_to_seed = [
            {
                "code": "DIZCO10",
                "discount_type": "percentage",
                "discount_value": 10.0,
                "min_order_amount": 1000.0,
                "max_discount": 500.0,
                "usage_limit": 500,
                "per_user_limit": 2,
                "is_active": True
            },
            {
                "code": "FIRST500",
                "discount_type": "fixed",
                "discount_value": 500.0,
                "min_order_amount": 2500.0,
                "usage_limit": 200,
                "per_user_limit": 1,
                "is_active": True
            }
        ]
        for c in coupons_to_seed:
            exist_c = db.query(Coupon).filter(Coupon.code == c["code"]).first()
            if not exist_c:
                coup = Coupon(**c)
                db.add(coup)

        # 8. Seed Initial Approved Review
        if tee and customer:
            exist_rev = db.query(Review).filter(
                Review.product_id == tee.id,
                Review.user_id == customer.id
            ).first()
            if not exist_rev:
                rev = Review(
                    product_id=tee.id,
                    user_id=customer.id,
                    rating=5,
                    title="Exquisite structural drape and weight",
                    comment="The 280 GSM cotton feels luxurious and holds its architectural shape beautifully even after several washes. Truly high-end tailoring.",
                    status="approved",
                    is_verified_purchase=True
                )
                db.add(rev)

        db.commit()
        print("Database seeded successfully with DIZCO catalog, variants, coupons, and reviews.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

