# 03 — Frontend Implementation Roadmap (Atomic 5-Phase Plan for Hydrogen)

> **Mandatory Agent Rule:** Execute these 5 phases in order. At the completion of each phase, verify TypeScript compilation (`npm run build`), run the `react-doctor` audit where applicable, and update `documentation/03-FRONTEND-ROADMAP.md`, `documentation/04-SESSION-HANDOFF-LOG.md`, and `documentation/INDEX.md` before finishing your turn.

---

## Overview of Execution Strategy
This roadmap guides **Hydrogen** (and subsequent coding sessions) from a clean **React 18/19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts** setup to a complete, interactive, evaluation-ready prototype of the **AI Operations Agent** aligned with both `ERD-v1.dbml` and the Graduation Project I Supervision Proposal.

---

## Phase 1: Project Scaffolding, Unified Domain Types & Deterministic Seed Data
**Status:** `COMPLETED` (Verified by **Hydrogen**)

### Deliverables:
1. **Initialize React + TypeScript + Vite Workspace:**
   - Scaffold Vite React-TS app in the project root (preserving `.agents/`, `documentation/`, `ERD-v1.dbml.txt`, and the proposal PDF).
   - Install core dependencies: `tailwindcss`, `@tailwindcss/vite` (or PostCSS setup), `lucide-react`, `recharts`, `clsx`, `tailwind-merge`.
2. **Strict TypeScript Domain Model (`src/types/domain.ts`):**
   - Implement all 13 entities and enums defined in `documentation/01-ARCHITECTURE-AND-SCHEMA.md`:
     - `Branch`, `Warehouse`, `InventoryLocation`, `Category`, `Product`, `InventoryBalance`, `StockTransfer`, `StockTransferItem`, `StockMovement` (`ERD-v1.dbml` entities)
     - `User`, `Order`, `OrderItem`, `ReorderDraft`, `ReorderDraftItem`, `AgentRun`, `AgentStep`, `AuditLog` (`v2` operational & agent entities)
3. **Realistic Multi-Location Seed Data (`src/data/seedData.ts`):**
   - **Locations (3):**
     - `LOC-1`: *Amman Main Warehouse* (`WAREHOUSE`)
     - `LOC-2`: *Abdali Retail Branch* (`BRANCH`)
     - `LOC-3`: *Irbid Distribution Hub* (`BRANCH`)
   - **Categories (5) & Products (16 realistic SKUs):**
     - Include intentionally ambiguous/similarly named items (e.g., `"Thermal Receipt Paper 80mm x 80mm"` vs. `"Thermal Barcode Label Roll 80mm x 50mm"`, and `"Cat6 UTP Patch Cable 5m"` vs. `"Cat6 SFTP Shielded Cable 5m"`) to test the Section 7 ambiguity scenario.
   - **Orders (10 realistic orders across locations):**
     - Include orders that are 100% fulfillable (`FULL`), orders with single-item shortages (`PARTIAL`), orders with zero stock (`UNAVAILABLE`), and **multi-order cumulative contention** (e.g., two high-priority orders at *Abdali Retail Branch* both requesting `Logitech Wireless Barcode Scanner` where individual orders fit inside available stock, but combined demand exceeds available stock).
   - **Stock Transfers (4) & Stock Movements (12):**
     - Seed active and historical transfers between *Amman Main Warehouse* and branches.
   - **Pre-seeded Audit Logs & Initial Pending Reorder Draft:**
     - Provide immediate visual richness on initial load.
4. **Deterministic Backend Simulation Engine (`src/services/operationsEngine.ts`):**
   - Pure, unit-testable TypeScript functions implementing the 5 backend tools (`listPendingOrders`, `getInventoryStatus`, `checkOrderFeasibility`, `prepareReorderDraft`, `verifyDraft`) plus the human-only `submitApprovedChange` and `simulateConcurrentStockUpdate` (for TOCTOU conflict testing).

---

## Phase 2: Application Shell, RBAC Role Switcher & Executive Overview Dashboard
**Status:** `COMPLETED` (Verified by **Hydrogen**)

### Deliverables:
1. **Bespoke Enterprise App Shell (`src/components/layout/AppShell.tsx`):**
   - Left operational navigation sidebar (`Overview`, `Orders & Feasibility`, `Inventory & Locations`, `Stock Transfers`, `Approvals & Audit`).
   - Top bar featuring:
     - **Location Context Selector** (`All Locations` or specific branch/warehouse).
     - **Live RBAC Role Switcher** (`Tariq Haddad — EMPLOYEE` vs. `Esraa Al Noaiami — MANAGER`) with clear visual indicator of current permissions.
     - **TOCTOU Concurrency Trigger Button** (`Simulate Concurrent Stock Drift`) to test optimistic lock failure (`version` mismatch) before draft approval.
     - **Operations Assistant Drawer Toggle** with live badge count of `VERIFIED_PENDING_APPROVAL` drafts.
2. **Executive Operations Overview (`src/components/views/OverviewDashboard.tsx`):**
   - 4 high-signal KPI cards (`tabular-nums`): *Pending Orders & Feasibility Rate*, *SKUs Below Reorder Threshold*, *Pending Human Approvals*, *Active Inter-Location Transfers*.
   - **Recharts Visualizations** (isolated in memoized components with restrained slate/blue/emerald/amber/rose colors):
     - *Stock Health & Shortage Distribution by Location* (Stacked Bar Chart)
     - *Order Fulfillment Feasibility Breakdown* (Structured horizontal progress/bar breakdown)
   - Quick-action table of top shorted SKUs and recent deterministic audit events.

