# 02 — UI Design System & Anti-AI-Slop Guidelines

> **Mandatory Agent Rule:** Every UI screen, table, drawer, badge, and chart created or modified in this workspace MUST strictly comply with this design specification. Whenever UI components or design tokens are added or modified, update this file and `documentation/INDEX.md`.

---

## 1. Design Philosophy: Bespoke Enterprise Operations Tool
The **AI Operations Agent** is an internal operational workbench for store employees and operations managers reviewing orders, multi-location stock balances, inter-branch transfers, and replenishment drafts.

Its visual language draws inspiration from **Linear**, **Stripe Dashboard**, and **Swiss-grid logistics software**:
- High information density without clutter
- Crisp `1px` structural hairlines
- Scannable tabular typography (`tabular-nums`)
- Zero decorative noise—every pixel communicates operational state, stock quantities, verification evidence, or approval authority.

---

## 2. STRICT ANTI-AI-SLOP RULES (MANDATORY)

All coding agents (**Hydrogen** and subagents) are strictly forbidden from introducing generic "AI template" tropes:

1. **NO Purple / Indigo / Cyan / Neon Gradients:**
   - Never use `bg-gradient-to-r from-purple-* to-indigo-*`, glowing violet borders, or cosmic/neon backdrops anywhere in the app—including the AI Operations Assistant panel.
2. **NO Dark-Mode Neon Glassmorphism:**
   - Do not use translucent blurred dark cards (`backdrop-blur-xl bg-white/5`), glowing drop shadows, or sci-fi HUD aesthetics.
3. **NO Sparkle, Magic Wand, or Robot Icons:**
   - Never import or render `Sparkles`, `Wand`, `Wand2`, `Bot`, `BrainCircuit`, or floating magic stars from `lucide-react`. Use sober operational icons (`Terminal`, `CheckCircle2`, `AlertTriangle`, `ShieldCheck`, `ClipboardCheck`, `SlidersHorizontal`, `PackageCheck`, `ArrowRightLeft`, `FileSpreadsheet`).
4. **NO Consumer Chatbot Bubbles:**
   - The AI Assistant Side Drawer is an **Operations Command & Verification Panel**, not a WhatsApp/iMessage consumer chat widget. Do not render rounded speech bubbles with avatars or bouncy typing dots. Render structured **Command Inputs**, **5-Stage Execution Trace Cards**, **Feasibility Breakdown Tables**, and **Deterministic Approval Cards**.
5. **NO Over-Rounded Bubbly Containers:**
   - Avoid `rounded-2xl` or `rounded-3xl` cards with heavy shadows (`shadow-2xl`). Use sharp architectural radii (`rounded-md` / `6px` for controls and badges, `rounded-lg` / `8px` for panels and tables) and subtle `shadow-xs` (`0 1px 2px rgba(15, 23, 42, 0.04)`).

---

## 3. Multi-Theme Color System & Semantic Tokens (`src/index.css` + `src/hooks/useTheme.ts`)

All surfaces, borders, text inks, semantic status pills, and `Recharts` chart variables are driven by CSS custom properties on `:root` and `[data-theme="..."]` mapped into Tailwind v4 via `@theme inline` (`bg-canvas`, `bg-surface`, `bg-subtle`, `border-hairline`, `border-hairline-strong`, `text-ink`, `text-ink-secondary`, `text-ink-muted`, `bg-accent`, `bg-accent-subtle`, `border-accent-border`, `text-accent-ink`), persisted in `localStorage` (`ops-agent-theme`) and switchable live from [`ThemeSwitcher.tsx`](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/src/components/layout/ThemeSwitcher.tsx).

| Theme ID | Display Name | Canvas | Surface | Subtle / Hover | Hairline Border | Primary Ink | Secondary Ink | Primary Accent |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `daylight` *(Default)* | **Crisp Daylight** | `#F8FAFC` | `#FFFFFF` | `#F1F5F9` | `#E2E8F0` | `#0F172A` | `#475569` | `#1D4ED8` |
| `paper` | **Warm Paper** | `#FAF9F6` | `#FFFFFF` | `#F3F1EC` | `#E5E2DC` | `#1C1917` | `#57534E` | `#0F766E` |
| `obsidian` | **Obsidian Ops** *(Dark)* | `#0B0F19` | `#111827` | `#1E293B` | `#1F2937` | `#F8FAFC` | `#94A3B8` | `#3B82F6` |
| `nordic` | **Nordic Slate** *(Dim Dark)* | `#131722` | `#1A202C` | `#252D3D` | `#2D3748` | `#E2E8F0` | `#94A3B8` | `#0284C7` |

