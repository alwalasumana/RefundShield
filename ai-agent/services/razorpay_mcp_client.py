"""
RefundShield — Official Razorpay MCP Adapter
=============================================
Connects to the Official Razorpay Remote MCP Server (https://mcp.razorpay.com/mcp)
for read-only payment intelligence during fraud investigations.

╔══════════════════════════════════════════════════════════════════╗
║                 FINANCIAL SAFETY CONTRACT                        ║
║                                                                  ║
║  ₹0 real money will EVER be deducted, charged, transferred,      ║
║  refunded, captured, settled, or moved by this module.           ║
║                                                                  ║
║  Enforcement mechanisms:                                         ║
║  1. TEST-MODE-ONLY: rzp_live_... credentials are HARD REJECTED.  ║
║  2. READ-ONLY ALLOWLIST: Any MCP tool that is not explicitly in  ║
║     ALLOWED_RAZORPAY_MCP_TOOLS is BLOCKED before invocation.     ║
║  3. KEYWORD BLOCKLIST: Tool names containing create/capture/     ║
║     refund/payout/transfer/settle/charge are BLOCKED even if     ║
║     somehow listed in the allowlist (belt-and-suspenders).       ║
║  4. All failures degrade gracefully — no crash, no retry loop.   ║
╚══════════════════════════════════════════════════════════════════╝
"""

import os
import json
import base64
import logging
from typing import Dict, Any, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

RAZORPAY_MCP_ENDPOINT   = "https://mcp.razorpay.com/mcp"
REQUEST_TIMEOUT_SECONDS = 8   # Short — never hang a demo or a pipeline

_RAW_KEY_ID     = os.getenv("RAZORPAY_KEY_ID", "")
_RAW_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

# ─── SAFETY RULE 1: TEST MODE ONLY ────────────────────────────────────────────
# Live credentials are unconditionally rejected at module load.
# rzp_live_... keys will NEVER be accepted, regardless of any other logic.

def _enforce_test_mode_only() -> tuple:
    """
    Hard-reject LIVE credentials.
    Returns (key_id, key_secret) only when both are TEST-mode keys.
    Returns ("", "") in all other cases — the module will gracefully no-op.
    """
    key_id     = _RAW_KEY_ID.strip()
    key_secret = _RAW_KEY_SECRET.strip()

    if not key_id or not key_secret:
        return ("", "")

    if key_id.startswith("rzp_live_"):
        logger.error(
            "[RazorpayMCP] SAFETY BLOCK: Live credentials detected. "
            "rzp_live_... keys are REJECTED. Use rzp_test_... keys only. "
            "No real money will be accessed."
        )
        return ("", "")

    if not key_id.startswith("rzp_test_"):
        logger.warning(
            "[RazorpayMCP] SAFETY BLOCK: Unrecognised key prefix. "
            "Only rzp_test_... keys are accepted. Disabling MCP integration."
        )
        return ("", "")

    # Both checks passed — this is a test-mode key
    return (key_id, key_secret)


RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET = _enforce_test_mode_only()

# ─── SAFETY RULE 2: READ-ONLY ALLOWLIST ───────────────────────────────────────
# ONLY tools confirmed to be read-only (fetch / get / list) are permitted.
# ANY tool not in this exact set is rejected before the HTTP call is made.

ALLOWED_RAZORPAY_MCP_TOOLS: set = {
    # Payment READ tools
    "fetch_payment",
    "get_payment",
    "list_payments",
    "fetch_all_payments",
    # Order READ tools
    "fetch_order",
    "get_order",
    "fetch_orders",
    "list_orders",
    "fetch_order_payments",
    "get_order_payments",
    # Refund READ tools (reading refund records, NOT issuing refunds)
    "fetch_refund",
    "get_refund",
    "fetch_all_refunds_of_payment",
    "list_refunds",
    # Settlement READ tools
    "fetch_settlement",
    "fetch_settlements",
    # Prefixed variants
    "razorpay_fetch_payment",
    "razorpay_fetch_order",
    "razorpay_fetch_refund",
    "razorpay_list_payments",
    "razorpay_list_orders",
    "razorpay_list_refunds",
}

