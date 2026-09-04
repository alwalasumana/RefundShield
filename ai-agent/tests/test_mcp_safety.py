"""
MCP Safety Gate Tests
Verifies that the three-layer safety enforcement in razorpay_mcp_client.py
prevents any real money operations.
"""
import sys
import os
import importlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASSES = []
FAILS  = []

def check(label, condition, note=""):
    if condition:
        PASSES.append(label)
        print(f"  PASS  {label}")
    else:
        FAILS.append(label)
        print(f"  FAIL  {label} -- {note}")

# ─── Test 1: Live credentials are rejected ────────────────────────────────────
os.environ["RAZORPAY_KEY_ID"]     = "rzp_live_FAKELIVEID"
os.environ["RAZORPAY_KEY_SECRET"] = "fakeLiveSecret999"
import services.razorpay_mcp_client as m
importlib.reload(m)

check("Live key rzp_live_... is rejected",
      m.RAZORPAY_KEY_ID == "",
      f"Got: {m.RAZORPAY_KEY_ID!r}")

status = m.mcp_status()
check("mcp_status returns configured=False for live key",
      status["razorpayMcp"]["configured"] == False)

check("safetyPolicy is present in status",
      "safetyPolicy" in status)

# ─── Test 2: Unknown prefix is also rejected ──────────────────────────────────
os.environ["RAZORPAY_KEY_ID"] = "rzp_UNKNOWN_xyz"
importlib.reload(m)
check("Unknown key prefix is rejected",
      m.RAZORPAY_KEY_ID == "")

# ─── Test 3: Test-mode credentials are accepted ──────────────────────────────
os.environ["RAZORPAY_KEY_ID"]     = "rzp_test_FAKETESTID"
os.environ["RAZORPAY_KEY_SECRET"] = "fakeTestSecret"
importlib.reload(m)
check("Test key rzp_test_... is accepted",
      m.RAZORPAY_KEY_ID == "rzp_test_FAKETESTID")
check("Mode detected as TEST",
      m._detect_mode() == "TEST")

# ─── Test 4: Allowlist — write tools are blocked ─────────────────────────────
write_tools = [
    "create_payment", "capture_payment", "issue_refund",
    "create_payout", "create_transfer", "cancel_payment",
    "modify_order", "delete_refund",
]
for tool in write_tools:
    record = m._invoke_tool(tool, {}, "Should be blocked")
    check(f"Write tool '{tool}' is BLOCKED",
          record["status"] == "BLOCKED",
          f"Got status={record['status']}")

# ─── Test 5: Keyword blocklist (belt-and-suspenders) ─────────────────────────
danger_tools = ["settle_payment", "transfer_funds", "charge_card", "authorize_capture"]
for tool in danger_tools:
    # Force these into the allowlist temporarily to test keyword gate
    m.ALLOWED_RAZORPAY_MCP_TOOLS.add(tool)
    record = m._invoke_tool(tool, {}, "Keyword blocklist test")
    m.ALLOWED_RAZORPAY_MCP_TOOLS.discard(tool)
    check(f"Dangerous keyword in '{tool}' is BLOCKED by keyword gate",
          record["status"] == "BLOCKED",
          f"Got status={record['status']}")

# ─── Test 6: Safe read tools pass the safety gates ───────────────────────────
safe_tools = ["fetch_payment", "get_order", "list_refunds"]
for tool in safe_tools:
    record = m._invoke_tool(tool, {"payment_id": "pay_test123"}, "Read-only call")
    check(f"Safe tool '{tool}' is NOT blocked by safety gates",
          record["status"] in ("SUCCESS", "FAILED", "TIMEOUT"),
          f"Got status={record['status']}")

# ─── Test 7: get_customer_payment_context refuses live creds ─────────────────
os.environ["RAZORPAY_KEY_ID"] = "rzp_live_LIVEKEY"
importlib.reload(m)
result = m.get_customer_payment_context(payment_id="pay_live123")
check("get_customer_payment_context refuses live credentials",
      result.get("available") == False and "reject" in result.get("reason", "").lower()
      or "not configured" in result.get("reason", "").lower()
      or "rejected" in result.get("reason", "").lower(),
      f"Got: {result}")

# ─── Summary ──────────────────────────────────────────────────────────────────
print()
print("=" * 54)
print(f" SAFETY TEST RESULTS: {len(PASSES)} passed, {len(FAILS)} failed")
print("=" * 54)
if FAILS:
    print("FAILED TESTS:")
    for f in FAILS:
        print(f"  - {f}")
    sys.exit(1)
else:
    print(" All safety gates are enforced.")
    print(" Zero real money can be accessed, charged, or moved.")
    sys.exit(0)
