from services.db_client import get_db

def get_customer(customer_id: str):
    """Retrieve customer profile by customerId from database."""
    db = get_db()
    cust = db.customers.find_one({"customerId": customer_id})
    if cust:
        cust["_id"] = str(cust["_id"])
    return cust

def get_connected_customers(customer_id: str):
    """Discover all connected customer IDs via shared devices or addresses."""
    db = get_db()
    # Devices used by primary customer
    devices = list(db.devices.find({"associatedCustomerIds": customer_id}))
    # Addresses used by primary customer
    addresses = list(db.addresses.find({"associatedCustomerIds": customer_id}))

    connected = set()
    for d in devices:
        for c in d.get("associatedCustomerIds", []):
            if c != customer_id:
                connected.add(c)

    for a in addresses:
        for c in a.get("associatedCustomerIds", []):
            if c != customer_id:
                connected.add(c)

    connected_custs = list(db.customers.find({"customerId": {"$in": list(connected)}}))
    for c in connected_custs:
        c["_id"] = str(c["_id"])
    return connected_custs
