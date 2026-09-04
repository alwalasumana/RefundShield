from langgraph.graph import StateGraph, START, END
from graph.state import InvestigationState
from agents.detection_agent import detection_node
from agents.investigation_agent import investigation_node
from agents.verification_agent import verification_node
from agents.evidence_agent import evidence_node
from agents.decision_agent import decision_node

def build_investigation_graph():
    builder = StateGraph(InvestigationState)

    # 1. Add All AI Agent Nodes
    builder.add_node("detection_node", detection_node)
    builder.add_node("investigation_node", investigation_node)
    builder.add_node("verification_node", verification_node)
    builder.add_node("evidence_node", evidence_node)
    builder.add_node("decision_node", decision_node)

    # 2. Add Connections / Edges (Linear Flow)
    builder.add_edge(START, "detection_node")
    builder.add_edge("detection_node", "investigation_node")
    builder.add_edge("investigation_node", "verification_node")
    builder.add_edge("verification_node", "evidence_node")
    builder.add_edge("evidence_node", "decision_node")
    builder.add_edge("decision_node", END)

    return builder.compile()

# Instantiated Graph Instance
investigation_graph = build_investigation_graph()
