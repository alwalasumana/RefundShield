# RefundShield — Enterprise Coordinated Refund Abuse Prevention Platform

RefundShield is an advanced risk mitigation and fraud prevention platform that detects, visualizes, and blocks coordinated refund abuse and chargeback fraud at the payment gateway layer. 

Rather than evaluating transactions in isolation, RefundShield constructs dynamic customer relationship graphs to identify coordinated fraud rings, enforces adaptive risk policies, and compiles automated evidentiary packages to defend merchants against payment disputes.

---

## 🌟 Core Philosophy

```
DETECT ──► CONNECT ──► INVESTIGATE ──► EXPLAIN ──► DECIDE
```

Most legacy fraud tools calculate simple single-customer transaction risk. RefundShield uncovers **hidden network connections** (shared hardware fingerprints, shared delivery addresses, serial SKU claims, velocity spikes, multi-hop user webs) and deploys a **LangGraph Multi-Agent Workflow** to ground evidence, construct event timelines, and recommend `VERIFY`, `REVIEW`, or `BLOCK` actions.

---

## 🚀 Key Modules & Features

### 🛡️ Adaptive Risk Policy Engine (NLP Compiler)
*   **Intent-Based Rules**: Compliance teams configure gateway risk thresholds in plain natural language (e.g. *"Block card transactions where risk exceeds 75, and auto-approve refunds under 30"*).
*   **Instant Compilation**: The AI compiler parses natural language instructions, compiles them into structured JSON rules, and dynamically scales payment gateway guardrails in real-time.

### 🕸️ Graph-Based Linkage Detection (React Flow)
*   **Transitive Connection Tracking**: Crawls transaction logs to link seemingly separate customer accounts that share device fingerprints (`Canvas hashes`), IP networks, or physical drop locations.
*   **Interactive Topology Map**: Renders real-time node relationship graphs using React Flow, allowing risk investigators to audit fraud ring structures.

### 💳 Real-time Payment Interception (Sandbox)
*   **Gateway Middleware**: A simulated checkout gateway widget running Credit Card and UPI payment flows.
*   **Dynamic Enforcement**: Evaluates active rule thresholds against real-time database risk scores, automatically declining transactions for suspended accounts or high-risk clusters.

### 📄 Automated Dispute Evidence Generator
*   **Evidentiary PDF Packages**: Generates formal, certified PDF reports containing network connections, shared device profiles, and order history trails.
*   **Chargeback Defense**: Provides merchants with bank-ready evidence to submit to acquiring networks (Visa, Mastercard), proving card-not-present fraud to win disputes.

---

## 🏗️ System Architecture & Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, `@xyflow/react` (React Flow), Recharts (Risk Analytics), Lucide Icons.
- **Backend API**: Node.js, Express.js, MongoDB (Mongoose Schema & Indexing), JWT Authentication.
- **AI Agent Service**: Python, FastAPI, LangGraph, Gemini 1.5 Flash (with deterministic rule-engine fallback).

```
React Web Client
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

Detailed system layout and component definitions can be reviewed in the [RefundShield System Architecture Document](architecture.md).

---

## 📁 Repository Structure

```
/client                  # React Frontend Application
  /src
    /components          # Navbar, Sidebar, RiskBadge, ActionBadge, RelationshipGraph, AIStepper, Timeline, EvidenceList
    /context             # AuthContext
    /pages               # Login, Dashboard, Cases, CaseDetail, Customers, Refunds, Sandbox
/server                  # Express API Server
  /src
    /controllers         # auth, customer, order, refund, case, graph, dashboard, sandbox, guardrail controllers
    /middleware          # JWT authentication
    /models              # Customer, Device, Address, Product, Order, Refund, InvestigationCase, User
    /routes              # REST route definitions
    /services            # Deterministic detection engine
/ai-agent                # Python FastAPI LangGraph AI Service
  /agents                # detection_agent.py, investigation_agent.py, decision_agent.py
  /graph                 # state.py (TypedDict), refund_investigation_graph.py
  /tools                 # customer, refund, order, relationship, product database tools
  /services              # db_client.py, llm_factory.py
/database
  seed.py                # PyMongo synthetic dataset seeder
/tests
  eval_synthetic_detection.py  # Precision, Recall, FPR evaluation suite
```


## ⚡ Setup & Installation

### 1. Pre-requisites
Ensure MongoDB is running locally (`mongodb://localhost:27017`) or configure the `MONGODB_URI` environment variable.

Copy the environment template:
```bash
cp .env.example .env
```

### 2. Database Seeding & Backend Server
```bash
cd server
npm install
npm run seed     # Generates 5,000+ customers, orders, refunds & active fraud rings
npm run dev      # Starts Express API on http://localhost:5000
```

### 3. Python LangGraph Service
```bash
cd ai-agent
pip install -r requirements.txt
python main.py   # Starts FastAPI AI service on http://localhost:8000
```

### 4. React Frontend Client
```bash
cd client
npm install
npm run dev      # Starts React Vite SPA on http://localhost:3000
```

---

## 🧪 Model Evaluation & Benchmarks

Run the automated Precision, Recall, and False Positive Rate benchmark to evaluate model performance on synthetic fraud datasets:
```bash
python tests/eval_synthetic_detection.py
```

Target evaluation thresholds:
- **Precision**: $\ge 80\%$
- **Recall**: $\ge 80\%$

---

## 🎯 Operational Demo Walkthrough

1. **Access Portal**: Open `http://localhost:3000/login` and sign in (`admin` / `admin123`).
2. **Configure Policy**: On the **Dashboard**, scroll to the **AI Compiler**, type *"Block above 70 and auto-refund below 25"*, click **Compile**, and watch the sliders and map sync live.
3. **Investigate Network**: Go to **Suspicious Cases**, open **Gaurav Pillai**'s case, and explore the **React Flow Relationship Graph** showing device sharing links.
4. **Run AI Agent**: Click **"Investigate with AI"** to trigger the 3-Node LangGraph workflow, view the reasoning trace, and click **"Confirm Coordinated Abuse"** (suspending him in the database).
5. **Test Sandbox Checkout**: Go to the **Checkout Simulator** in the sidebar, select **Gaurav Pillai**, click Pay, and verify the simulator declines the card with a RefundShield alert.
6. **Generate Dispute PDF**: Go back to Gaurav's case, click **"Generate Dispute Defense Package"**, and view the printable evidence report for card dispute win.