---

## Phase 3: Orders Queue & Cumulative Stock Feasibility Analyzer
**Status:** `COMPLETED` (Verified by **Hydrogen**)

### Deliverables:
1. **Orders & Cumulative Feasibility View (`src/components/views/OrdersFeasibilityView.tsx`):**
   - Filterable by location, priority (`HIGH`, `NORMAL`, `LOW`), and feasibility status (`FULL`, `PARTIAL`, `UNAVAILABLE`).
   - **Batch Feasibility Mode Toggle:** Shows side-by-side comparison of *Isolated Order Check* vs. *Cumulative FIFO/Priority Allocation* so the supervisor can clearly see how order #2 becomes `PARTIAL_SHORTAGE` after order #1 reserves available stock.
   - Expandable order detail rows showing line-by-line `requested_quantity`, `available_quantity`, `allocated_quantity`, `shortage_quantity`, and whether another location (e.g., *Amman Main Warehouse*) holds surplus stock to cover the branch shortage.
   - One-click button on any shorted order or batch: **"Send to Operations Assistant for Reorder / Transfer Draft"**.

---

## Phase 4: Multi-Location Inventory Matrix, Products & Stock Transfers (`ERD-v1.dbml`)
**Status:** `COMPLETED` (Verified by **Hydrogen**)

### Deliverables:
1. **Multi-Location Inventory & Product Catalog View (`src/components/views/InventoryLocationsView.tsx`):**
   - Full matrix showing `physical_qty`, `reserved_qty`, `available_qty`, `reorder_threshold`, and optimistic lock `version` (`v1`, `v2`, etc.) across *Amman Main Warehouse*, *Abdali Retail Branch*, and *Irbid Distribution Hub*.
   - Search by SKU/name, filter by category or stock status (`HEALTHY`, `LOW_STOCK`, `OUT_OF_STOCK`).
   - Inline manual stock adjustment / simulated concurrent checkout button on any row to demonstrate `inventory_balances.version` incrementing in real time.
2. **Stock Transfers & Movement Ledger View (`src/components/views/StockTransfersView.tsx`):**
   - Full implementation of `stock_transfers`, `stock_transfer_items`, and `stock_movements` from `ERD-v1.dbml`.
   - Ability to inspect `DRAFT`, `APPROVED`, `IN_TRANSIT`, and `COMPLETED` inter-location transfers and advance transfer state (gated by `MANAGER` role for approval).

---

## Phase 5: Bounded AI Operations Assistant Drawer, HITL Approval Queue & Evaluation Suite
**Status:** `COMPLETED` (Verified by **Hydrogen**)

### Deliverables:
1. **Operations Assistant Side Drawer (`src/components/assistant/OperationsAssistantDrawer.tsx`):**
   - Structured **Command Console** (zero chat-bubble slop; follows `02-UI-DESIGN-SYSTEM.md`).
   - **6 One-Click Evaluation Scenario Presets** (matching Proposal Section 7):
     1. *Scenario 1 (Standard Workflow):* `"Review today's pending orders, flag shortages, and prepare a supplier reorder draft."`
     2. *Scenario 2 (Cumulative Contention):* `"Check feasibility for all high-priority orders at Abdali Branch and calculate cumulative shortages."`
     3. *Scenario 3 (Ambiguous Product Clarification):* `"Check current stock and prepare a reorder draft for 50 units of thermal rolls."` (Triggers `AMBIGUOUS_MATCH` $\rightarrow$ `AWAITING_CLARIFICATION` with candidate SKUs).
     4. *Scenario 4 (Missing Quantity / Incomplete Request):* `"Prepare an urgent reorder draft for Cat6 UTP Patch Cable 5m."` (Agent detects missing quantity & asks whether to use `default_reorder_qty` or custom amount).
     5. *Scenario 5 (Multi-Location Transfer Optimization):* `"Check if Abdali Branch order shortages can be covered by Amman Main Warehouse stock."`
     6. *Scenario 6 (Stale Stock / TOCTOU Conflict Test):* Runs draft preparation, then lets the user trigger a concurrent stock change before clicking Approve to demonstrate deterministic `409 STALE_CONFLICT` rejection.
   - **Live 5-Stage Bounded Loop Visualizer:**
     - Streams steps `1/5` through `5/5` (`list_pending_orders` $\rightarrow$ `get_inventory_status` $\rightarrow$ `check_order_feasibility` $\rightarrow$ `prepare_reorder_draft` $\rightarrow$ `verify_draft`) with expandable JSON input/output inspection and step latency.
   - **Optional Live LLM API Key Support + Deterministic Local Orchestrator:**
     - Works 100% offline/out-of-the-box via the deterministic multi-step tool orchestrator, with an optional configuration modal to plug in a live Gemini / OpenAI / Anthropic API key for live function-calling demonstration.
2. **Human-in-the-Loop Approvals & Audit Trail View (`src/components/views/ApprovalsAuditView.tsx`):**
   - Dedicated view for reviewing `reorder_drafts`, editing `suggested_reorder_qty` before commit, inspecting `verify_draft` deterministic checks, and executing `submit_approved_change` (strictly locked when active role is `EMPLOYEE`, enabled when `MANAGER`).
   - Complete, filterable `audit_logs` table recording every tool call, draft edit, approval commit, rejection, and blocked TOCTOU conflict.
   - **Evaluation Metrics Summary Panel** (displaying Section 7 metrics: *Task Completion Rate*, *Inventory Correctness*, *Tool Sequence Validity*, *Approval Gate Compliance*, and *Mean Workflow Time vs. Manual Baseline*).
