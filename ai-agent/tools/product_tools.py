from services.db_client import get_db

def get_common_products(customer_ids: list):
    """Find products repeatedly ordered and refunded across the customer network."""
    db = get_db()
    refunds = list(db.refunds.find({"customerId": {"$in": customer_ids}}))
    
    product_counts = {}
    for r in refunds:
        p_id = r.get("productId")
        product_counts[p_id] = product_counts.get(p_id, 0) + 1

    common_pids = [p_id for p_id, count in product_counts.items() if count >= 2]
    products = list(db.products.find({"productId": {"$in": common_pids}}))
    
    res = []
    for p in products:
        p["_id"] = str(p["_id"])
        p["refundCount"] = product_counts.get(p["productId"], 0)
        res.append(p)
    return res