### Semantic Operational Status & Recharts Tokens

| Operational State | Light Themes (`daylight` / `paper`) | Dark Themes (`obsidian` / `nordic`) | Use Cases |
| :--- | :--- | :--- | :--- |
| **Ready / Feasible / Approved** (`emerald`) | `#ECFDF5` / `#A7F3D0` / `#047857` | `rgba(16,185,129,0.14)` / `rgba(16,185,129,0.36)` / `#34D399` | `FULL` order feasibility, healthy stock, `VERIFIED`, `APPROVED_COMMITTED` |
| **Partial / Low Stock / Pending Review** (`amber`) | `#FFFBEB` / `#FDE68A` / `#B45309` | `rgba(245,158,11,0.14)` / `rgba(245,158,11,0.36)` / `#FBBF24` | `PARTIAL` shortage, low stock, `VERIFIED_PENDING_APPROVAL`, clarification |
| **Shortage / Blocked / Conflict** (`rose`) | `#FFF1F2` / `#FECDD3` / `#BE123C` | `rgba(244,63,94,0.15)` / `rgba(244,63,94,0.38)` / `#FB7185` | `UNAVAILABLE` order, zero stock, `STALE_CONFLICT`, `REJECTED` |
| **Draft / Neutral / In-Transit** (`slate`) | `#F1F5F9` / `#CBD5E1` / `#334155` | `rgba(148,163,184,0.14)` / `rgba(148,163,184,0.28)` / `#CBD5E1` | Unsubmitted `DRAFT`, `IN_TRANSIT` transfers, read-only tool trace |
| **Recharts Canvas Tokens** | `--chart-grid`, `--chart-tick`, `--chart-tooltip-bg` | Theme-adapted grid, axis ticks, cursor & tooltip contrast | `LocationStockHealthChart.tsx`, `OrderFeasibilityChart.tsx` |

---

## 4. Typography & Numeric Precision Rules

- **Primary UI Font:** `'Inter'`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `sans-serif`.
- **Monospace / Identifier Font:** `'JetBrains Mono'`, `'Fira Code'`, `monospace` for all:
  - Order numbers (`ORD-2026-1041`)
  - Product SKUs (`NET-CAT6-10M`)
  - Draft & Run codes (`DRF-2026-089`, `RUN-2026-0312`)
  - Tool names (`check_order_feasibility`) and JSON arguments
- **Mandatory `tabular-nums` (`font-variant-numeric: tabular-nums`):**
  - Apply the Tailwind `tabular-nums` utility class on **every** table cell, KPI counter, stock balance, shortage delta, reorder quantity input, version counter, and execution latency figure so digits align vertically in columns.
- **Table Headers:** `text-[11px] font-semibold uppercase tracking-wider text-slate-500`.

---

## 5. Layout & Component Architecture

### 5.1 Application Shell (`src/components/layout/AppShell.tsx`)
- **Collapsible Left Sidebar (`src/components/layout/SidebarNav.tsx`, `w-60` expanded / `w-16` collapsed, sticky):**
  - System title (`AI Operations Agent` + `v2.0 CIS Workbench` subtitle) and collapse/expand toggle (`PanelLeftClose` / `PanelLeftOpen`)
  - Primary navigation items with live counter badges:
    1. `Overview` (Operational KPIs, stock health charts, recent agent runs)
    2. `Orders & Feasibility` (Order queue, cumulative stock allocation analyzer)
    3. `Inventory & Locations` (Multi-warehouse/branch stock matrix, low-stock alerts)
    4. `Stock Transfers` (Inter-branch & warehouse transfer ledger and drafts)
    5. `Approvals & Audit` (Human-in-the-Loop pending draft queue & immutable audit trail)
  - Active RBAC user footer badge (`Tariq Haddad — EMPLOYEE` / `Esraa Al Noaiami — MANAGER`)
