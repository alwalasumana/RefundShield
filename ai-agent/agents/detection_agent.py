import time
from graph.state import InvestigationState
from tools.customer_tools import get_customer, get_connected_customers
from tools.refund_tools import get_customer_refunds
from tools.order_tools import get_customer_orders
from services.db_client import get_db

def detection_node(state: InvestigationState) -> InvestigationState:
    """
    LangGraph Node 1: Detection Node
    Initializes network relationship detection and computes baseline risk score (risk_score_before).
    """
    start_time = time.time()
    primary_id = state.get("primary_customer_id")
    customer = get_customer(primary_id)
    db = get_db()

    orders = get_customer_orders(primary_id)
    refunds = get_customer_refunds(primary_id)

    order_dev_ids = list(set([o.get("deviceId") for o in orders if o.get("deviceId")]))
    order_addr_ids = list(set([o.get("addressId") for o in orders if o.get("addressId")]))

    dev_query = {"$or": [{"associatedCustomerIds": primary_id}]}
    if order_dev_ids:
        dev_query["$or"].append({"deviceId": {"$in": order_dev_ids}})
    devices = list(db.devices.find(dev_query))

    addr_query = {"$or": [{"associatedCustomerIds": primary_id}]}
    if order_addr_ids:
        addr_query["$or"].append({"addressId": {"$in": order_addr_ids}})
    addresses = list(db.addresses.find(addr_query))

    connected_ids = set()
    for d in devices:
        for c in d.get("associatedCustomerIds", []):
            if c != primary_id: connected_ids.add(c)
    for a in addresses:
        for c in a.get("associatedCustomerIds", []):
            if c != primary_id: connected_ids.add(c)

    connected_ids_list = list(connected_ids)

    signals = []
    risk_score_before = 0

    order_cnt = len(orders)
    refund_cnt = len(refunds)
    refund_rate = (refund_cnt / order_cnt) if order_cnt > 0 else 0

    if (order_cnt >= 2 and refund_rate >= 0.5) or refund_cnt >= 2:
        score = 30 if refund_rate >= 0.8 else 20
        risk_score_before += score
        signals.append({
            "type": "HIGH_REFUND_FREQUENCY",
            "description": f"High refund rate of {refund_rate * 100:.1f}% ({refund_cnt} refunds out of {order_cnt} orders).",
            "scoreContribution": score,
            "sourceIds": [primary_id]
        })

    multi_user_devs = [d for d in devices if len(d.get("associatedCustomerIds", [])) > 1]
    if multi_user_devs:
        max_users = max([len(d.get("associatedCustomerIds", [])) for d in multi_user_devs])
        score = min(30, 20 + (max_users - 2) * 5)
        risk_score_before += score
        signals.append({
            "type": "SHARED_DEVICE",
            "description": f"Hardware fingerprint shared across {max_users} customer accounts.",
            "scoreContribution": score,
            "sourceIds": [d["deviceId"] for d in multi_user_devs]
        })

    multi_user_addrs = [a for a in addresses if len(a.get("associatedCustomerIds", [])) > 1 and not a.get("isCommercial", False)]
    if multi_user_addrs:
        max_users = max([len(a.get("associatedCustomerIds", [])) for a in multi_user_addrs])
        score = min(25, 15 + (max_users - 2) * 4)
        risk_score_before += score
        signals.append({
            "type": "SHARED_ADDRESS",
            "description": f"Physical delivery location shared across {max_users} customer accounts.",
            "scoreContribution": score,
            "sourceIds": [a["addressId"] for a in multi_user_addrs]
        })

    initial_score = min(100, risk_score_before)

    step_info = {
        "node": "DetectionNode",
        "status": "COMPLETED",
        "duration_ms": int((time.time() - start_time) * 1000),
        "output": f"Discovered {len(signals)} initial signals & {len(connected_ids_list)} connected accounts. Initial Risk: {initial_score}/100."
    }

    exec_steps = state.get("execution_steps", [])
    exec_steps.append(step_info)

    state["case_id"] = state.get("case_id") or f"CASE-{primary_id}"
    state["customer_ids"] = [primary_id] + connected_ids_list
    state["connected_entities"] = connected_ids_list
    state["suspicious_signals"] = signals
    state["risk_score_before"] = initial_score
    state["risk_score"] = initial_score
    state["execution_steps"] = exec_steps
    state["investigation_status"] = "DETECTION_COMPLETED"

    return state
