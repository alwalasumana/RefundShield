from services.db_client import get_db

def get_customer_refunds(customer_id: str):
    """Fetch all refund records for a given customer."""
    db = get_db()
    refunds = list(db.refunds.find({"customerId": customer_id}).sort("createdAt", -1))
    for r in refunds:
        r["_id"] = str(r["_id"])
        if "createdAt" in r and hasattr(r["createdAt"], "isoformat"):
            r["createdAt"] = r["createdAt"].isoformat()
    return refunds

def get_refund_timeline(customer_ids: list):
    """Retrieve chronological order and refund event timeline for customer network."""
    db = get_db()
    orders = list(db.orders.find({"customerId": {"$in": customer_ids}}))
    refunds = list(db.refunds.find({"customerId": {"$in": customer_ids}}))

    timeline = []
    for o in orders:
        created = o.get("createdAt")
        iso_time = created.isoformat() if hasattr(created, "isoformat") else str(created)
        timeline.append({
            "timestamp": iso_time,
            "event": f"Order Placed ({o.get('orderId')})",
            "details": f"Amount ₹{o.get('totalAmount')} on device {o.get('deviceId')}",
            "type": "ORDER"
        })

    for r in refunds:
        created = r.get("createdAt")
        iso_time = created.isoformat() if hasattr(created, "isoformat") else str(created)
        timeline.append({
            "timestamp": iso_time,
            "event": f"Refund Claimed ({r.get('refundId')})",
            "details": f"Claimed ₹{r.get('amount')} for order {r.get('orderId')}. Reason: {r.get('reason')}",
            "type": "REFUND"
        })

    timeline.sort(key=lambda x: x["timestamp"], reverse=False)
    return timeline
