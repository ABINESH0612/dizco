import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import engine

client = TestClient(app)

class TestDizcoBackend(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        engine.dispose()

    def test_health(self):
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["platform"], "DIZCO Fashion Commerce")

    def test_admin_login(self):
        res = client.post("/api/auth/admin/login", json={
            "email": "admin@dizco.com",
            "password": "Admin@123456"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "admin")

    def test_customer_login(self):
        res = client.post("/api/auth/login", json={
            "email": "customer@dizco.com",
            "password": "Customer@123456"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["user"]["role"], "customer")

    def test_categories_and_products(self):
        # Categories
        res = client.get("/api/categories")
        self.assertEqual(res.status_code, 200)
        cats = res.json()
        self.assertGreater(len(cats), 0)

        # Products
        res = client.get("/api/products")
        self.assertEqual(res.status_code, 200)
        prods = res.json()
        self.assertGreater(prods["total"], 0)
        self.assertGreater(len(prods["items"]), 0)

    def test_role_separation(self):
        # Regular customer cannot access admin dashboard
        cust_res = client.post("/api/auth/login", json={
            "email": "customer@dizco.com",
            "password": "Customer@123456"
        })
        token = cust_res.json()["access_token"]
        
        admin_res = client.get("/api/admin/dashboard", headers={
            "Authorization": f"Bearer {token}"
        })
        self.assertEqual(admin_res.status_code, 403)

    def test_order_and_payment_flow(self):
        # 1. Login as customer
        cust_res = client.post("/api/auth/login", json={
            "email": "customer@dizco.com",
            "password": "Customer@123456"
        })
        token = cust_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get first product
        prods = client.get("/api/products").json()
        prod = prods["items"][0]
        initial_stock = prod["stock_quantity"]

        # 3. Create order
        order_payload = {
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "address": {
                "full_name": "Test Customer",
                "address_line1": "100 Indiranagar 100ft Rd",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9988776655"
            }
        }
        order_res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order_data = order_res.json()
        order_id = order_data["id"]

        # 4. Create Razorpay order
        rzp_create = client.post("/api/orders/razorpay/create", json={"order_id": order_id}, headers=headers)
        self.assertEqual(rzp_create.status_code, 200)
        rzp_data = rzp_create.json()
        self.assertIn("razorpay_order_id", rzp_data)

        # 5. Verify payment
        rzp_verify = client.post("/api/orders/razorpay/verify", json={
            "order_id": order_id,
            "razorpay_order_id": rzp_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_123456",
            "razorpay_signature": "mock_sig"
        }, headers=headers)
        self.assertEqual(rzp_verify.status_code, 200)

        # 6. Check stock was decremented
        updated_prod = client.get(f"/api/products/{prod['slug']}").json()
        self.assertEqual(updated_prod["stock_quantity"], initial_stock - 1)

    @classmethod
    def setUpClass(cls):
        from app.core.database import SessionLocal
        from app.models.models import Product, ProductVariant, Coupon
        db = SessionLocal()
        try:
            # 1. Ensure test product with variants exists
            p1 = db.query(Product).filter(Product.slug == "test-variant-tee").first()
            if not p1:
                p1 = Product(
                    name="Test Variant Tee",
                    slug="test-variant-tee",
                    sku="TEST-VAR-TEE",
                    description="A test shirt with variants",
                    price=1999.0,
                    stock_quantity=20,
                    is_active=True,
                    is_published=True
                )
                db.add(p1)
                db.flush()

                v1 = ProductVariant(
                    product_id=p1.id,
                    sku="TEST-VAR-TEE-BLK-M",
                    color="Black",
                    size="M",
                    price=1999.0,
                    stock_quantity=10,
                    is_active=True
                )
                v2 = ProductVariant(
                    product_id=p1.id,
                    sku="TEST-VAR-TEE-BLK-L",
                    color="Black",
                    size="L",
                    price=2199.0,
                    stock_quantity=2,
                    is_active=True
                )
                db.add_all([v1, v2])
            else:
                p1.stock_quantity = 20
                for v in p1.variants:
                    if v.sku == "TEST-VAR-TEE-BLK-M":
                        v.stock_quantity = 10
                    elif v.sku == "TEST-VAR-TEE-BLK-L":
                        v.stock_quantity = 2

            # 2. Ensure a second product exists for cross-product mismatch test
            p2 = db.query(Product).filter(Product.slug == "test-other-product").first()
            if not p2:
                p2 = Product(
                    name="Test Other Product",
                    slug="test-other-product",
                    sku="TEST-OTHER-PROD",
                    description="Another product for mismatch test",
                    price=2999.0,
                    stock_quantity=15,
                    is_active=True,
                    is_published=True
                )
                db.add(p2)
                db.flush()

                v_other = ProductVariant(
                    product_id=p2.id,
                    sku="TEST-OTHER-PROD-BLU-S",
                    color="Blue",
                    size="S",
                    price=2999.0,
                    stock_quantity=5,
                    is_active=True
                )
                db.add(v_other)
            else:
                p2.stock_quantity = 15
                for v in p2.variants:
                    if v.sku == "TEST-OTHER-PROD-BLU-S":
                        v.stock_quantity = 5

            # 3. Ensure test coupons exist — upsert so fields are reset each run
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)

            # Seed spec: (code, discount_type, discount_value, min_order, max_disc,
            #              usage_limit, per_user_limit, used_count, is_active, expiry_delta_days)
            coupon_specs = [
                # per_user_limit=100 so multiple coupon tests using same customer don't exhaust it
                ("TESTPERCENT10", "percentage", 10.0, 500.0,  200.0, 100, 100, 0, True,  None),
                ("TESTFIXED500",  "fixed",      500.0, 1000.0, None,  100, 100, 0, True,  None),
                ("TESTEXPIRED",   "percentage",  15.0,   0.0,  None, None,   1, 0, True,    -5),
                ("TESTINACTIVE",  "fixed",      200.0,   0.0,  None, None,   1, 0, False, None),
                ("TESTMIN2000",   "fixed",      300.0, 2000.0, None, None,   1, 0, True,  None),
                ("TESTLIMIT1",    "fixed",      100.0,   0.0,  None,    1,   1, 1, True,  None),
                ("TESTBIGFIXED",  "fixed",     5000.0,   0.0,  None, None,   1, 0, True,  None),
            ]

            for (code, disc_type, disc_val, min_ord, max_disc,
                 usage_lim, per_usr_lim, used_cnt, is_active, expiry_delta) in coupon_specs:

                expiry = (now + timedelta(days=expiry_delta)) if expiry_delta is not None else None

                existing = db.query(Coupon).filter(Coupon.code == code).first()
                if existing:
                    # Reset all fields to known test state
                    existing.discount_type   = disc_type
                    existing.discount_value  = disc_val
                    existing.min_order_amount = min_ord
                    existing.max_discount    = max_disc
                    existing.usage_limit     = usage_lim
                    existing.per_user_limit  = per_usr_lim
                    existing.used_count      = used_cnt
                    existing.is_active       = is_active
                    existing.expiry_date     = expiry
                else:
                    db.add(Coupon(
                        code=code,
                        discount_type=disc_type,
                        discount_value=disc_val,
                        min_order_amount=min_ord,
                        max_discount=max_disc,
                        usage_limit=usage_lim,
                        per_user_limit=per_usr_lim,
                        used_count=used_cnt,
                        is_active=is_active,
                        expiry_date=expiry,
                    ))

            db.commit()
        finally:
            db.close()


    def _get_customer_headers(self):
        res = client.post("/api/auth/login", json={
            "email": "customer@dizco.com",
            "password": "Customer@123456"
        })
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def _get_admin_headers(self):
        res = client.post("/api/auth/admin/login", json={
            "email": "admin@dizco.com",
            "password": "Admin@123456"
        })
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def test_product_with_variants(self):
        # 1. Product with variants API inspection
        res = client.get("/api/products/test-variant-tee")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("variants", data)
        self.assertGreater(len(data["variants"]), 0)
        variant = data["variants"][0]
        self.assertIn("id", variant)
        self.assertIn("sku", variant)
        self.assertIn("color", variant)
        self.assertIn("size", variant)
        self.assertIn("price", variant)
        self.assertIn("stock_quantity", variant)
        self.assertIn("is_active", variant)

    def test_valid_variant_order(self):
        # 2. Valid variant order
        headers = self._get_customer_headers()
        prod = client.get("/api/products/test-variant-tee").json()
        variant = prod["variants"][0]

        order_payload = {
            "items": [{
                "product_id": prod["id"],
                "variant_id": variant["id"],
                "color": variant["color"],
                "size": variant["size"],
                "quantity": 1
            }],
            "address": {
                "full_name": "Variant Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        order_data = res.json()
        self.assertEqual(len(order_data["items"]), 1)
        created_item = order_data["items"][0]
        self.assertEqual(created_item["variant_id"], variant["id"])
        self.assertEqual(created_item["color"], variant["color"])
        self.assertEqual(created_item["size"], variant["size"])
        self.assertEqual(float(created_item["price"]), float(variant["price"] or prod["price"]))

    def test_invalid_variant_id(self):
        # 3. Invalid variant ID
        headers = self._get_customer_headers()
        prod = client.get("/api/products/test-variant-tee").json()

        order_payload = {
            "items": [{
                "product_id": prod["id"],
                "variant_id": 99999999, # Non-existent variant ID
                "color": "Black",
                "size": "M",
                "quantity": 1
            }],
            "address": {
                "full_name": "Test Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("unavailable", res.json()["detail"].lower())

    def test_variant_belonging_to_another_product(self):
        # 4. Variant belonging to another product
        headers = self._get_customer_headers()
        prod_a = client.get("/api/products/test-variant-tee").json()
        prod_b = client.get("/api/products/test-other-product").json()
        variant_b = prod_b["variants"][0]

        # Pass product A's ID with product B's variant ID
        order_payload = {
            "items": [{
                "product_id": prod_a["id"],
                "variant_id": variant_b["id"],
                "color": variant_b["color"],
                "size": variant_b["size"],
                "quantity": 1
            }],
            "address": {
                "full_name": "Test Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("unavailable", res.json()["detail"].lower())

    def test_insufficient_variant_stock(self):
        # 5. Insufficient variant stock
        headers = self._get_customer_headers()
        prod = client.get("/api/products/test-variant-tee").json()
        # Find variant with stock_quantity = 2
        variant = next(v for v in prod["variants"] if v["sku"] == "TEST-VAR-TEE-BLK-L")

        order_payload = {
            "items": [{
                "product_id": prod["id"],
                "variant_id": variant["id"],
                "color": variant["color"],
                "size": variant["size"],
                "quantity": variant["stock_quantity"] + 10 # Exceeds stock
            }],
            "address": {
                "full_name": "Test Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("insufficient stock", res.json()["detail"].lower())

    def test_successful_variant_stock_decrement(self):
        # 6. Successful variant stock decrement
        headers = self._get_customer_headers()
        prod_before = client.get("/api/products/test-variant-tee").json()
        variant_before = next(v for v in prod_before["variants"] if v["sku"] == "TEST-VAR-TEE-BLK-M")
        initial_variant_stock = variant_before["stock_quantity"]
        initial_prod_stock = prod_before["stock_quantity"]

        # Place order for 1 item of this variant
        order_payload = {
            "items": [{
                "product_id": prod_before["id"],
                "variant_id": variant_before["id"],
                "color": variant_before["color"],
                "size": variant_before["size"],
                "quantity": 1
            }],
            "address": {
                "full_name": "Stock Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        order_res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.json()["id"]

        # Create Razorpay order
        rzp_create = client.post("/api/orders/razorpay/create", json={"order_id": order_id}, headers=headers)
        self.assertEqual(rzp_create.status_code, 200)
        rzp_data = rzp_create.json()

        # Verify payment
        rzp_verify = client.post("/api/orders/razorpay/verify", json={
            "order_id": order_id,
            "razorpay_order_id": rzp_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_var_123",
            "razorpay_signature": "mock_sig"
        }, headers=headers)
        self.assertEqual(rzp_verify.status_code, 200)

        # Inspect updated product & variant stock
        prod_after = client.get("/api/products/test-variant-tee").json()
        variant_after = next(v for v in prod_after["variants"] if v["sku"] == "TEST-VAR-TEE-BLK-M")
        self.assertEqual(variant_after["stock_quantity"], initial_variant_stock - 1)
        self.assertEqual(prod_after["stock_quantity"], initial_prod_stock - 1)

    def test_non_variant_product_order(self):
        # 7. Backward compatibility: Non-variant product order and stock decrement
        headers = self._get_customer_headers()
        # Find a product without variants
        prods = client.get("/api/products").json()
        non_var_prod = next((p for p in prods["items"] if len(p.get("variants", [])) == 0), None)
        if not non_var_prod:
            # First product fallback
            non_var_prod = prods["items"][0]

        initial_stock = non_var_prod["stock_quantity"]
        order_payload = {
            "items": [{
                "product_id": non_var_prod["id"],
                "quantity": 1
            }],
            "address": {
                "full_name": "Non-Variant Customer",
                "address_line1": "42 Indiranagar 12th Main",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560038",
                "phone": "+91 9876543210"
            }
        }
        order_res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.json()["id"]

        rzp_create = client.post("/api/orders/razorpay/create", json={"order_id": order_id}, headers=headers)
        self.assertEqual(rzp_create.status_code, 200)
        rzp_data = rzp_create.json()

        rzp_verify = client.post("/api/orders/razorpay/verify", json={
            "order_id": order_id,
            "razorpay_order_id": rzp_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_nonvar_123",
            "razorpay_signature": "mock_sig"
        }, headers=headers)
        self.assertEqual(rzp_verify.status_code, 200)

        updated_prod = client.get(f"/api/products/{non_var_prod['slug']}").json()
        self.assertEqual(updated_prod["stock_quantity"], initial_stock - 1)

    # ==========================================
    # Phase 2 Coupon Test Suite (11 Tests)
    # ==========================================

    def test_coupon_valid_percentage(self):
        # 1. Valid percentage coupon
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTPERCENT10", "subtotal": 1000.0}, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["code"], "TESTPERCENT10")
        self.assertEqual(data["discount_type"], "percentage")
        self.assertEqual(data["discount_amount"], 100.0)
        self.assertEqual(data["final_total"], 900.0)

    def test_coupon_valid_fixed(self):
        # 2. Valid fixed coupon
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTFIXED500", "subtotal": 1500.0}, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["valid"])
        self.assertEqual(data["code"], "TESTFIXED500")
        self.assertEqual(data["discount_type"], "fixed")
        self.assertEqual(data["discount_amount"], 500.0)
        self.assertEqual(data["final_total"], 1000.0)

    def test_coupon_invalid(self):
        # 3. Invalid coupon
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "NONEXISTENTCODE", "subtotal": 1000.0}, headers=headers)
        self.assertEqual(res.status_code, 404)
        self.assertIn("invalid", res.json()["detail"].lower())

    def test_coupon_expired(self):
        # 4. Expired coupon
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTEXPIRED", "subtotal": 1000.0}, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_coupon_inactive(self):
        # 5. Inactive coupon
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTINACTIVE", "subtotal": 1000.0}, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("inactive", res.json()["detail"].lower())

    def test_coupon_minimum_order_failure(self):
        # 6. Minimum order failure
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTMIN2000", "subtotal": 1500.0}, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("minimum order", res.json()["detail"].lower())

    def test_coupon_usage_limit_failure(self):
        # 7. Usage limit failure
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTLIMIT1", "subtotal": 1000.0}, headers=headers)
        self.assertEqual(res.status_code, 400)
        self.assertIn("limit", res.json()["detail"].lower())

    def test_coupon_discount_cannot_exceed_subtotal(self):
        # 8. Coupon discount cannot exceed subtotal
        headers = self._get_customer_headers()
        res = client.post("/api/coupons/validate", json={"code": "TESTBIGFIXED", "subtotal": 2000.0}, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["discount_amount"], 2000.0) # Capped at subtotal
        self.assertEqual(data["final_total"], 0.0)

    def test_coupon_stored_in_order(self):
        # 9. Coupon stored in order
        headers = self._get_customer_headers()
        prods = client.get("/api/products").json()
        prod = prods["items"][0]

        order_payload = {
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "coupon_code": "TESTPERCENT10",
            "address": {
                "full_name": "Coupon Buyer",
                "address_line1": "100 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560001",
                "phone": "+91 9988776655"
            }
        }
        res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(res.status_code, 201)
        order_data = res.json()
        self.assertEqual(order_data["coupon_code"], "TESTPERCENT10")
        self.assertGreater(order_data["discount_amount"], 0)
        # Server-authoritative calculation:
        discounted = max(0.0, order_data["subtotal"] - order_data["discount_amount"])
        expected_shipping = 0.0 if discounted >= 2999.0 else 150.0
        self.assertEqual(order_data["total"], round(discounted + expected_shipping, 2))

    def test_coupon_usage_recorded_on_payment(self):
        # 10. Discount amount stored correctly & usage recorded on successful payment
        from app.core.database import SessionLocal
        from app.models.models import Coupon, CouponUsage
        db = SessionLocal()
        coupon = db.query(Coupon).filter(Coupon.code == "TESTPERCENT10").first()
        initial_used = coupon.used_count
        db.close()

        headers = self._get_customer_headers()
        prods = client.get("/api/products").json()
        prod = prods["items"][0]

        order_payload = {
            "items": [{"product_id": prod["id"], "quantity": 1}],
            "coupon_code": "TESTPERCENT10",
            "address": {
                "full_name": "Usage Buyer",
                "address_line1": "100 MG Road",
                "city": "Bengaluru",
                "state": "Karnataka",
                "zip_code": "560001",
                "phone": "+91 9988776655"
            }
        }
        order_res = client.post("/api/orders", json=order_payload, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order_id = order_res.json()["id"]

        rzp_create = client.post("/api/orders/razorpay/create", json={"order_id": order_id}, headers=headers)
        self.assertEqual(rzp_create.status_code, 200)
        rzp_data = rzp_create.json()

        rzp_verify = client.post("/api/orders/razorpay/verify", json={
            "order_id": order_id,
            "razorpay_order_id": rzp_data["razorpay_order_id"],
            "razorpay_payment_id": "pay_test_coupon_use_1",
            "razorpay_signature": "mock_sig"
        }, headers=headers)
        self.assertEqual(rzp_verify.status_code, 200)

        # Check DB that usage was recorded and used_count incremented
        db = SessionLocal()
        coupon_after = db.query(Coupon).filter(Coupon.code == "TESTPERCENT10").first()
        self.assertEqual(coupon_after.used_count, initial_used + 1)
        usage = db.query(CouponUsage).filter(CouponUsage.order_id == order_id).first()
        self.assertIsNotNone(usage)
        self.assertEqual(usage.coupon_id, coupon_after.id)
        db.close()

    def test_admin_coupon_rbac_and_crud(self):
        # 11. Customer cannot access admin coupon APIs, admin has full CRUD
        cust_headers = self._get_customer_headers()
        admin_headers = self._get_admin_headers()

        # Customer RBAC rejection
        cust_get = client.get("/api/admin/coupons", headers=cust_headers)
        self.assertEqual(cust_get.status_code, 403)

        cust_post = client.post("/api/admin/coupons", json={
            "code": "HACKERCODE",
            "discount_type": "percentage",
            "discount_value": 90.0
        }, headers=cust_headers)
        self.assertEqual(cust_post.status_code, 403)

        # Admin CRUD
        # 1. Admin GET list
        admin_get = client.get("/api/admin/coupons", headers=admin_headers)
        self.assertEqual(admin_get.status_code, 200)
        self.assertIsInstance(admin_get.json(), list)

        # 2. Admin POST create
        create_res = client.post("/api/admin/coupons", json={
            "code": "CRUDCOUPON15",
            "discount_type": "percentage",
            "discount_value": 15.0,
            "min_order_amount": 1000.0,
            "max_discount": 500.0,
            "usage_limit": 50,
            "is_active": True
        }, headers=admin_headers)
        self.assertEqual(create_res.status_code, 201)
        created_coupon = create_res.json()
        coupon_id = created_coupon["id"]
        self.assertEqual(created_coupon["code"], "CRUDCOUPON15")

        # 3. Admin PUT update (deactivate)
        update_res = client.put(f"/api/admin/coupons/{coupon_id}", json={
            "is_active": False
        }, headers=admin_headers)
        self.assertEqual(update_res.status_code, 200)
        self.assertFalse(update_res.json()["is_active"])

        # 4. Admin GET usage history
        usage_res = client.get(f"/api/admin/coupons/{coupon_id}/usage", headers=admin_headers)
        self.assertEqual(usage_res.status_code, 200)
        self.assertIsInstance(usage_res.json(), list)

        # 5. Admin DELETE
        del_res = client.delete(f"/api/admin/coupons/{coupon_id}", headers=admin_headers)
        self.assertEqual(del_res.status_code, 204)

        # Verify deleted
        get_after = client.get("/api/admin/coupons", headers=admin_headers)
        self.assertFalse(any(c["id"] == coupon_id for c in get_after.json()))

if __name__ == "__main__":
    unittest.main()
