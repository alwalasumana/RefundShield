import time
from graph.state import InvestigationState
from services.llm_factory import get_llm, get_ai_mode

def decision_node(state: InvestigationState) -> InvestigationState:
    """
    LangGraph Node 5: Decision Node
    Evaluates outputs from Detection, Investigation, Verification, and Evidence agents
    to determine the final Risk Score, Recommended Action, Confidence, and human review status.
    """
    start_time = time.time()
    risk_score = state.get("risk_score", state.get("risk_score_after", 70))
    evidence = state.get("evidence", [])
    verification_res = state.get("verification_result", {})
    evidence_pkg = state.get("evidence_package", {})

    # Compute baseline confidence
    confidence = 0.85
    if verification_res:
        confidence = verification_res.get("confidence", 0.85)
    
    if len(evidence) >= 3 or risk_score >= 80:
        confidence = max(confidence, 0.94)
    elif len(evidence) == 0:
        confidence = min(confidence, 0.60)

    # Determine recommended action using verification and risk metrics
    recommended_action = "REVIEW"
    if verification_res.get("recommendation") == "BLOCK" or (risk_score >= 85 and confidence >= 0.85):
        recommended_action = "BLOCK"
        human_review_required = True
    elif verification_res.get("recommendation") == "VERIFY" or (risk_score < 45 and confidence >= 0.75):
        recommended_action = "VERIFY"
        human_review_required = False
    else:
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

    # Optional Gemini decision reasoning
    ai_mode = get_ai_mode()
    final_summary = state.get("summary", "")
    if ai_mode == "LLM":
        llm = get_llm()
        prompt = f"""You are the final risk decision agent. Review all previous findings:
Risk Score: {risk_score}
Verification Recommendation: {verification_res.get("recommendation")}
Evidence Summary: {evidence_pkg.get("caseSummary")}
Write a concise 2-sentence executive summary stating the recommended action ({recommended_action}) and key justification based ONLY on this evidence.
"""
        try:
            response = llm.invoke(prompt)
            final_summary = getattr(response, "content", str(response)).strip()
        except Exception:
            pass

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
    state["summary"] = final_summary
    state["investigation_status"] = "COMPLETED"

    # Also set final_decision field
    state["final_decision"] = {
        "action": recommended_action,
        "riskScore": risk_score,
        "riskLevel": final_risk_level,
        "confidence": confidence,
        "summary": final_summary
    }

    return state
