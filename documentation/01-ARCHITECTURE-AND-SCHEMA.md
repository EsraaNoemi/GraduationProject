# 01 — Architecture & Unified Database Schema (`v1` + `v2`)

> **Mandatory Agent Rule:** Whenever any entity, TypeScript interface, mock dataset, API endpoint, or agent tool schema is added or modified, you MUST update this document and `documentation/INDEX.md` before completing your turn.

---

## 1. Project Scope & Architectural Boundaries

### Core Engineering Principle
**Probabilistic Reasoning vs. Deterministic Execution:**
- The **Hosted LLM API** interprets natural-language employee requests, plans bounded workflow steps, and selects permitted backend tools. It is **never** the source of truth for inventory balances, order feasibility calculations, permissions, or database writes.
- The **Application Backend (Spring Boot + PostgreSQL)**—and in the frontend MVP simulation, the **Deterministic Domain Service Layer**—enforces all role permissions, stock calculations, cumulative shortage allocations, draft validations, and Human-in-the-Loop (HITL) approval gates.

### Strict Scope Boundaries
| Included in Scope (MVP & v2 Target) | Explicitly Excluded from Scope |
| :--- | :--- |
| Multi-location inventory (`BRANCH` & `WAREHOUSE`) from `ERD-v1.dbml` | Point-of-Sale (POS) cashier registers or receipt printing |
| Product catalog, categories, units, and reorder thresholds | Complex accounting, general ledger, P&L statements, or tax filing |
| Customer/Internal Orders (`orders`, `order_items`) & cumulative stock feasibility | Automated real-world supplier payment processing or credit card billing |
| Inter-location Stock Transfers (`stock_transfers`, `stock_transfer_items`) & ledger (`stock_movements`) | Unrestricted autonomous database writes by the LLM |
| Bounded AI Agent loop (`MAX_STEPS = 5`) with 5 safe read/draft tools | Public-facing customer support chatbot |
| Deterministic Human-in-the-Loop Approval Queue (`submit_approved_change` via UI action only) | Training or fine-tuning a foundation model from scratch |
| Role-Based Access Control (`EMPLOYEE` vs. `MANAGER`) and full Audit Trail (`audit_logs`) | Multi-tenant SaaS billing or third-party ERP connectors |

---

## 2. Unified Domain Model (`ERD-v1.dbml` + `v2` Agent & Order Extensions)

The system unifies the multi-location inventory foundation from [documentation/reference/ERD-v1.dbml.txt](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/reference/ERD-v1.dbml.txt) with the order fulfillment, reorder drafting, bounded AI orchestration, and audit entities required by the [Graduation Project I Supervision Proposal](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/reference/media_1794591368683_c1fd26a5.pdf).

### 2.1 Enumerations

```ts
export type LocationType = 'BRANCH' | 'WAREHOUSE';

export type TransferStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type UserRole = 'EMPLOYEE' | 'MANAGER';

export type OrderStatus =
  | 'PENDING'
  | 'READY_TO_FULFILL'
  | 'PARTIAL_SHORTAGE'
  | 'BLOCKED_SHORTAGE'
  | 'APPROVED_FOR_FULFILLMENT'
  | 'FULFILLED'
  | 'CANCELLED';

export type FeasibilityStatus = 'FULL' | 'PARTIAL' | 'UNAVAILABLE';

export type DraftType =
  | 'REORDER_DRAFT'
  | 'ORDER_FULFILLMENT_APPROVAL'
  | 'STOCK_TRANSFER_DRAFT';

export type DraftStatus =
  | 'DRAFT'
  | 'VERIFIED_PENDING_APPROVAL'
  | 'APPROVED_COMMITTED'
  | 'REJECTED'
  | 'STALE_CONFLICT';

export type AgentRunStatus =
  | 'RUNNING'
  | 'AWAITING_CLARIFICATION'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED';
```

---

### 2.2 Core Inventory & Multi-Location Entities (`ERD-v1.dbml` Baseline)

1. **`branches`**
   - `id`: `number` (PK)
   - `name`: `string` (not null, max 150)
   - `address`: `string` (max 255)
   - `created_at`: `string` (ISO timestamp)

2. **`warehouses`**
   - `id`: `number` (PK)
   - `name`: `string` (not null, max 150)
   - `address`: `string` (max 255)
   - `created_at`: `string` (ISO timestamp)

3. **`inventory_locations`**
   - `id`: `number` (PK)
   - `code`: `string` (e.g., `"LOC-1"`, `"LOC-2"`, `"LOC-3"`)
   - `name`: `string` (not null, max 150 — e.g., `"Amman Main Warehouse"`, `"Abdali Retail Branch"`, `"Irbid Distribution Hub"`)
   - `location_type`: `LocationType` (`BRANCH` | `WAREHOUSE`)
   - `branch_id`: `number | null` (Unique FK $\rightarrow$ `branches.id`)
   - `warehouse_id`: `number | null` (Unique FK $\rightarrow$ `warehouses.id`)

