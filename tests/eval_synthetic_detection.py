"""
RefundShield Benchmark & Evaluation Test Suite
Evaluates precision, recall, and false positive rates of the Detection Engine & LangGraph nodes
on planted synthetic abuse networks vs. legitimate control groups.
"""

import sys
import os
import unittest
from pymongo import MongoClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai-agent')))

from tools.customer_tools import get_customer, get_connected_customers
from tools.relationship_tools import get_shared_devices, get_shared_addresses
from agents.detection_agent import detection_node
from agents.investigation_agent import investigation_node
from agents.decision_agent import decision_node
from graph.state import InvestigationState

class TestRefundShieldDetection(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/refundshield")
        cls.client = MongoClient(mongo_uri)
        cls.db = cls.client.get_default_database() if "/" in mongo_uri else cls.client["refundshield"]

    def test_01_shared_device_ring_detection(self):
        """Test detection of Planted Network 1 (Shared Device Ring)"""
        state = {
            "case_id": "TEST-NET1",
            "primary_customer_id": "CUST-NET1-001",
            "customer_ids": ["CUST-NET1-001"],
            "suspicious_signals": [],
            "connected_entities": [],
            "evidence": [],
            "investigation_timeline": [],
            "risk_score": 0,
            "risk_level": "LOW",
            "reasoning": [],
            "recommended_action": "REVIEW",
            "confidence": 0.5,
            "human_review_required": True,
            "investigation_status": "STARTING",
            "summary": ""
        }

        det_state = detection_node(state)
        inv_state = investigation_node(det_state)
        self.assertGreaterEqual(inv_state["risk_score"], 60, "Shared device ring should receive High/Critical risk score")
        self.assertTrue(len(inv_state["evidence"]) > 0)

        dec_state = decision_node(inv_state)
        self.assertIn(dec_state["recommended_action"], ["BLOCK", "REVIEW"])

    def test_02_legitimate_shared_device_control_group(self):
        """Test false-positive avoidance on legitimate family sharing device/address"""
        state = {
            "case_id": "TEST-LEGIT",
            "primary_customer_id": "CUST-LEGIT-FAM1",
            "customer_ids": ["CUST-LEGIT-FAM1"],
            "suspicious_signals": [],
            "connected_entities": [],
            "evidence": [],
            "investigation_timeline": [],
            "risk_score": 0,
            "risk_level": "LOW",
            "reasoning": [],
            "recommended_action": "REVIEW",
            "confidence": 0.5,
            "human_review_required": True,
            "investigation_status": "STARTING",
            "summary": ""
        }

        det_state = detection_node(state)
        inv_state = investigation_node(det_state)
        # Legitimate family should NOT trigger high refund frequency
        self.assertLess(inv_state["risk_score"], 60, "Legitimate family sharing device should NOT be falsely accused as critical abuse")

    def test_03_benchmark_metrics(self):
        """Calculate Precision, Recall, F1, and FPR over synthetic database"""
        true_abuse_ids = ["CUST-NET1-001", "CUST-NET1-002", "CUST-NET2-001", "CUST-NET2-002", "CUST-NET3-001", "CUST-NET4-001", "CUST-NET5-001"]
        legit_ids = ["CUST-LEGIT-FAM1", "CUST-LEGIT-FAM2"]

        tp, fp, tn, fn = 0, 0, 0, 0

        for cid in true_abuse_ids:
            state = {"primary_customer_id": cid, "customer_ids": [cid], "suspicious_signals": []}
            res = investigation_node(detection_node(state))
            if res["risk_score"] >= 50:
                tp += 1
            else:
                fn += 1

        for cid in legit_ids:
            state = {"primary_customer_id": cid, "customer_ids": [cid], "suspicious_signals": []}
            res = investigation_node(detection_node(state))
            if res["risk_score"] >= 50:
                fp += 1
            else:
                tn += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

        print(f"\n==============================================")
        print(f" REFUNDSHIELD AGENT BENCHMARK EVALUATION")
        print(f" True Positives: {tp} | False Positives: {fp}")
        print(f" False Negatives: {fn} | True Negatives: {tn}")
        print(f" Precision: {precision * 100:.1f}%")
        print(f" Recall:    {recall * 100:.1f}%")
        print(f" FPR:       {fpr * 100:.1f}%")
        print(f"==============================================\n")

        self.assertGreaterEqual(precision, 0.80)
        self.assertGreaterEqual(recall, 0.80)

if __name__ == "__main__":
    unittest.main()
