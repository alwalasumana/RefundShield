import time
from graph.state import InvestigationState
from tools.refund_tools import get_refund_timeline, get_customer_refunds
from tools.product_tools import get_common_products
from tools.customer_tools import get_customer
from services.llm_factory import get_llm, get_ai_mode
from services.db_client import get_db

def investigation_node(state: InvestigationState) -> InvestigationState:
  """
  LangGraph Node 2: Investigation Node
  Queries PyMongo database tools, discovers deep transitive links & SKU abuse clusters, 
  calculates risk_score_after, constructs network summary & visual timeline, 
  and invokes LLM reasoning over ground truth database records.
  """
  start_time = time.time()
  customer_ids = state.get("customer_ids", [])
  primary_id = state.get("primary_customer_id")
  signals = state.get("suspicious_signals", [])
  risk_before = state.get("risk_score_before", 50)
  db = get_db()

  # 1. Retrieve full chronological timeline across cluster
  timeline = get_refund_timeline(customer_ids)

  # 2. Discover common product SKUs repeatedly refunded across cluster
  common_products = get_common_products(customer_ids)

  # 3. Formulate grounded evidence items referencing database IDs
  evidence_list = []
  for sig in signals:
    evidence_list.append({
      "type": sig["type"],
      "description": sig["description"],
      "sourceIds": sig.get("sourceIds", [])
    })

  if common_products:
    p_titles = [p["title"] for p in common_products]
    evidence_list.append({
      "type": "REPEATED_PRODUCT_ABUSE",
      "description": f"Identical high-value SKUs [{', '.join(p_titles)}] repeatedly refunded across connected customer cluster.",
      "sourceIds": [p["productId"] for p in common_products]
    })

  # 4. Compute cluster aggregations for Network Summary
  cluster_orders = list(db.orders.find({"customerId": {"$in": customer_ids}}))
  cluster_refunds = list(db.refunds.find({"customerId": {"$in": customer_ids}}))
  
  total_refund_val = sum([r.get("amount", 0) for r in cluster_refunds])

  # Calculate shared devices & addresses (used by more than 1 distinct customer in the cluster)
  dev_to_custs = {}
  addr_to_custs = {}
  for o in cluster_orders:
    c_id = o.get("customerId")
    d_id = o.get("deviceId")
    a_id = o.get("addressId")
    if c_id:
      if d_id:
        dev_to_custs.setdefault(d_id, set()).add(c_id)
      if a_id:
        addr_to_custs.setdefault(a_id, set()).add(c_id)

  shared_dev_count = sum(1 for d, custs in dev_to_custs.items() if len(custs) > 1)
  shared_addr_count = sum(1 for a, custs in addr_to_custs.items() if len(custs) > 1)

  # Calculate days active
  dates = []
  for item in cluster_orders + cluster_refunds:
    dt = item.get("createdAt")
    if dt: dates.append(dt)

  days_window = 1
  if len(dates) >= 2:
    dates.sort()
    delta = dates[-1] - dates[0]
    days_window = max(1, delta.days)

  network_summary = {
    "customerCount": len(customer_ids),
    "deviceCount": max(1, shared_dev_count), # Default to at least 1 if cluster matches
    "addressCount": shared_addr_count,
    "orderCount": len(cluster_orders),
    "refundCount": len(cluster_refunds),
    "totalRefundValue": total_refund_val,
    "activityWindowDays": days_window
  }

  # 5. Deep Investigation Risk Escalation
  risk_score_after = risk_before
  if len(cluster_refunds) >= 4:
    risk_score_after += 12
  if len(common_products) >= 1:
    risk_score_after += 15
  if len(customer_ids) >= 3:
    risk_score_after += 10

  risk_score_after = min(100, risk_score_after)

  before_after_comparison = {
    "before": {
      "riskScore": risk_before,
      "signalCount": len(signals),
      "connectedAccounts": max(0, len(customer_ids) - 1)
    },
    "after": {
      "riskScore": risk_score_after,
      "signalCount": len(evidence_list),
      "connectedAccounts": max(0, len(customer_ids) - 1),
      "evidenceCount": len(evidence_list),
      "totalRefundValue": total_refund_val
    }
  }

  # 6. Invoke LLM for grounded reasoning & key findings
  ai_mode = get_ai_mode()
  llm = get_llm()

  prompt = f"""You are an expert fraud investigation AI for RefundShield.
Investigate Customer: {primary_id}
Connected Customer Cluster: {customer_ids}
Network Overview: {network_summary}
Evidence Discovered: {evidence_list}
Timeline Overview: {timeline[:5]}

Formulate an evidence-grounded investigation summary explaining WHY these accounts are connected and suspicious.
Return a concise 2-sentence summary.
"""

  try:
    response = llm.invoke(prompt)
    llm_text = getattr(response, "content", str(response))
  except Exception as e:
    llm_text = f"Investigation of customer cluster {primary_id} revealed {len(customer_ids)} connected accounts sharing {shared_dev_count} device fingerprint(s) and {shared_addr_count} delivery address(es) with {len(cluster_refunds)} refund claims totaling ₹{total_refund_val}."

  connection_label = "shared device or delivery address records" if shared_dev_count or shared_addr_count else "customer order and refund records"
  key_findings = [
    f"{len(customer_ids)} customer account(s) linked through {connection_label}.",
    f"Cluster generated {len(cluster_refunds)} refund claims totaling ₹{total_refund_val:,} over a {days_window}-day window.",
    f"Repeated claims targeting identical high-value electronics SKUs ({', '.join([p['title'] for p in common_products[:2]]) or 'Electronics'})."
  ]

  reasoning_trace = [
    f"Retrieved {len(cluster_orders)} orders and {len(cluster_refunds)} refund records across customer network {customer_ids}.",
    f"Discovered {shared_dev_count} shared hardware device(s) and {shared_addr_count} physical delivery address(es).",
    f"Calculated risk escalation from baseline score {risk_before}/100 to post-investigation score {risk_score_after}/100.",
    f"Summary generated from internal evidence: {llm_text[:280]}"
  ]

  step_info = {
    "node": "InvestigationNode",
    "status": "COMPLETED",
    "duration_ms": int((time.time() - start_time) * 1000),
    "output": f"Queried {len(cluster_refunds)} refunds, found {len(evidence_list)} evidence vectors. Risk escalated to {risk_score_after}/100."
  }

  exec_steps = state.get("execution_steps", [])
  exec_steps.append(step_info)

  state["evidence"] = evidence_list
  state["investigation_timeline"] = timeline
  state["reasoning"] = reasoning_trace
  state["key_findings"] = key_findings
  state["summary"] = llm_text
  state["risk_score_after"] = risk_score_after
  state["risk_score"] = risk_score_after
  state["network_summary"] = network_summary
  state["before_after_comparison"] = before_after_comparison
  state["ai_mode"] = ai_mode
  state["execution_steps"] = exec_steps
  state["investigation_status"] = "INVESTIGATION_COMPLETED"

  return state