4. **`categories`**
   - `id`: `number` (PK)
   - `name`: `string` (not null, unique — e.g., `"Networking & Cables"`, `"Office Peripherals"`, `"Thermal & Print Supplies"`, `"Storage & Media"`, `"Packaging & Dispatch"`)

5. **`products`**
   - `id`: `number` (PK)
   - `category_id`: `number` (FK $\rightarrow$ `categories.id`)
   - `sku`: `string` (not null, unique — e.g., `"NET-CAT6-10M"`)
   - `name`: `string` (not null, max 200)
   - `description`: `string`
   - `unit`: `string` (max 30 — e.g., `"pcs"`, `"box"`, `"roll"`, `"pack"`)
   - `reorder_threshold`: `number` (*v2 operational extension*: minimum safety stock level across primary fulfillment locations)
   - `default_reorder_qty`: `number` (*v2 operational extension*: standard supplier lot size)
   - `unit_cost_jod`: `number` (*v2 operational extension*: reference unit cost in JOD for reorder draft valuation)
   - `supplier_name`: `string` (*v2 operational extension*: primary supplier reference)
   - `created_at`: `string` (ISO timestamp)

6. **`inventory_balances`**
   - Composite PK: `(location_id, product_id)`
   - `location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
   - `product_id`: `number` (FK $\rightarrow$ `products.id`)
   - `quantity`: `number` (`decimal(14,3)` — physical stock on hand)
   - `reserved_quantity`: `number` (*v2 concurrency extension*: stock allocated to approved orders or in-flight transfers; `available_quantity = quantity - reserved_quantity`)
   - `version`: `number` (*v2 optimistic locking extension*: incremented on every write to detect TOCTOU conflicts before approval commit)
   - `updated_at`: `string` (ISO timestamp)

7. **`stock_transfers` & `stock_transfer_items`**
   - `stock_transfers`:
     - `id`: `number` (PK)
     - `transfer_number`: `string` (e.g., `"TRF-2026-0041"`)
     - `source_location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
     - `destination_location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
     - `status`: `TransferStatus` (`DRAFT` | `APPROVED` | `IN_TRANSIT` | `COMPLETED` | `CANCELLED`)
     - `transfer_date`: `string`
     - `notes`: `string`
     - `created_by_user_id`: `number`
     - `approved_by_user_id`: `number | null`
     - `created_at`: `string`
     - `completed_at`: `string | null`
   - `stock_transfer_items`:
     - `id`: `number` (PK)
     - `transfer_id`: `number` (FK $\rightarrow$ `stock_transfers.id`)
     - `product_id`: `number` (FK $\rightarrow$ `products.id`)
     - `quantity`: `number` (`decimal(14,3)`)

8. **`stock_movements`** (Immutable Inventory Ledger)
   - `id`: `number` (PK)
   - `location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
   - `product_id`: `number` (FK $\rightarrow$ `products.id`)
   - `movement_type`: `MovementType` (`IN` | `OUT` | `ADJUSTMENT`)
   - `quantity`: `number` (`decimal(14,3)`)
   - `reference_type`: `string` (`"ORDER_FULFILLMENT"` | `"STOCK_TRANSFER"` | `"REORDER_RECEIPT"` | `"MANUAL_ADJUSTMENT"`)
   - `reference_id`: `number`
   - `created_at`: `string`

---

### 2.3 `v2` Operational, Order, Draft & Agent Entities

9. **`users`** (Role-Based Access Control)
   - `id`: `number` (PK)
   - `full_name`: `string` (e.g., `"Esraa Al Noaiami"` — Operations Manager; `"Tariq Haddad"` — Store Inventory Associate)
   - `email`: `string`
   - `role`: `UserRole` (`EMPLOYEE` can inspect orders, run the AI assistant, and prepare drafts; `MANAGER` can additionally approve/reject sensitive writes and commit changes)
   - `assigned_location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)

10. **`orders` & `order_items`**
    - `orders`:
      - `id`: `number` (PK)
      - `order_number`: `string` (unique — e.g., `"ORD-2026-1041"`)
      - `customer_name`: `string`
      - `fulfillment_location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
      - `status`: `OrderStatus`
      - `priority`: `'HIGH' | 'NORMAL' | 'LOW'`
      - `requested_delivery_date`: `string`
      - `notes`: `string`
      - `version`: `number` (optimistic lock version)
      - `created_at`: `string`
    - `order_items`:
      - `id`: `number` (PK)
      - `order_id`: `number` (FK $\rightarrow$ `orders.id`)
      - `product_id`: `number` (FK $\rightarrow$ `products.id`)
      - `requested_quantity`: `number` (`decimal(14,3)`)
      - `allocated_quantity`: `number` (computed during cumulative feasibility check)
      - `shortage_quantity`: `number` (computed during cumulative feasibility check)

