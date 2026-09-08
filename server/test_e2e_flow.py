import requests

BASE_URL = 'http://localhost:5173/api'

def run():
    print("--- 1. Customer Login ---")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "customer@dizco.com",
        "password": "Customer@123456"
    })
    print("Customer Login Status:", login_res.status_code)
    assert login_res.status_code == 200, login_res.text
    cust_token = login_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    print("\n--- 2. Get Catalog Products ---")
    prods_res = requests.get(f"{BASE_URL}/products")
    assert prods_res.status_code == 200
    products = prods_res.json()["items"]
    target_product = next(p for p in products if p["stock_quantity"] > 0)
    initial_stock = target_product["stock_quantity"]
    print(f"Selected Product: {target_product['name']} (ID: {target_product['id']}, Stock: {initial_stock})")

    print("\n--- 3. Create Order ---")
    order_payload = {
        "items": [{"product_id": target_product["id"], "quantity": 1}],
        "address": {
            "full_name": "Test Customer",
            "address_line1": "100 Indiranagar 100ft Rd",
            "city": "Bengaluru",
            "state": "Karnataka",
            "zip_code": "560038",
            "phone": "+91 9988776655"
        }
    }
    order_res = requests.post(f"{BASE_URL}/orders", json=order_payload, headers=cust_headers)
    print("Order Creation Status:", order_res.status_code)
    assert order_res.status_code == 201, order_res.text
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    print(f"Order Created: #{order_number} (ID: {order_id}), Total: INR {order_data['total']}")

    print("\n--- 4. Create Razorpay Order ---")
    rzp_res = requests.post(f"{BASE_URL}/orders/razorpay/create", json={"order_id": order_id}, headers=cust_headers)
    print("Razorpay Order Creation Status:", rzp_res.status_code)
    assert rzp_res.status_code == 200, rzp_res.text
    rzp_data = rzp_res.json()
    rzp_order_id = rzp_data["razorpay_order_id"]
    print(f"Razorpay Order ID: {rzp_order_id}")

    print("\n--- 5. Verify Payment ---")
    verify_res = requests.post(f"{BASE_URL}/orders/razorpay/verify", json={
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_test_live_verify",
        "razorpay_signature": "test_signature"
    }, headers=cust_headers)
    print("Payment Verification Status:", verify_res.status_code)
    assert verify_res.status_code == 200, verify_res.text

    print("\n--- 6. Verify Stock Decrement ---")
    updated_prod = requests.get(f"{BASE_URL}/products/{target_product['slug']}").json()
    print(f"Stock Decrement Check: Initial={initial_stock}, New={updated_prod['stock_quantity']}")
    assert updated_prod["stock_quantity"] == initial_stock - 1, "Stock was not decremented correctly!"

    print("\n--- 7. Customer Order History ---")
    my_orders = requests.get(f"{BASE_URL}/orders/my-orders", headers=cust_headers).json()
    found_order = next((o for o in my_orders if o["id"] == order_id), None)
    print(f"Order in Customer History: Found = {found_order is not None}, Status = {found_order['status'] if found_order else None}")
    assert found_order is not None

    print("\n--- 8. Admin Login ---")
    admin_login = requests.post(f"{BASE_URL}/auth/admin/login", json={
        "email": "admin@dizco.com",
        "password": "Admin@123456"
    })
    print("Admin Login Status:", admin_login.status_code)
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    print("\n--- 9. Role Separation Security Check ---")
    forbidden_res = requests.get(f"{BASE_URL}/admin/dashboard", headers=cust_headers)
    print("Customer Access to Admin (expect 403):", forbidden_res.status_code)
    assert forbidden_res.status_code == 403

    print("\n--- 10. Admin Order Status Workflow ---")
    for next_status in ["shipped", "delivered"]:
        status_update = requests.put(f"{BASE_URL}/admin/orders/{order_id}/status", json={"status": next_status}, headers=admin_headers)
        print(f"Admin Status Update to {next_status}:", status_update.status_code)
        assert status_update.status_code == 200

    print("\n--- 11. Customer Sees Final Status ---")
    cust_check = requests.get(f"{BASE_URL}/orders/{order_id}", headers=cust_headers).json()
    print("Customer Sees Final Status:", cust_check["status"])
    assert cust_check["status"] == "delivered"

    print("\n>>> ALL CUSTOMER & ADMIN E2E STEPS VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run()
