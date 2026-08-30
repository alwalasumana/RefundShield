from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict

class InvestigationState(TypedDict):
    case_id: str
    primary_customer_id: str
    customer_ids: List[str]
    suspicious_signals: List[Dict[str, Any]]
    connected_entities: List[str]
    evidence: List[Dict[str, Any]]
    investigation_timeline: List[Dict[str, Any]]
    risk_score_before: int
    risk_score_after: int
    risk_score: int
    risk_level: str
    reasoning: List[str]
    key_findings: List[str]
    recommended_action: str  # 'VERIFY', 'REVIEW', 'BLOCK'
    confidence: float
    human_review_required: bool
    investigation_status: str
    summary: str
    network_summary: Dict[str, Any]
    score_breakdown: List[Dict[str, Any]]
    before_after_comparison: Dict[str, Any]
    ai_mode: str
    execution_steps: List[Dict[str, Any]]
