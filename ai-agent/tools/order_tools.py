from services.db_client import get_db

def get_customer_orders(customer_id: str):
    """Retrieve all purchase orders placed by a customer."""
    db = get_db()
    orders = list(db.orders.find({"customerId": customer_id}).sort("createdAt", -1))
    for o in orders:
        o["_id"] = str(o["_id"])
        if "createdAt" in o and hasattr(o["createdAt"], "isoformat"):
            o["createdAt"] = o["createdAt"].isoformat()
    return orders
