import os
import sys
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from graph.refund_investigation_graph import investigation_graph
from graph.state import InvestigationState
from services.llm_factory import get_ai_mode

app = FastAPI(
    title="RefundShield AI Investigation Service",
    description="LangGraph-powered Coordinated Refund Abuse Investigation Agent",
    version="2.0.0"
)

class InvestigationRequest(BaseModel):
    customer_id: str
    case_id: Optional[str] = None

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
    aiMode: str

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "RefundShield LangGraph AI Service",
        "aiMode": get_ai_mode()
    }

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
        "execution_steps": []
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
            aiMode=final_state.get("ai_mode", get_ai_mode())
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangGraph execution failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
