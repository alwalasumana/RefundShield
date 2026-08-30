// Initialize global guardrails configuration in memory if not already set
if (!global.guardrails) {
  global.guardrails = {
    autoRefundThreshold: 45,
    checkoutBlockThreshold: 80
  };
}

export async function getGuardrails(req, res) {
  try {
    res.json(global.guardrails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateGuardrails(req, res) {
  try {
    const { autoRefundThreshold, checkoutBlockThreshold } = req.body;

    if (autoRefundThreshold !== undefined) {
      global.guardrails.autoRefundThreshold = Number(autoRefundThreshold);
    }
    if (checkoutBlockThreshold !== undefined) {
      global.guardrails.checkoutBlockThreshold = Number(checkoutBlockThreshold);
    }

    res.json({
      success: true,
      message: 'RefundShield guardrails updated in server memory.',
      guardrails: global.guardrails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function compileGuardrails(req, res) {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const logs = [];
    logs.push(`[RefundShield AI Compiler v2.0] Analyzing natural language intent: "${prompt}"`);
    logs.push('[Compiler] Scanning for transaction risk thresholds...');

    let autoRefundThreshold = global.guardrails.autoRefundThreshold;
    let checkoutBlockThreshold = global.guardrails.checkoutBlockThreshold;

    // Search for block/checkout threshold
    // e.g. "block checkout if risk score is greater than 70" -> 70
    // e.g. "block cards above 65" -> 65
    const blockMatch = prompt.match(/(?:block|decline|intercept|restrict)\D*(\d+)/i);
    if (blockMatch) {
      const val = Number(blockMatch[1]);
      if (val >= 0 && val <= 100) {
        checkoutBlockThreshold = val;
        logs.push(`✔ Rule Detected: Set Checkout Block Limit to >= ${val}%`);
      }
    }

    // Search for refund threshold
    // e.g. "allow instant auto-refunds only if risk score is less than 30" -> 30
    // e.g. "refund below 25" -> 25
    const refundMatch = prompt.match(/(?:refund|auto-refund|approve|trust)\D*(\d+)/i);
    if (refundMatch) {
      const val = Number(refundMatch[1]);
      if (val >= 0 && val <= 100) {
        autoRefundThreshold = val;
        logs.push(`✔ Rule Detected: Set Instant Auto-Refund Limit to < ${val}%`);
      }
    }

    // Enforce logical constraints (autoRefund must be <= checkoutBlock)
    if (autoRefundThreshold > checkoutBlockThreshold) {
      logs.push(`[Warning] Auto-refund threshold (${autoRefundThreshold}%) exceeds checkout block threshold (${checkoutBlockThreshold}%). Automatically adjusting limits to avoid logic overlap.`);
      autoRefundThreshold = Math.min(autoRefundThreshold, checkoutBlockThreshold - 10);
      autoRefundThreshold = Math.max(0, autoRefundThreshold);
    }

    global.guardrails.autoRefundThreshold = autoRefundThreshold;
    global.guardrails.checkoutBlockThreshold = checkoutBlockThreshold;

    logs.push('[Compiler] Rules successfully compiled and injected into payment gateway interceptor.');
    
    res.json({
      success: true,
      guardrails: global.guardrails,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
