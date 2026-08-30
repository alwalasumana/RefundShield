from langgraph.graph import StateGraph, START, END
from graph.state import InvestigationState
from agents.detection_agent import detection_node
from agents.investigation_agent import investigation_node
from agents.decision_agent import decision_node

def check_evidence_sufficiency(state: InvestigationState) -> str:
    """
    Conditional Routing Edge:
    Evaluates if evidence gathered in Investigation Node is sufficient for direct Decision
    or requires immediate flag as REVIEW.
    """
    evidence = state.get("evidence", [])
    if len(evidence) == 0:
        # Route to decision node with review flag
        return "insufficient_evidence"
    return "sufficient_evidence"

def build_investigation_graph():
    builder = StateGraph(InvestigationState)

    # 1. Add Explicit Nodes
    builder.add_node("detection_node", detection_node)
    builder.add_node("investigation_node", investigation_node)
    builder.add_node("decision_node", decision_node)

    # 2. Add Explicit Edges
    builder.add_edge(START, "detection_node")
    builder.add_edge("detection_node", "investigation_node")

    # 3. Add Conditional Edge
    builder.add_conditional_edges(
        "investigation_node",
        check_evidence_sufficiency,
        {
            "sufficient_evidence": "decision_node",
            "insufficient_evidence": "decision_node"
        }
    )

    builder.add_edge("decision_node", END)

    return builder.compile()

# Instantiated Graph Instance
investigation_graph = build_investigation_graph()