# ─── SAFETY RULE 3: KEYWORD BLOCKLIST (belt-and-suspenders) ───────────────────
# If a tool name contains ANY of these keywords it is BLOCKED, even if somehow
# it appeared in ALLOWED_RAZORPAY_MCP_TOOLS above.
# This protects against future MCP server additions that could move money.

_DANGEROUS_KEYWORDS = {
    "create", "capture", "issue_refund", "cancel", "payout",
    "transfer", "settle", "charge", "authorize", "void",
    "modify", "update", "delete", "edit", "post",
}

def _is_safe_tool(tool_name: str) -> bool:
    """Return False (BLOCK) if the tool name contains any dangerous keyword."""
    name_lower = tool_name.lower()
    for kw in _DANGEROUS_KEYWORDS:
        if kw in name_lower:
            return False
    return True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_configured() -> bool:
    """True only when test-mode credentials passed the safety gate."""
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)

def _auth_header() -> str:
    token = base64.b64encode(
        f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode()
    ).decode()
    return f"Basic {token}"

def _headers() -> Dict[str, str]:
    return {
        "Content-Type":  "application/json",
        "Authorization": _auth_header(),
    }

def _detect_mode() -> str:
    if RAZORPAY_KEY_ID.startswith("rzp_test_"):
        return "TEST"
    # rzp_live_ is rejected above so this branch should never be reached
    return "UNKNOWN"


# ─── MCP JSON-RPC Primitives ──────────────────────────────────────────────────

