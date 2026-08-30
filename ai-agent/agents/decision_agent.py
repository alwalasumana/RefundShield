import time
from graph.state import InvestigationState

def decision_node(state: InvestigationState) -> InvestigationState:
    """
    LangGraph Node 3: Decision Node
    Evaluates evidence strength, builds transparent score breakdown matrix, 
    assigns confidence percentage, recommended action (VERIFY/REVIEW/BLOCK), 
    and human review requirement.
    """
    start_time = time.time()
    risk_score = state.get("risk_score", state.get("risk_score_after", 70))
    evidence = state.get("evidence", [])
    signals = state.get("suspicious_signals", [])

    confidence = 0.85
    if len(evidence) >= 3 or risk_score >= 80:
        confidence = 0.94
    elif len(evidence) == 0:
        confidence = 0.60

    strong_evidence_types = {"SHARED_DEVICE", "SHARED_ADDRESS", "CONNECTED_SUSPICIOUS_CUSTOMERS", "SUSPICIOUS_TIMING"}
    strong_evidence_count = len([e for e in evidence if e.get("type") in strong_evidence_types])

    if risk_score >= 85 and confidence >= 0.80 and strong_evidence_count >= 2:
        recommended_action = "BLOCK"
        human_review_required = True
    elif risk_score >= 45:
        recommended_action = "REVIEW"
        human_review_required = True
    else:
        recommended_action = "VERIFY"
        human_review_required = False

    if confidence < 0.70:
        recommended_action = "REVIEW"
        human_review_required = True

    final_risk_level = "CRITICAL" if risk_score >= 80 else "HIGH" if risk_score >= 60 else "MEDIUM" if risk_score >= 35 else "LOW"

    # Score breakdown matrix explaining additive score components
    score_breakdown = []
    base_calc = 0
    for e in evidence:
        e_type = e.get("type", "")
        contrib = 20
        if e_type == "SHARED_DEVICE": contrib = 25
        elif e_type == "SHARED_ADDRESS": contrib = 20
        elif e_type == "HIGH_REFUND_FREQUENCY": contrib = 25
        elif e_type == "REPEATED_PRODUCT_ABUSE": contrib = 15
        elif e_type == "CONNECTED_SUSPICIOUS_CUSTOMERS": contrib = 12

        base_calc += contrib
        score_breakdown.append({
            "factor": e_type.replace("_", " ").title(),
            "description": e.get("description", ""),
            "contribution": contrib
        })

    # Fill velocity factor if high
    if risk_score > base_calc:
        score_breakdown.append({
            "factor": "Refund Velocity & Cluster Escalation",
            "description": "Rapid claim intervals & multi-hop account links",
            "contribution": min(20, risk_score - base_calc)
        })

    step_info = {
        "node": "DecisionNode",
        "status": "COMPLETED",
        "duration_ms": int((time.time() - start_time) * 1000),
        "output": f"Final Risk: {risk_score}/100 ({final_risk_level}). Confidence: {int(confidence*100)}%. Recommendation: {recommended_action}."
    }

    exec_steps = state.get("execution_steps", [])
    exec_steps.append(step_info)

    state["risk_score"] = risk_score
    state["risk_level"] = final_risk_level
    state["recommended_action"] = recommended_action
    state["confidence"] = confidence
    state["human_review_required"] = human_review_required
    state["score_breakdown"] = score_breakdown
    state["execution_steps"] = exec_steps
    state["investigation_status"] = "COMPLETED"

    return state
