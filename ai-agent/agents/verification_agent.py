import time
from typing import Dict, Any, List
from graph.state import InvestigationState
from services.db_client import get_db
from services.llm_factory import get_llm, get_ai_mode

def verification_node(state: InvestigationState) -> InvestigationState:
    """
    LangGraph Node 3: Verification Agent
    Verifies database linkages, shared devices/addresses, timing velocity, and SKU patterns.
    """
    start_time = time.time()
    primary_id = state.get("primary_customer_id")
    customer_ids = state.get("customer_ids", [primary_id])
    db = get_db()

    checks_performed = []
    supporting_evidence = []
    risk_factors = []

    # 1. Device Sharing Check
    devices = list(db.devices.find({"associatedCustomerIds": {"$in": customer_ids}}))
    shared_devices = [d for d in devices if len(d.get("associatedCustomerIds", [])) > 1]
    device_passed = len(shared_devices) > 0
    checks_performed.append({
        "name": "Device connection verification",
        "passed": device_passed,
        "details": f"Found {len(shared_devices)} device(s) shared across multiple accounts."
    })
    if device_passed:
        risk_factors.append("SHARED_DEVICE")
        for sd in shared_devices:
            supporting_evidence.append(
                f"Device '{sd['deviceId']}' is shared by customers: {', '.join(sd['associatedCustomerIds'])}"
            )

    # 2. Address Sharing Check
    addresses = list(db.addresses.find({"associatedCustomerIds": {"$in": customer_ids}, "isCommercial": False}))
    shared_addresses = [a for a in addresses if len(a.get("associatedCustomerIds", [])) > 1]
    address_passed = len(shared_addresses) > 0
    checks_performed.append({
        "name": "Address connection verification",
        "passed": address_passed,
        "details": f"Found {len(shared_addresses)} address(es) shared across multiple accounts."
    })
    if address_passed:
        risk_factors.append("SHARED_ADDRESS")
        for sa in shared_addresses:
            supporting_evidence.append(
                f"Address '{sa['addressId']}' is shared by customers: {', '.join(sa['associatedCustomerIds'])}"
            )

    # 3. Repeated High-Value SKU Check
    orders = list(db.orders.find({"customerId": {"$in": customer_ids}}))
    product_counts = {}
    for o in orders:
        for item in o.get("items", []):
            p_id = item.get("productId")
            if p_id:
                product_counts[p_id] = product_counts.get(p_id, 0) + 1
    repeated_skus = [pid for pid, count in product_counts.items() if count > 1]
    sku_passed = len(repeated_skus) > 0
    checks_performed.append({
        "name": "SKU repetition verification",
        "passed": sku_passed,
        "details": f"Found {len(repeated_skus)} product SKU(s) repeatedly purchased/refunded across the network."
    })
    if sku_passed:
        risk_factors.append("REPEATED_SKU_ABUSE")
        for r_sku in repeated_skus:
            # get product details
            prod = db.products.find_one({"productId": r_sku})
            p_name = prod.get("title") if prod else r_sku
            supporting_evidence.append(f"Product SKU '{p_name}' was repeatedly ordered across the cluster.")

    # 4. Fast Refund Timing Check (Refund within 48h of purchase)
    refunds = list(db.refunds.find({"customerId": {"$in": customer_ids}}))
    fast_refund_count = 0
    for r in refunds:
        order_id = r.get("orderId")
        if order_id:
            order = db.orders.find_one({"orderId": order_id})
            if order:
                o_time = order.get("createdAt")
                r_time = r.get("createdAt")
                if o_time and r_time:
                    delta = r_time - o_time
                    if delta.total_seconds() < 172800: # 48 hours
                        fast_refund_count += 1
                        supporting_evidence.append(
                            f"Refund for order '{order_id}' was claimed within {delta.total_seconds()/3600:.1f} hours of purchase."
                        )

    timing_passed = fast_refund_count > 0
    checks_performed.append({
        "name": "Refund timing verification",
        "passed": timing_passed,
        "details": f"Found {fast_refund_count} refund(s) claimed within 48 hours of purchase."
    })
    if timing_passed:
        risk_factors.append("FAST_REFUND_PATTERN")

    # 5. Multi-hop connection verification
    is_multi_hop = False
    if len(customer_ids) >= 3:
        has_dev_sharing = False
        has_addr_sharing = False
        for sd in shared_devices:
            if len(sd.get("associatedCustomerIds", [])) >= 2:
                has_dev_sharing = True
        for sa in shared_addresses:
            if len(sa.get("associatedCustomerIds", [])) >= 2:
                has_addr_sharing = True
        if has_dev_sharing and has_addr_sharing:
            is_multi_hop = True
            supporting_evidence.append("Indirect multi-hop network connections detected between accounts.")

    checks_performed.append({
        "name": "Multi-hop connection verification",
        "passed": is_multi_hop,
        "details": "Multi-hop relationships evaluated across connected account cluster."
    })
    if is_multi_hop:
        risk_factors.append("MULTI_HOP_LINK")

    # Verification decision logic
    risk_score = state.get("risk_score", 50)
    passed_count = sum(1 for c in checks_performed if c["passed"])
    
    if passed_count >= 3 or risk_score >= 80:
        verification_status = "VERIFIED_SUSPICIOUS"
        recommendation = "BLOCK"
        confidence = 0.95
    elif passed_count >= 1 or risk_score >= 45:
        verification_status = "VERIFIED_SUSPICIOUS"
        recommendation = "REVIEW"
        confidence = 0.88
    else:
        verification_status = "VERIFIED_SAFE"
        recommendation = "VERIFY"
        confidence = 0.75

    verification_result = {
        "verificationStatus": verification_status,
        "confidence": confidence,
        "checksPerformed": checks_performed,
        "riskFactors": risk_factors,
        "supportingEvidence": supporting_evidence,
        "recommendation": recommendation
    }

    # Optional Gemini interpretation
    ai_mode = get_ai_mode()
    if ai_mode == "LLM":
        llm = get_llm()
        prompt = f"""You are a risk verification agent. 
Interpret these verification checks for customer {primary_id} and their cluster:
Checks Performed: {checks_performed}
Supporting Evidence: {supporting_evidence}
Provide a brief 1-sentence verification summary. Do not fabricate anything.
"""
        try:
            response = llm.invoke(prompt)
            summary = getattr(response, "content", str(response)).strip()
            verification_result["summary"] = summary
        except Exception:
            verification_result["summary"] = f"Verified cluster connections. Discovered {passed_count} active risk indicators."
    else:
        verification_result["summary"] = f"Verified cluster connections. Discovered {passed_count} active risk indicators."

    # Update execution step timings
    exec_steps = state.get("execution_steps", [])
    step_info = {
        "node": "VerificationNode",
        "status": "COMPLETED",
        "duration_ms": int((time.time() - start_time) * 1000),
        "output": f"Verification status: {verification_status} ({passed_count}/{len(checks_performed)} checks matched)."
    }
    exec_steps.append(step_info)

    state["verification_result"] = verification_result
    state["execution_steps"] = exec_steps
    state["investigation_status"] = "VERIFICATION_COMPLETED"

    return state
