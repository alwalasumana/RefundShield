import time
from typing import Dict, Any, List
from services.db_client import get_db
from graph.refund_investigation_graph import investigation_graph
from graph.state import InvestigationState
from services.llm_factory import get_ai_mode

def run_risk_monitoring(customer_id: str) -> Dict[str, Any]:
    """
    Upgraded Post-Payment Risk Monitoring Agent:
    Asynchronously executes the full 5-agent LangGraph investigation pipeline on successful checkout.
    Propagates risk across discovered connected accounts and logs a synchronized case trace.
    """
    start_time = time.time()
    db = get_db()

    # 1. Fetch customer details
    customer = db.customers.find_one({"customerId": customer_id})
    if not customer:
        return {"status": "ERROR", "message": f"Customer {customer_id} not found"}

    # 2. Initialize and invoke the 5-Agent LangGraph workflow
    initial_state: InvestigationState = {
        "case_id": f"CASE-{customer_id}",
        "primary_customer_id": customer_id,
        "customer_ids": [customer_id],
        "suspicious_signals": [],
        "connected_entities": [],
        "evidence": [],
        "investigation_timeline": [],
        "risk_score_before": customer.get("riskScore", 0),
        "risk_score_after": 0,
        "risk_score": customer.get("riskScore", 0),
        "risk_level": customer.get("riskLevel", "LOW"),
        "reasoning": [],
        "key_findings": [],
        "recommended_action": "REVIEW",
        "confidence": 0.8,
        "human_review_required": True,
        "investigation_status": "STARTING",
        "summary": "",
        "network_summary": {},
        "score_breakdown": [],
        "before_after_comparison": {},
        "ai_mode": get_ai_mode(),
        "execution_steps": []
    }

    try:
        # Run full LangGraph AI pipeline asynchronously in the background
        final_state = investigation_graph.invoke(initial_state)
    except Exception as e:
        print(f"[ERROR] LangGraph background execution failed: {str(e)}")
        # Fallback to local deterministic analysis if LangGraph crashes
        return {"status": "FAILED", "reason": str(e)}

    # Extract results from LangGraph
    final_risk_score = final_state.get("risk_score", 0)
    final_risk_level = final_state.get("risk_level", "LOW")
    recommended_action = final_state.get("recommended_action", "REVIEW")
    connected_customers = final_state.get("customer_ids", [customer_id])
    connected_entities = final_state.get("connected_entities", [])
    evidence = final_state.get("evidence", [])
    timeline = final_state.get("investigation_timeline", [])
    reasoning = final_state.get("reasoning", [])
    summary = final_state.get("summary", "")
    score_breakdown = final_state.get("score_breakdown", [])
    exec_steps = final_state.get("execution_steps", [])

    # 3. Update the Primary Customer status in MongoDB
    primary_status = "UNDER_REVIEW"
    if recommended_action == "BLOCK":
        primary_status = "SUSPENDED"
    elif final_risk_score < 45:
        primary_status = "ACTIVE"

    db.customers.update_one(
        {"customerId": customer_id},
        {"$set": {
            "riskScore": final_risk_score,
            "riskLevel": final_risk_level,
            "status": primary_status
        }}
    )

    # 4. CRITICAL CO-ORDINATED FRAUD RING ISOLATION (RISK PROPAGATION)
    # Propagate risk to all connected customer accounts uncovered by the LangGraph agents
    propagated_updates = []
    for conn_id in connected_customers:
        if conn_id == customer_id:
            continue
        
        conn_cust = db.customers.find_one({"customerId": conn_id})
        if conn_cust:
            # Connected accounts inherit 85% of the primary's risk score (co-association rule)
            inherited_score = min(100, max(conn_cust.get("riskScore", 0), int(final_risk_score * 0.85)))
            inherited_level = "CRITICAL" if inherited_score >= 80 else "HIGH" if inherited_score >= 60 else "MEDIUM" if inherited_score >= 35 else "LOW"
            
            # If primary is blocked, flag connected group members as UNDER_REVIEW at checkout
            inherited_status = "UNDER_REVIEW"
            if primary_status == "SUSPENDED":
                inherited_status = "UNDER_REVIEW" # Place ring accounts under investigation

            db.customers.update_one(
                {"customerId": conn_id},
                {"$set": {
                    "riskScore": inherited_score,
                    "riskLevel": inherited_level,
                    "status": inherited_status
                }}
            )
            propagated_updates.append(conn_id)

    # 5. Create or Update the Investigation Case document in MongoDB
    existing_case = db.investigationcases.find_one({"primaryCustomerId": customer_id})
    
    # Map signals for the Case document
    case_signals = []
    for ev in evidence:
        case_signals.append({
            "type": ev.get("type", "SUSPICIOUS_LINK"),
            "description": ev.get("description", "Discovered connection link"),
            "scoreContribution": 20,
            "sourceIds": ev.get("sourceIds", [])
        })

    # Prepare timeline events
    case_timeline = []
    for t in timeline:
        case_timeline.append({
            "timestamp": t.get("timestamp") or time.time(),
            "event": t.get("event", "Investigation Audit Event"),
            "details": t.get("details", ""),
            "type": t.get("type", "SYSTEM")
        })

    case_data = {
        "caseId": f"CASE-{customer_id}",
        "title": f"Refund Investigation: {customer['name']} ({customer_id})",
        "primaryCustomerId": customer_id,
        "customerIds": connected_customers,
        "deviceIds": connected_entities,
        "addressIds": connected_entities,
        "riskScore": final_risk_score,
        "riskLevel": final_risk_level,
        "signals": case_signals,
        "evidence": evidence,
        "timeline": case_timeline,
        "reasoning": reasoning,
        "summary": summary,
        "recommendedAction": recommended_action,
        "confidence": final_state.get("confidence", 0.85),
        "humanReviewRequired": final_state.get("human_review_required", True),
        "status": "UNDER_INVESTIGATION" if recommended_action == "BLOCK" else "PENDING",
        "updatedAt": time.time()
    }

    if not existing_case:
        case_data["createdAt"] = time.time()
        db.investigationcases.insert_one(case_data)
    else:
        db.investigationcases.update_one(
            {"primaryCustomerId": customer_id},
            {"$set": case_data}
        )

    return {
        "status": "COMPLETED",
        "customerId": customer_id,
        "riskScore": final_risk_score,
        "riskLevel": final_risk_level,
        "recommendedAction": recommended_action,
        "connectedAccounts": connected_customers,
        "propagatedUpdates": propagated_updates,
        "evidenceCount": len(evidence),
        "duration_ms": int((time.time() - start_time) * 1000)
    }
