# AI Operations Agent — Master Documentation Index (`INDEX.md`)

> 🚨 **MANDATORY AGENT PROTOCOL (READ FIRST):**
> **RULE FOR ALL AGENTS:** Whenever any code, component, schema, or skill is added or modified, you **MUST** update the relevant files inside `documentation/` and update `documentation/INDEX.md` before completing your turn. Never leave the documentation out of sync with the workspace codebase.

---

## 1. Project Identity & Context
- **Project Title:** AI Operations Agent: An AI-Powered Workflow Assistant for Small Business Operations
- **Academic Context:** Graduation Project I Supervision Proposal — The Hashemite University (CIS), submitted by Esraa Mohammad Hasan Al Noaiami to Dr. Moataz
- **Frontend Stack:** React + TypeScript + Vite (Client-Side SPA), Tailwind CSS, Lucide Icons, Recharts
- **Target Backend Architecture:** Java Spring Boot REST API + Agent Orchestration Layer + PostgreSQL + Hosted LLM API with Tool Calling
- **Core Architectural Principle:** The LLM interprets natural-language requests and sequences read/draft tools within a bounded loop (`MAX_STEPS = 5`), while deterministic backend logic enforces inventory truth, cumulative order feasibility, validation (`verify_draft`), and Human-in-the-Loop approval commits (`submit_approved_change`).

---

## 2. Documentation Directory

| Document | Path | Purpose & Contents | Last Updated |
| :--- | :--- | :--- | :--- |
| **Master Index** | [documentation/INDEX.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/INDEX.md) | Master directory, mandatory agent protocol, active phase status, and skill registry | `2026-11-18` |
| **01. Architecture & Schema** | [documentation/01-ARCHITECTURE-AND-SCHEMA.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/01-ARCHITECTURE-AND-SCHEMA.md) | Unified `ERD-v1.dbml` + `v2` domain schema (13 entities), scope boundaries, tool contracts, and cumulative stock feasibility math | `2026-11-18` |
| **02. UI Design System** | [documentation/02-UI-DESIGN-SYSTEM.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/02-UI-DESIGN-SYSTEM.md) | Multi-theme enterprise token system (`daylight`, `paper`, `obsidian`, `nordic`), strict Anti-AI-Slop rules, `tabular-nums`, and layout specs | `2026-11-18` |
| **03. Frontend Roadmap** | [documentation/03-FRONTEND-ROADMAP.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/03-FRONTEND-ROADMAP.md) | Granular 5-phase atomic implementation plan for **Hydrogen** | `2026-11-18` |
| **04. Session Handoff Log** | [documentation/04-SESSION-HANDOFF-LOG.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/04-SESSION-HANDOFF-LOG.md) | Chronological handoff log between planning (**Argon**) and implementation (**Hydrogen**) agents | `2026-11-18` |
| **Reference: ERD v1 Schema** | [documentation/reference/ERD-v1.dbml.txt](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/reference/ERD-v1.dbml.txt) | Baseline multi-location DBML database entity-relationship definition | `2026-11-18` |
| **Reference: Proposal PDF** | [documentation/reference/media_1794591368683_c1fd26a5.pdf](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/documentation/reference/media_1794591368683_c1fd26a5.pdf) | Hashemite University CIS Graduation Project I supervision proposal | `2026-11-18` |

---

## 3. Installed & Customized Workspace Skills

| Skill | Skill File Path | Project-Specific Customization Applied |
| :--- | :--- | :--- |
| `vercel-react-best-practices` | [.agents/skills/vercel-react-best-practices/SKILL.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/.agents/skills/vercel-react-best-practices/SKILL.md) | Overridden for **React + Vite Client-Side SPA** (ignores Next.js App Router, SSR, RSC, `"use client"`). Enforces derived state without `useEffect`, modular TypeScript, and re-render isolation. |
| `react-doctor` | [.agents/skills/react-doctor/SKILL.md](file:///c:/Users/ahmed/Desktop/AI%20OPERATIONS%20AGENT/.agents/skills/react-doctor/SKILL.md) | Configured for mandatory post-phase audits of `src/` targeting re-render isolation between high-density data tables, `Recharts` components, and the live-updating AI Assistant Side Drawer. |

---

## 4. Implementation Roadmap Status

| Phase | Description | Status | Assigned Agent |
| :--- | :--- | :--- | :--- |
| **Phase 0** | Architecture Review, Skill Installation & Documentation Bootstrap | `COMPLETED` | **Argon** |
| **Phase 1** | Project Setup (Vite + React + TS + Tailwind), Unified Types & Realistic Seed Data | `COMPLETED` | **Hydrogen** |
| **Phase 2** | App Shell, RBAC Role Switcher (`EMPLOYEE`/`MANAGER`) & Overview Dashboard KPIs | `COMPLETED` | **Hydrogen** |
| **Phase 3** | Orders Queue & Cumulative Stock Feasibility Analyzer | `COMPLETED` | **Hydrogen** |
| **Phase 4** | Multi-Location Inventory Matrix, Products & Stock Transfers (`ERD-v1.dbml`) | `COMPLETED` | **Hydrogen** |
| **Phase 5** | Operations Assistant Side Drawer, Bounded Agent Loop, Approval Queue & Audit Logs | `COMPLETED` | **Hydrogen** |
