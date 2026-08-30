# RefundShield — Coordinated Refund Abuse Investigation Platform

**Razorpay Hackathon — Track 2: Refund Abuse Investigation Agent**

RefundShield is an AI-powered refund abuse investigation platform that uncovers **COORDINATED refund abuse networks** rather than simply flagging individual customers.

---

## 🌟 Core Philosophy

```
DETECT ──► CONNECT ──► INVESTIGATE ──► EXPLAIN ──► DECIDE
```

Most fraud tools calculate simple single-customer refund scores. RefundShield uncovers **hidden connections** (shared hardware fingerprints, shared delivery addresses, serial SKU claims, velocity spikes, multi-hop user webs) and deploys a **LangGraph Multi-Agent Workflow** to ground evidence, construct event timelines, and recommend `VERIFY`, `REVIEW`, or `BLOCK` actions.

---

## 🏗️ Technology Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, `@xyflow/react` (React Flow relationship graphs), Recharts (risk analytics), Lucide Icons.
- **Backend API**: Node.js, Express.js, MongoDB (Mongoose schemas & indexing), JWT Authentication.
- **AI Agent Engine**: Python 3.10+, FastAPI, LangGraph, LangChain, OpenAI / Gemini (with deterministic rule-engine fallback).

```
React Dashboard (Vite)
       │
       ▼  HTTP / REST
Express Backend API (Port 5000)
       │
       ├─────────────────────┐
       ▼                     ▼
  MongoDB Database     Python FastAPI AI Service (Port 8000)
                             │
                             ▼
                    LangGraph Workflow
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     Detection Node   Investigation Node   Decision Node
```

---

## 📁 Folder Structure

```
/client                  # React 18 + Vite + Tailwind CSS Frontend
  /src
    /components          # Navbar, Sidebar, RiskBadge, ActionBadge, RelationshipGraph, AIStepper, Timeline, EvidenceList
    /context             # AuthContext
    /pages               # Login, Dashboard, Cases, CaseDetail, Customers, Refunds
    /services            # Axios API client
/server                  # Express REST API Server
  /src
    /controllers         # auth, customer, order, refund, case, graph, dashboard, ai controllers
    /middleware          # JWT authentication
    /models              # Customer, Device, Address, Product, Order, Refund, InvestigationCase, User
    /routes              # REST route definitions
    /services            # Deterministic detection engine
    index.js             # Server entry point
    seed.js              # Synthetic dataset generator
/ai-agent                # Python FastAPI LangGraph AI Service
  /agents                # detection_agent.py (Node 1), investigation_agent.py (Node 2), decision_agent.py (Node 3)
  /graph                 # state.py (TypedDict), refund_investigation_graph.py (StateGraph)
  /tools                 # customer_tools, refund_tools, order_tools, relationship_tools, product_tools
  /services              # db_client.py, llm_factory.py
  main.py                # FastAPI entry point
/database
  seed.py                # PyMongo synthetic dataset seeder
/tests
  eval_synthetic_detection.py  # Precision, Recall, FPR benchmark suite
```

---

## 📊 Synthetic Dataset & Planted Fraud Networks

The seeder generates:
- **5,000+ Customers**
- **10,000+ Orders**
- **3,000+ Refunds**
- **1,000+ Devices**
- **3,000+ Addresses**
- **500+ Products**

It plants **5 deliberate ground-truth coordinated refund rings**:
1. **Network 1 (Shared Device Ring)**: 5 customer accounts sharing 1 device (`DEV-RING-100`) abusing electronics refunds.
2. **Network 2 (Shared Address Ring)**: 6 sybil accounts sharing 1 address (`ADDR-RING-200`) claiming non-delivery.
3. **Network 3 (Serial SKU Ring)**: 4 customer accounts repeatedly claiming empty box returns on high-value SKUs.
4. **Network 4 (High-Velocity Ring)**: Rapid refund claims <24h after placement.
5. **Network 5 (Multi-Hop Ring)**: Accounts linked transitively via shared devices & addresses.

It also includes **legitimate control groups** (e.g. Family sharing 1 laptop & address with 0 refunds) to ensure zero false positives.

---

## ⚡ Quick Start Guide

### 1. Prerequisite Setup
Make sure MongoDB is running locally (`mongodb://localhost:27017`) or configure `MONGODB_URI` in `.env`.

Copy environment template:
```bash
cp .env.example .env
```

### 2. Backend Server Setup & Seeding
```bash
cd server
npm install
npm run seed     # Seeds 5,000+ customers, orders, refunds & planted networks
npm run dev      # Starts Express API on http://localhost:5000
```

### 3. Python AI Service Setup
```bash
cd ai-agent
pip install -r requirements.txt
python main.py   # Starts FastAPI AI service on http://localhost:8000
```

### 4. Frontend Setup
```bash
cd client
npm install
npm run dev      # Starts React Vite dashboard on http://localhost:3000
```

---

## 🧪 Benchmark & Evaluation Suite

Run the automated Precision, Recall, and False Positive Rate benchmark:
```bash
python tests/eval_synthetic_detection.py
```

Target benchmark outputs:
- **Precision**: $\ge 90\%$
- **Recall**: $\ge 90\%$
- **False Positive Rate**: $< 5\%$

---

## 🚀 Standout Security Features

### 1. GenAI Natural Language Guardrails Compiler
*   **Plain English Rules**: Merchants type rules directly into the dashboard prompt box (e.g. *"Block card checkout above 75, refund instantly below 30"*).
*   **Instant Compilation**: The backend parses the query and updates the database guardrails. The dashboard sliders and colored **Risk Zone Map** instantly slide and resize in real-time.

### 2. Live Payment Gateway Sandbox Interceptor
*   **Checkout Simulator**: Includes an interactive playground containing simulated Credit Card and UPI payment widgets.
*   **Dynamic Interception**: Directly queries the active compiled rules and MongoDB customer statuses. High-risk or suspended customers are immediately blocked from completing checkout.

### 3. AI Dispute Evidence PDF Generator
*   **Instant Evidentiary Packages**: One-click generation of printable letterhead reports containing database graph nodes, shared device serials, and transaction histories.
*   **Bank Submissions**: Merchants upload this PDF to credit card networks (Visa/Mastercard) during chargeback disputes, proving coordinated card-not-present fraud to win back lost cash.

---

## 🎯 Main Hackathon Demo Flow

1. **Access Portal**: Open `http://localhost:3000/login` and sign in (`admin` / `admin123`).
2. **Compile Policy**: On the **Dashboard**, scroll to the **AI Compiler**, type *"Block above 70 and auto-refund below 25"*, click **Compile**, and watch the sliders and map sync live.
3. **Investigate Network**: Go to **Suspicious Cases**, open **Gaurav Pillai**'s case, and explore the **React Flow Relationship Graph** showing device sharing links.
4. **Run AI Agent**: Click **"Investigate with AI"** to trigger the 3-Node LangGraph workflow, view the reasoning trace, and click **"Confirm Coordinated Abuse"** (suspending him in the database).
5. **Test Sandbox Checkout**: Go to the **Checkout Simulator** in the sidebar, select **Gaurav Pillai**, click Pay, and verify the simulator declines the card with a RefundShield alert.
6. **Generate Dispute PDF**: Go back to Gaurav's case, click **"Generate Dispute Defense Package"**, and view the printable evidence report for card dispute win.