def _jsonrpc_post(method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Low-level JSON-RPC 2.0 call to the Razorpay Remote MCP endpoint."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    }
    resp = requests.post(
        RAZORPAY_MCP_ENDPOINT,
        headers=_headers(),
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    resp.raise_for_status()
    body = resp.json()
    if "error" in body:
        raise RuntimeError(f"Razorpay MCP error: {body['error']}")
    return body.get("result", {})


def discover_tools() -> List[Dict[str, Any]]:
    """Discover currently available tools from the MCP server."""
    try:
        result = _jsonrpc_post("tools/list", {})
        return result.get("tools", [])
    except Exception as e:
        logger.warning(f"[RazorpayMCP] Tool discovery failed: {e}")
        return []


def _invoke_tool(tool_name: str, arguments: Dict[str, Any], purpose: str) -> Dict[str, Any]:
    """
    Invoke a single Razorpay MCP tool.
    Three safety gates are checked in sequence before any HTTP call is made:
      1. Allowlist check
      2. Keyword blocklist check
      3. Any failure → FAILED record, pipeline continues
    Returns a normalised call record: {server, tool, status, purpose, data}.
    """
    call_record: Dict[str, Any] = {
        "server":  "Razorpay MCP",
        "tool":    tool_name,
        "status":  "SKIPPED",
        "purpose": purpose,
        "data":    None,
    }

    # ── Safety Gate 1: Allowlist ───────────────────────────────────────────────
    if tool_name not in ALLOWED_RAZORPAY_MCP_TOOLS:
        call_record["status"] = "BLOCKED"
        call_record["reason"] = (
            f"Tool '{tool_name}' is not in the read-only allowlist. "
            "No action was taken."
        )
        logger.warning(f"[RazorpayMCP][SAFETY] Blocked non-allowlisted tool: {tool_name}")
        return call_record

    # ── Safety Gate 2: Keyword blocklist ──────────────────────────────────────
    if not _is_safe_tool(tool_name):
        call_record["status"] = "BLOCKED"
        call_record["reason"] = (
            f"Tool '{tool_name}' contains a dangerous keyword. "
            "Blocked to prevent real money operations."
        )
        logger.warning(f"[RazorpayMCP][SAFETY] Keyword-blocked tool: {tool_name}")
        return call_record

    # ── Invoke ────────────────────────────────────────────────────────────────
    try:
        result  = _jsonrpc_post("tools/call", {
            "name":      tool_name,
            "arguments": arguments,
        })
        content      = result.get("content", [])
        text_content = next(
            (item.get("text") for item in content if item.get("type") == "text"),
            None,
        )
        parsed = None
        if text_content:
            try:
                parsed = json.loads(text_content)
            except Exception:
                parsed = {"raw": text_content}

        call_record["status"] = "SUCCESS"
        call_record["data"]   = parsed

    except requests.exceptions.Timeout:
        call_record["status"] = "TIMEOUT"
        call_record["reason"] = "Request timed out."

    except Exception as e:
        call_record["status"] = "FAILED"
        # Truncate to avoid leaking full stack traces or secrets in response
        call_record["reason"] = str(e)[:200]
        logger.warning(f"[RazorpayMCP] Tool call '{tool_name}' failed: {type(e).__name__}")

    return call_record


# ─── Public API ───────────────────────────────────────────────────────────────

def mcp_status() -> Dict[str, Any]:
    """
    Health / status check for the /api/ai/mcp/status endpoint.
    Returns connectivity and discovered tool names.
    NEVER exposes API keys, secrets, or auth headers.
    """
    if not _is_configured():
        reason = (
            "Live credentials are not accepted. Use rzp_test_... keys."
            if _RAW_KEY_ID.startswith("rzp_live_")
            else "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in ai-agent/.env."
        )
        return {
            "razorpayMcp": {
                "configured":       False,
                "connected":        False,
                "mode":             "TEST_ONLY_ENFORCED",
                "endpoint":         RAZORPAY_MCP_ENDPOINT,
                "toolsAvailable":   [],
                "toolsAllowlisted": [],
                "reason":           reason,
            },
            "refundShieldMcp": {"available": True},
            "safetyPolicy": "READ_ONLY · TEST_MODE_ONLY · LIVE_CREDENTIALS_REJECTED",
        }

    tools       = discover_tools()
    tool_names  = [t.get("name", "") for t in tools]
    allowlisted = [
        n for n in tool_names
        if n in ALLOWED_RAZORPAY_MCP_TOOLS and _is_safe_tool(n)
    ]

    return {
        "razorpayMcp": {
            "configured":       True,
            "connected":        len(tools) > 0,
            "mode":             _detect_mode(),
            "endpoint":         RAZORPAY_MCP_ENDPOINT,
            "toolsAvailable":   tool_names,
            "toolsAllowlisted": allowlisted,
        },
        "refundShieldMcp": {"available": True},
        "safetyPolicy": "READ_ONLY · TEST_MODE_ONLY · LIVE_CREDENTIALS_REJECTED",
    }


def get_customer_payment_context(
    payment_id: Optional[str] = None,
    order_id:   Optional[str] = None,
    refund_id:  Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch read-only payment context from Razorpay MCP for use by the
    Investigation Agent. Only queries when a real identifier is provided.
    Returns normalised data plus a full tool-call trace.

    SAFETY: Live credentials are rejected before this function can run.
    All tool calls go through the three-gate safety check in _invoke_tool().
    Failures return {"available": False} so the LangGraph pipeline continues.
    """
    # ── Pre-flight safety check ───────────────────────────────────────────────
    if not _is_configured():
        return {
            "available": False,
            "reason": (
                "Live credentials rejected — use rzp_test_... keys."
                if _RAW_KEY_ID.startswith("rzp_live_")
                else "Razorpay MCP credentials are not configured."
            ),
        }

    if not any([payment_id, order_id, refund_id]):
        return {
            "available": False,
            "reason": "No Razorpay payment/order/refund identifier available for this case.",
        }

    # ── Discover available tools ──────────────────────────────────────────────
    available_tool_names = {t["name"] for t in discover_tools()}
    if not available_tool_names:
        available_tool_names = ALLOWED_RAZORPAY_MCP_TOOLS   # fall back to known list

    tool_calls: List[Dict]  = []
    payments:   List[Dict]  = []
    orders:     List[Dict]  = []
    refunds:    List[Dict]  = []

    # ── Fetch Payment ─────────────────────────────────────────────────────────
    if payment_id:
        for candidate in ["fetch_payment", "get_payment", "razorpay_fetch_payment"]:
            if candidate in available_tool_names:
                record = _invoke_tool(candidate, {"payment_id": payment_id},
                                      "Fetched payment details from Razorpay")
                tool_calls.append(record)
                if record["status"] == "SUCCESS" and record.get("data"):
                    d = record["data"]
                    payments.append({
                        "id":        d.get("id", payment_id),
                        "status":    d.get("status", "unknown"),
                        "amount":    d.get("amount", 0),
                        "currency":  d.get("currency", "INR"),
                        "method":    d.get("method", ""),
                        "order_id":  d.get("order_id", ""),
                        "captured":  d.get("captured", False),
                        "email":     d.get("email", ""),
                        "error_code":d.get("error_code", ""),
                    })
                break

        # Refunds linked to this payment
        for candidate in ["fetch_all_refunds_of_payment", "list_refunds"]:
            if candidate in available_tool_names:
                record = _invoke_tool(candidate, {"payment_id": payment_id},
                                      "Fetched refunds linked to this payment")
                tool_calls.append(record)
                if record["status"] == "SUCCESS" and record.get("data"):
                    for r in record["data"].get("items", []):
                        refunds.append({
                            "id":         r.get("id", ""),
                            "payment_id": r.get("payment_id", payment_id),
                            "amount":     r.get("amount", 0),
                            "currency":   r.get("currency", "INR"),
                            "status":     r.get("status", "unknown"),
                        })
                break

    # ── Fetch Order ───────────────────────────────────────────────────────────
    if order_id:
        for candidate in ["fetch_order", "get_order", "razorpay_fetch_order"]:
            if candidate in available_tool_names:
                record = _invoke_tool(candidate, {"order_id": order_id},
                                      "Fetched order details from Razorpay")
                tool_calls.append(record)
                if record["status"] == "SUCCESS" and record.get("data"):
                    d = record["data"]
                    orders.append({
                        "id":       d.get("id", order_id),
                        "status":   d.get("status", "unknown"),
                        "amount":   d.get("amount", 0),
                        "currency": d.get("currency", "INR"),
                        "receipt":  d.get("receipt", ""),
                        "attempts": d.get("attempts", 0),
                    })
                break

        for candidate in ["fetch_order_payments", "get_order_payments"]:
            if candidate in available_tool_names:
                record = _invoke_tool(candidate, {"order_id": order_id},
                                      "Fetched payments linked to this order")
                tool_calls.append(record)
                if record["status"] == "SUCCESS" and record.get("data"):
                    for p in record["data"].get("items", []):
                        payments.append({
                            "id":       p.get("id", ""),
                            "status":   p.get("status", "unknown"),
                            "amount":   p.get("amount", 0),
                            "currency": p.get("currency", "INR"),
                            "captured": p.get("captured", False),
                        })
                break

    # ── Fetch Refund record ───────────────────────────────────────────────────
    if refund_id:
        for candidate in ["fetch_refund", "get_refund", "razorpay_fetch_refund"]:
            if candidate in available_tool_names:
                record = _invoke_tool(candidate, {"refund_id": refund_id},
                                      "Fetched refund record from Razorpay")
                tool_calls.append(record)
                if record["status"] == "SUCCESS" and record.get("data"):
                    d = record["data"]
                    refunds.append({
                        "id":              d.get("id", refund_id),
                        "payment_id":      d.get("payment_id", ""),
                        "amount":          d.get("amount", 0),
                        "currency":        d.get("currency", "INR"),
                        "status":          d.get("status", "unknown"),
                        "speed_processed": d.get("speed_processed", ""),
                    })
                break

    # ── Build summary ─────────────────────────────────────────────────────────
    failed_payments  = [p for p in payments if p.get("status") in ("failed", "error")]
    total_refunded   = sum(r.get("amount", 0) for r in refunds) / 100   # paise → ₹
    any_success      = any(c["status"] == "SUCCESS" for c in tool_calls)

    return {
        "available": any_success,
        "payments":  payments,
        "orders":    orders,
        "refunds":   refunds,
        "summary": {
            "paymentCount":       len(payments),
            "refundCount":        len(refunds),
            "failedPaymentCount": len(failed_payments),
            "refundedAmount":     total_refunded,
        },
        "toolCalls": [
            {
                "server":  c["server"],
                "tool":    c["tool"],
                "status":  c["status"],
                "purpose": c["purpose"],
            }
            for c in tool_calls
        ],
        "source": "Official Razorpay MCP",
        "mode":   _detect_mode(),
    }
