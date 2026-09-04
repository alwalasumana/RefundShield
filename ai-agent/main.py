import os
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from graph.refund_investigation_graph import investigation_graph
from graph.state import InvestigationState
from services.llm_factory import get_ai_mode
from services.razorpay_mcp_client import mcp_status
from agents.risk_monitoring_agent import run_risk_monitoring

app = FastAPI(
    title="RefundShield AI Investigation Service",
    description="LangGraph-powered Coordinated Refund Abuse Investigation Agent with Razorpay MCP Integration",
    version="2.1.0"
)

class InvestigationRequest(BaseModel):
    customer_id: str
    case_id: Optional[str] = None
    # Optional Razorpay identifiers — passed by frontend when available
    payment_id: Optional[str] = None
    order_id: Optional[str] = None
    refund_id: Optional[str] = None

class InvestigationResponse(BaseModel):
    caseId: str
    riskLevel: str
    riskScore: int
    riskScoreBefore: int
    riskScoreAfter: int
    summary: str
    keyFindings: List[str]
    evidence: List[Dict[str, Any]]
    connectedCustomers: List[str]
    connectedEntities: List[str]
    timeline: List[Dict[str, Any]]
    reasoning: List[str]
    recommendedAction: str
    confidence: float
    humanReviewRequired: bool
    networkSummary: Dict[str, Any]
    scoreBreakdown: List[Dict[str, Any]]
    beforeAfterComparison: Dict[str, Any]
    executionSteps: List[Dict[str, Any]]
    verificationResult: Optional[Dict[str, Any]] = None
    evidencePackage: Optional[Dict[str, Any]] = None
    aiMode: str
    razorpayContext: Optional[Dict[str, Any]] = None
    mcpToolCalls: List[Dict[str, Any]] = []

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "RefundShield LangGraph AI Service v2.1",
        "aiMode": get_ai_mode()
    }

@app.get("/api/ai/mcp/status")
def get_mcp_status():
    """
    Health endpoint for Razorpay MCP + RefundShield MCP connectivity.
    NEVER exposes API keys or secrets in the response.
    """
    return mcp_status()

@app.post("/api/ai/investigate", response_model=InvestigationResponse)
def run_investigation(req: InvestigationRequest):
    initial_state: InvestigationState = {
        "case_id": req.case_id or f"CASE-{req.customer_id}",
        "primary_customer_id": req.customer_id,
        "customer_ids": [req.customer_id],
        "suspicious_signals": [],
        "connected_entities": [],
        "evidence": [],
        "investigation_timeline": [],
        "risk_score_before": 0,
        "risk_score_after": 0,
        "risk_score": 0,
        "risk_level": "LOW",
        "reasoning": [],
        "key_findings": [],
        "recommended_action": "REVIEW",
        "confidence": 0.5,
        "human_review_required": True,
        "investigation_status": "STARTING",
        "summary": "",
        "network_summary": {},
        "score_breakdown": [],
        "before_after_comparison": {},
        "ai_mode": get_ai_mode(),
        "execution_steps": [],
        # Razorpay MCP — identifiers seeded from request (may all be None)
        "razorpay_context": {
            "payment_id": req.payment_id,
            "order_id":   req.order_id,
            "refund_id":  req.refund_id,
        },
        "mcp_tool_calls": [],
    }

    try:
        final_state = investigation_graph.invoke(initial_state)

        return InvestigationResponse(
            caseId=final_state.get("case_id"),
            riskLevel=final_state.get("risk_level", "LOW"),
            riskScore=final_state.get("risk_score", 0),
            riskScoreBefore=final_state.get("risk_score_before", 0),
            riskScoreAfter=final_state.get("risk_score_after", 0),
            summary=final_state.get("summary", ""),
            keyFindings=final_state.get("key_findings", []),
            evidence=final_state.get("evidence", []),
            connectedCustomers=final_state.get("customer_ids", []),
            connectedEntities=final_state.get("connected_entities", []),
            timeline=final_state.get("investigation_timeline", []),
            reasoning=final_state.get("reasoning", []),
            recommendedAction=final_state.get("recommended_action", "REVIEW"),
            confidence=final_state.get("confidence", 0.8),
            humanReviewRequired=final_state.get("human_review_required", True),
            networkSummary=final_state.get("network_summary", {}),
            scoreBreakdown=final_state.get("score_breakdown", []),
            beforeAfterComparison=final_state.get("before_after_comparison", {}),
            executionSteps=final_state.get("execution_steps", []),
            verificationResult=final_state.get("verification_result"),
            evidencePackage=final_state.get("evidence_package"),
            aiMode=final_state.get("ai_mode", get_ai_mode()),
            razorpayContext=final_state.get("razorpay_context"),
            mcpToolCalls=final_state.get("mcp_tool_calls", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution failed: {str(e)}")

class MonitorRequest(BaseModel):
    customer_id: str

@app.post("/api/ai/monitor")
def post_payment_monitor(req: MonitorRequest):
    try:
        return run_risk_monitoring(req.customer_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk monitoring failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
