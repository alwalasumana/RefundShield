# 🔌 RefundShield Fraud Risk MCP Server

This directory contains a fully functional **Model Context Protocol (MCP)** server for RefundShield. 
It connects directly to the MongoDB instance and exposes tools that allow any MCP-compatible AI client (such as Claude Desktop, Cursor, or your enterprise LLM) to query relationship networks, retrieve risk statistics, and execute block decisions.

---

## 🛠️ Exposed Tools

1. **`get_risk_overview`**: Returns the general overview stats of the active queue (active cases, review counts, total transaction volume).
2. **`inspect_customer_network`**: Traces and returns device/address sharing links and account associations for a customer ID.
3. **`enforce_risk_decision`**: Directly suspends customer profiles and holds active refunds in MongoDB for a specified case.

---

## 🚀 Setup & Launch Instructions

### 1. Install Dependencies
Run this in your terminal inside the `mcp-server` directory:
```bash
cd mcp-server
npm install
```

### 2. Configure Claude Desktop Integration
To let Claude Desktop use this server to inspect your database, open your Claude config file:
- **Windows Path**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac Path**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following configuration (replace `YOUR_PROJECT_PATH` with the absolute path to your project, using forward slashes e.g. `C:/Users/.../project`):

```json
{
  "mcpServers": {
    "refundshield-risk-server": {
      "command": "node",
      "args": [
        "C:/YOUR_PROJECT_PATH/mcp-server/index.js"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop & Test Prompts
Restart your Claude Desktop app. You will see a small plug icon showing that the `refundshield-risk-server` tools are loaded!

Now, you can type prompts like these directly to Claude:

*   *"Give me an overview of the current RefundShield risk queue."*
*   *"Check if customer ID cust_NET3_003 is connected to other accounts."*
*   *"I want to block the customer cluster for CASE-cust_NET3_003 because of serial MacBook Pro returns. Do it now."*

Claude will automatically call the MongoDB tools under the hood, execute the action, and respond to you!
