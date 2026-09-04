import time
from typing import Dict, Any, List
from graph.state import InvestigationState
from services.db_client import get_db
from services.llm_factory import get_llm, get_ai_mode

def evidence_node(state: InvestigationState) -> InvestigationState:
    """
    LangGraph Node 4: Evidence Agent
    Gathers customer, order, refund, device, address, SKU and linkage evidence from database,
    and structures a formal dispute evidence package.
    """
    start_time = time.time()
    primary_id = state.get("primary_customer_id")
    customer_ids = state.get("customer_ids", [primary_id])
    db = get_db()

    # 1. Retrieve raw database entries
    customer_records = list(db.customers.find({"customerId": {"$in": customer_ids}}))
    orders = list(db.orders.find({"customerId": {"$in": customer_ids}}))
    refunds = list(db.refunds.find({"customerId": {"$in": customer_ids}}))
    devices = list(db.devices.find({"associatedCustomerIds": {"$in": customer_ids}}))
    addresses = list(db.addresses.find({"associatedCustomerIds": {"$in": customer_ids}}))

    # 2. Extract specific lists for evidence packaging
    customer_info = [{"customerId": c["customerId"], "name": c["name"], "email": c["email"], "status": c["status"]} for c in customer_records]
    order_ids = [o["orderId"] for o in orders]
    refund_ids = [r["refundId"] for r in refunds if "refundId" in r]
    
    device_relationships = []
    for d in devices:
        if len(d.get("associatedCustomerIds", [])) > 1:
            device_relationships.append({
                "deviceId": d["deviceId"],
                "fingerprint": d.get("fingerprint", ""),
                "ip": d.get("ipAddress", ""),
                "connectedAccounts": d["associatedCustomerIds"]
            })

    address_relationships = []
    for a in addresses:
        if len(a.get("associatedCustomerIds", [])) > 1:
            address_relationships.append({
                "addressId": a["addressId"],
                "street": a.get("street", ""),
                "connectedAccounts": a["associatedCustomerIds"]
            })

    # Timeline of critical events
    timeline = state.get("investigation_timeline", [])
    
    # Product SKUs involved
    product_skus = []
    product_counts = {}
    for o in orders:
        for item in o.get("items", []):
            p_id = item.get("productId")
            p_title = item.get("productTitle", p_id)
            if p_id:
                product_counts[p_id] = product_counts.get(p_id, 0) + 1
                if p_id not in [p["productId"] for p in product_skus]:
                    product_skus.append({
                        "productId": p_id,
                        "title": p_title,
                        "price": item.get("price", 0)
                    })

    # Extract risk factors from earlier nodes
    risk_factors = []
    verification_res = state.get("verification_result", {})
    if verification_res:
        risk_factors = verification_res.get("riskFactors", [])

    # Assemble structured lists
    key_evidence = [
        f"Detected {len(customer_ids)} linked customer account(s).",
        f"Shared device infrastructure involved: {len(device_relationships)} device(s).",
        f"Shared physical drop locations involved: {len(address_relationships)} address(es)."
    ]
    
    transaction_evidence = [
        f"Order ID: {o['orderId']} | Total: ₹{o.get('totalAmount', 0)} | Status: {o.get('status', '')}" for o in orders[:5]
    ]
    
    relationship_evidence = []
    for dr in device_relationships:
        relationship_evidence.append(f"Device '{dr['deviceId']}' with IP '{dr['ip']}' links accounts: {', '.join(dr['connectedAccounts'])}")
    for ar in address_relationships:
        relationship_evidence.append(f"Address '{ar['street']}' links accounts: {', '.join(ar['connectedAccounts'])}")

    refund_evidence = [
        f"Refund ID: {r.get('refundId', r.get('orderId'))} | Order: {r['orderId']} | Amount: ₹{r.get('amount', 0)} | Status: {r.get('status', '')}" for r in refunds[:5]
    ]

    # Generate a case summary using Gemini if in LLM mode
    ai_mode = get_ai_mode()
    case_summary = ""
    if ai_mode == "LLM":
        llm = get_llm()
        prompt = f"""You are a dispute evidence preparer. 
Generate a professional, objective 2-sentence case summary for customer {primary_id} based on this database evidence:
Linked Customers: {customer_info}
Devices Shared: {device_relationships}
Addresses Shared: {address_relationships}
Refund Count: {len(refunds)}
Do not invent transaction IDs, names, or addresses.
"""
        try:
            response = llm.invoke(prompt)
            case_summary = getattr(response, "content", str(response)).strip()
        except Exception:
            case_summary = f"Refund abuse dispute evidence package for cluster {customer_ids}. Network linkage verified across {len(device_relationships)} shared devices and {len(address_relationships)} addresses with {len(refunds)} total refunds."
    else:
        case_summary = f"Refund abuse dispute evidence package for cluster {customer_ids}. Network linkage verified across {len(device_relationships)} shared devices and {len(address_relationships)} addresses with {len(refunds)} total refunds."

    evidence_package = {
        "caseSummary": case_summary,
        "keyEvidence": key_evidence,
        "transactionEvidence": transaction_evidence,
        "relationshipEvidence": relationship_evidence,
        "refundEvidence": refund_evidence,
        "riskFactors": risk_factors,
        "recommendedEvidence": [
            "Network connection topology visual report",
            "Device browser canvas fingerprint verification",
            "Chronological transaction audit logs"
        ]
    }

    # ── Razorpay MCP Payment Evidence Section ─────────────────────────────────
    rzp_ctx = state.get("razorpay_context", {}) or {}
    if rzp_ctx.get("available"):
        rzp_payments = []
        for p in rzp_ctx.get("payments", []):
            rzp_payments.append(
                f"Payment ID: {p.get('id', 'N/A')} | Status: {p.get('status', 'N/A')} "
                f"| Amount: \u20b9{p.get('amount', 0) / 100:.2f} | Captured: {p.get('captured', False)}"
            )
        rzp_refunds = []
        for r in rzp_ctx.get("refunds", []):
            rzp_refunds.append(
                f"Refund ID: {r.get('id', 'N/A')} | Payment: {r.get('payment_id', 'N/A')} "
                f"| Amount: \u20b9{r.get('amount', 0) / 100:.2f} | Status: {r.get('status', 'N/A')}"
            )
        rzp_orders = []
        for o in rzp_ctx.get("orders", []):
            rzp_orders.append(
                f"Order ID: {o.get('id', 'N/A')} | Status: {o.get('status', 'N/A')} "
                f"| Amount: \u20b9{o.get('amount', 0) / 100:.2f} | Attempts: {o.get('attempts', 0)}"
            )
        evidence_package["razorpayPaymentEvidence"] = {
            "source": "Official Razorpay MCP",
            "mode": rzp_ctx.get("mode", "UNKNOWN"),
            "payments": rzp_payments,
            "refunds": rzp_refunds,
            "orders": rzp_orders,
            "summary": rzp_ctx.get("summary", {}),
        }



    # Update execution steps
    exec_steps = state.get("execution_steps", [])
    step_info = {
        "node": "EvidenceNode",
        "status": "COMPLETED",
        "duration_ms": int((time.time() - start_time) * 1000),
        "output": f"Compiled evidence package containing {len(transaction_evidence)} orders and {len(refund_evidence)} refunds."
    }
    exec_steps.append(step_info)

    state["evidence_package"] = evidence_package
    state["execution_steps"] = exec_steps
    state["investigation_status"] = "EVIDENCE_COMPLETED"

    return state