- **Top Operational Bar (`src/components/layout/TopOperationalBar.tsx`, `h-14`, sticky):**
  - **Active Location Filter** (`All Locations`, `Amman Main Warehouse`, `Abdali Retail Branch`, `Irbid Distribution Hub`)
  - **Interactive RBAC Role Switcher (`EMPLOYEE` vs. `MANAGER`):**
    - Allows the evaluator/supervisor (Dr. Moataz) to switch live between **Tariq Haddad (`EMPLOYEE`)**—who can run the AI assistant and prepare/edit drafts but whose "Approve & Commit" button is locked with a permission explanation—and **Esraa Al Noaiami (`MANAGER`)**—who holds authorization to execute `submit_approved_change`.
  - **Concurrency / TOCTOU Simulator Button (`Simulate Stock Drift` + Demo Reset):**
    - A one-click testing utility in the header that decrements stock (`-2`) and increments `inventory_balances.version` on a pending draft's SKU so the evaluator can immediately observe the deterministic `409 STALE_CONFLICT` guard in action.
  - **Toggle Operations Assistant Button** (with pending approvals badge).

### 5.2 Overview Dashboard & Lazy-Loaded Visualizations (`src/components/views/OverviewDashboard.tsx`)
- Composed of memoized subcomponents (`KpiGrid.tsx`, `TopShortedSkusCard.tsx`, `RecentAuditFeedCard.tsx`) backed by pure synchronous `deriveOverviewMetrics.ts` (zero `useEffect` derived state).
- `LocationStockHealthChart.tsx` and `OrderFeasibilityChart.tsx` dynamically import `recharts` via `React.lazy()` + `<Suspense>` to isolate bundle weight and re-renders.
- Shared `StatusBadge.tsx` enforces `#ECFDF5`/`#FFFBEB`/`#FFF1F2`/`#F1F5F9`/`#EFF6FF` semantic surfaces with `1px` borders and `tabular-nums`.

### 5.3 Operations Assistant & Verification Side Drawer (`src/components/assistant/OperationsAssistantDrawer.tsx`, `max-w-[520px]`)
Designed as an **Engineering Command & Audit Console** (strictly zero chat-bubble slop):
1. **Preset Scenario Selector + Natural Language Command Input (`ScenarioPresetsBar.tsx`):**
   - Includes 6 one-click evaluation scenario pills matching Section 7 of the Proposal (standard pending orders, Abdali high-priority contention, ambiguous `"thermal paper"`, missing quantity `"Cat6 UTP Patch Cable 5m"`, warehouse transfer option, and TOCTOU `409 STALE_CONFLICT` trigger) plus a structured command form.
2. **Human Clarification Gate (`ClarificationPromptCard.tsx`):**
   - Renders `AMBIGUOUS_MATCH` candidate SKUs with live available stock or missing-quantity default-lot/custom-quantity buttons when `run.status === 'AWAITING_CLARIFICATION'`.
3. **5-Stage Bounded Execution Tracker (`AgentStepTraceList.tsx`, `Step 1/5` to `Step 5/5`):**
   - Progressively reveals each stage (`Interpret Request` $\rightarrow$ `Retrieve Stock Data` $\rightarrow$ `Assess Cumulative Feasibility` $\rightarrow$ `Prepare Staging Draft` $\rightarrow$ `Verify & Report`) with expandable JSON payloads, step latency in `ms`, and verification badges, plus an inline `AssistantFeasibilitySnapshot.tsx` table.
4. **Shared Draft Review & Approval Card (`src/components/common/DraftApprovalCard.tsx`, `DraftItemRow.tsx`, `DraftActionControls.tsx`):**
   - Used identically in both the Side Drawer and `ApprovalsAuditView.tsx`: displays line-item `expected_inventory_version` vs. live version drift badges, inline editable `suggested_reorder_qty`, **"Refresh Snapshot & Re-Verify"** on `409 STALE_CONFLICT`, **`verify_draft`** re-verification, and `MANAGER`-gated **`submit_approved_change`** (`Approve & Commit` / `Reject`).

### 5.4 Approvals & Audit View (`src/components/views/ApprovalsAuditView.tsx`)
- Houses `EvaluationMetricsPanel.tsx` (Proposal Section 7 telemetry), the filterable Pending & Historical Drafts Queue (`DraftApprovalCard`), and `AuditTrailSection.tsx` (immutable `audit_logs` filterable by `AGENT` vs. `USER` actor and entity type, paired with the `agent_runs` step trace viewer).