11. **`reorder_drafts` & `reorder_draft_items`** (Human-in-the-Loop Staging Area)
    - `reorder_drafts`:
      - `id`: `number` (PK)
      - `draft_code`: `string` (e.g., `"DRF-2026-089"`)
      - `draft_type`: `DraftType` (`REORDER_DRAFT` | `ORDER_FULFILLMENT_APPROVAL` | `STOCK_TRANSFER_DRAFT`)
      - `title`: `string`
      - `target_location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
      - `source_location_id`: `number | null` (optional FK $\rightarrow$ `inventory_locations.id` for `STOCK_TRANSFER_DRAFT`)
      - `related_order_ids`: `number[]` (optional linked order IDs)
      - `status`: `DraftStatus` (`DRAFT` | `VERIFIED_PENDING_APPROVAL` | `APPROVED_COMMITTED` | `REJECTED` | `STALE_CONFLICT`)
      - `created_by_agent_run_id`: `number | null` (FK $\rightarrow$ `agent_runs.id`)
      - `created_by_user_id`: `number` (FK $\rightarrow$ `users.id`)
      - `reviewed_by_user_id`: `number | null` (FK $\rightarrow$ `users.id`)
      - `verification_passed`: `boolean`
      - `verification_warnings`: `string[]`
      - `rationale`: `string`
      - `created_at`: `string`
      - `reviewed_at`: `string | null`
    - `reorder_draft_items`:
      - `id`: `number` (PK)
      - `draft_id`: `number` (FK $\rightarrow$ `reorder_drafts.id`)
      - `product_id`: `number` (FK $\rightarrow$ `products.id`)
      - `location_id`: `number` (FK $\rightarrow$ `inventory_locations.id`)
      - `current_available_qty`: `number` (snapshot at draft creation)
      - `expected_inventory_version`: `number` (snapshot of `inventory_balances.version` to detect TOCTOU drift)
      - `shortage_qty`: `number`
      - `suggested_reorder_qty`: `number` (editable by human reviewer before approval)
      - `supplier_name`: `string`

12. **`agent_runs` & `agent_steps`** (Bounded Agent Execution Trace)
    - `agent_runs`:
      - `id`: `number` (PK)
      - `run_code`: `string` (e.g., `"RUN-2026-0312"`)
      - `user_id`: `number` (FK $\rightarrow$ `users.id`)
      - `user_prompt`: `string`
      - `status`: `AgentRunStatus`
      - `step_count`: `number` (bounded by `MAX_STEPS = 5`)
      - `max_steps`: `number` (default `5`)
      - `generated_draft_id`: `number | null` (FK $\rightarrow$ `reorder_drafts.id`)
      - `clarification_question`: `string | null`
      - `final_summary`: `string`
      - `total_latency_ms`: `number`
      - `created_at`: `string`
    - `agent_steps`:
      - `id`: `number` (PK)
      - `run_id`: `number` (FK $\rightarrow$ `agent_runs.id`)
      - `step_number`: `number` (`1..5`)
      - `stage_label`: `'INTERPRET_REQUEST' | 'RETRIEVE_DATA' | 'ASSESS_FEASIBILITY' | 'PREPARE_DRAFT' | 'VERIFY_AND_REPORT'`
      - `tool_name`: `'list_pending_orders' | 'get_inventory_status' | 'check_order_feasibility' | 'prepare_reorder_draft' | 'verify_draft' | null`
      - `tool_input_json`: `string`
      - `tool_output_summary`: `string`
      - `verification_status`: `'VERIFIED' | 'WARNING' | 'ERROR'`
      - `latency_ms`: `number`
      - `timestamp`: `string`

13. **`audit_logs`** (Immutable Compliance & Security Trail)
    - `id`: `number` (PK)
    - `timestamp`: `string`
    - `actor_user_id`: `number` (FK $\rightarrow$ `users.id`)
    - `actor_role`: `UserRole`
    - `action_category`: `'AGENT_TOOL_CALL' | 'DRAFT_CREATED' | 'DRAFT_EDITED' | 'APPROVAL_COMMITTED' | 'APPROVAL_REJECTED' | 'CONFLICT_BLOCKED' | 'STOCK_TRANSFER'`
    - `action_name`: `string` (e.g., `"submit_approved_change"`, `"prepare_reorder_draft"`)
    - `entity_type`: `string`
    - `entity_id`: `string`
    - `details`: `string`

---

## 3. Bounded Agent Loop & Tool Contract Specification

### 3.1 The 5 LLM-Callable Tools vs. The 1 Human-Gated Commit Action

| Tool / Action | Callable By | Purpose & Deterministic Backend Controls |
| :--- | :--- | :--- |
| `list_pending_orders` | **AI Agent** (Read-Only) | Retrieves pending/shortage orders filtered by date range, location, or priority. Never mutates state. |
| `get_inventory_status` | **AI Agent** (Read-Only) | Queries `inventory_balances` across branches and warehouses by `product_ids` or fuzzy `search_query`. Detects ambiguous product names and returns candidates if multiple SKUs match. |
| `check_order_feasibility` | **AI Agent** (Read-Only Calculation) | Evaluates a batch of orders sequentially (by priority & timestamp) against live `available_quantity` (`quantity - reserved_quantity`). Computes **cumulative shortages** when multiple orders compete for the same SKU. |
| `prepare_reorder_draft` | **AI Agent** (Staging Write Only) | Creates a `reorder_drafts` record with status `DRAFT` and snapshots `expected_inventory_version`. Does **not** place a real supplier order or mutate `inventory_balances`. |
| `verify_draft` | **AI Agent & Backend Gate** | Deterministically checks product IDs, positive quantities, reorder thresholds, and `expected_inventory_version` consistency before transitioning the draft to `VERIFIED_PENDING_APPROVAL`. |
| `submit_approved_change` | **Human `MANAGER` Only** (REST / UI Action) | **NEVER exposed in the LLM tool schema.** Triggered exclusively when an authenticated `MANAGER` clicks **"Approve & Commit"** in the UI. Re-verifies optimistic lock versions (`version`), commits state changes, records `stock_movements`, and writes an immutable `audit_logs` entry. |

### 3.2 Cumulative Feasibility Algorithm (Deterministic Backend Logic)
When evaluating orders $O_1, O_2, \dots, O_n$ at location $L$:
1. Load current available balance for each required product $P$: $\text{Avail}(P, L) = \text{quantity} - \text{reserved\_quantity}$.
2. Sort orders by priority (`HIGH` $\rightarrow$ `NORMAL` $\rightarrow$ `LOW`) and `created_at` (FIFO).
3. For each order item $(O_i, P, \text{req\_qty})$:
   - $\text{alloc\_qty} = \min(\text{req\_qty}, \text{Avail}(P, L))$
   - $\text{shortage\_qty} = \text{req\_qty} - \text{alloc\_qty}$
   - $\text{Avail}(P, L) \leftarrow \text{Avail}(P, L) - \text{alloc\_qty}$
4. Classify each order:
   - `FULL`: All items have $\text{shortage\_qty} = 0$.
   - `PARTIAL`: At least one item has $\text{shortage\_qty} > 0$, and at least one item has $\text{alloc\_qty} > 0$.
   - `UNAVAILABLE`: All items have $\text{alloc\_qty} = 0$.
5. Compute recommended replenishment quantity per shorted SKU:
   $$\text{Suggested Reorder}(P) = \max\left(\text{Total Shortage}(P) + \text{reorder\_threshold}(P) - \text{Avail}(P, L),\ \text{default\_reorder\_qty}(P)\right)$$
   *(Also check if another warehouse in `inventory_locations` has surplus stock that could fulfill the shortage via an internal `STOCK_TRANSFER_DRAFT`!)*
6. Expose full line-item telemetry (`OrderItemFeasibilityDetail`) including `physicalOnHandQty`, `reservedQty`, `startingAvailableQty`, `priorAllocatedByQueueQty` (cumulative queue draw), `availableBeforeOrder`, `allocatedQty`, `shortageQty`, `inventoryVersion`, and `surplusLocations`.

### 3.3 Bounded Agent Orchestration & Snapshot Refresh (`src/services/operationsEngine.ts`)
- **`executeBoundedAgentRun(state, input)`:** Sequences the 5 bounded stages (`INTERPRET_REQUEST` $\rightarrow$ `RETRIEVE_DATA` $\rightarrow$ `ASSESS_FEASIBILITY` $\rightarrow$ `PREPARE_DRAFT` $\rightarrow$ `VERIFY_AND_REPORT`, `MAX_STEPS = 5`). Halts cleanly at Step 2 (`AWAITING_CLARIFICATION`) when `getInventoryStatus` triggers `AMBIGUOUS_MATCH` or when a single-SKU draft omits quantity; resumes with all 5 steps once clarified (`selectedProductId` / `overrideQuantity`), staging either a `REORDER_DRAFT` or internal `STOCK_TRANSFER_DRAFT` and running `verifyDraft`.
- **`refreshDraftVersionSnapshots(state, draftId, actorUserId)`:** Resynchronizes `expected_inventory_version` and `current_available_qty` on draft items against live `inventory_balances`, writes an immutable `DRAFT_EDITED` (`refresh_draft_snapshot`) audit entry, and re-runs `verifyDraft` to resolve `STALE_CONFLICT` locks safely before Manager approval.
