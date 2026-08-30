from services.db_client import get_db

def get_shared_devices(customer_id: str):
    """Find devices associated with customerId that are shared with other accounts."""
    db = get_db()
    devices = list(db.devices.find({"associatedCustomerIds": customer_id}))
    shared = []
    for d in devices:
        d["_id"] = str(d["_id"])
        if len(d.get("associatedCustomerIds", [])) > 1:
            shared.append(d)
    return shared

def get_shared_addresses(customer_id: str):
    """Find physical shipping addresses associated with customerId shared across accounts."""
    db = get_db()
    addresses = list(db.addresses.find({"associatedCustomerIds": customer_id}))
    shared = []
    for a in addresses:
        a["_id"] = str(a["_id"])
        if len(a.get("associatedCustomerIds", [])) > 1 and not a.get("isCommercial", False):
            shared.append(a)
    return shared
